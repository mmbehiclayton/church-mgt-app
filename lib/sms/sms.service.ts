import prisma from '@/lib/db'
import { sendSms, checkCredits, fetchDelivery } from './bonga'
import { resolveRecipients, applyPlaceholders, type RecipientFilter, type ResolvedAudience } from './recipients'
import { analyzeSmsBody } from './segments'

const BATCH_SIZE = 25 // concurrent sends per batch — keep low to avoid Bonga rate-limiting

export interface CreateCampaignInput {
  message: string
  filter: RecipientFilter
  name?: string
  createdById?: string | null
  createdByName?: string | null
  /** When true, persists campaign + messages but does NOT call Bonga. */
  dryRun?: boolean
}

export interface CampaignResult {
  campaignId: string
  totalRecipients: number
  sentCount: number
  failedCount: number
  matchedMembers: number
  invalidPhoneCount: number
  duplicateCount: number
}

/**
 * Preview the audience without persisting anything.
 */
export async function previewAudience(filter: RecipientFilter): Promise<ResolvedAudience> {
  return resolveRecipients(filter)
}

/**
 * Create a campaign, persist messages, and dispatch them through Bonga in batches.
 *
 * Strategy: persist all messages as PENDING first so we have a durable record
 * even if the process dies mid-send. Then iterate batches, mark each SENT/FAILED
 * with the Bonga response, and update campaign aggregates at the end.
 */
export async function sendCampaign(input: CreateCampaignInput): Promise<CampaignResult> {
  const audience = await resolveRecipients(input.filter)
  if (audience.recipients.length === 0) {
    throw new Error('No valid recipients matched the selected filters')
  }

  const segInfo = analyzeSmsBody(input.message)

  const campaign = await prisma.smsCampaign.create({
    data: {
      name: input.name ?? null,
      message: input.message,
      status: input.dryRun ? 'DRAFT' : 'SENDING',
      totalRecipients: audience.recipients.length,
      totalSegments: segInfo.segments * audience.recipients.length,
      audienceSnapshot: input.filter as unknown as object,
      createdById: input.createdById ?? null,
      createdByName: input.createdByName ?? null,
      startedAt: input.dryRun ? null : new Date(),
    },
  })

  // Persist a SmsMessage row per recipient up-front (PENDING).
  // We chunk the createMany to stay well below Postgres parameter limits.
  const messageRows = audience.recipients.map(r => ({
    campaignId: campaign.id,
    memberId: r.memberId,
    recipientName: r.fullName,
    phoneNumber: r.phoneNumber,
    message: applyPlaceholders(input.message, { name: r.fullName, phone: r.phoneNumber }),
    segments: analyzeSmsBody(applyPlaceholders(input.message, { name: r.fullName, phone: r.phoneNumber })).segments,
    status: 'PENDING' as const,
  }))

  // Chunked insert
  for (let i = 0; i < messageRows.length; i += 500) {
    await prisma.smsMessage.createMany({ data: messageRows.slice(i, i + 500) })
  }

  if (input.dryRun) {
    return {
      campaignId: campaign.id,
      totalRecipients: audience.recipients.length,
      sentCount: 0,
      failedCount: 0,
      matchedMembers: audience.matchedMembers,
      invalidPhoneCount: audience.invalidPhoneCount,
      duplicateCount: audience.duplicateCount,
    }
  }

  // Re-fetch with IDs so we can update each one.
  const pending = await prisma.smsMessage.findMany({
    where: { campaignId: campaign.id, status: 'PENDING' },
    select: { id: true, phoneNumber: true, message: true },
  })

  let sentCount = 0
  let failedCount = 0

  for (let i = 0; i < pending.length; i += BATCH_SIZE) {
    const batch = pending.slice(i, i + BATCH_SIZE)
    const results = await Promise.all(
      batch.map(async msg => {
        const res = await sendSms({ to: msg.phoneNumber, message: msg.message })
        return { id: msg.id, res }
      })
    )

    for (const { id, res } of results) {
      if (res.ok) {
        sentCount++
        await prisma.smsMessage.update({
          where: { id },
          data: {
            status: 'SENT',
            bongaUniqueId: res.uniqueId ?? null,
            bongaStatusCode: res.statusCode ?? null,
            sentAt: new Date(),
          },
        })
      } else {
        failedCount++
        await prisma.smsMessage.update({
          where: { id },
          data: {
            status: 'FAILED',
            bongaStatusCode: res.statusCode ?? null,
            errorMessage: res.description ?? 'Bonga reported failure',
          },
        })
      }
    }
  }

  const finalStatus = failedCount === 0 ? 'SENT' : sentCount === 0 ? 'FAILED' : 'PARTIAL'

  await prisma.smsCampaign.update({
    where: { id: campaign.id },
    data: {
      status: finalStatus,
      sentCount,
      failedCount,
      completedAt: new Date(),
    },
  })

  return {
    campaignId: campaign.id,
    totalRecipients: audience.recipients.length,
    sentCount,
    failedCount,
    matchedMembers: audience.matchedMembers,
    invalidPhoneCount: audience.invalidPhoneCount,
    duplicateCount: audience.duplicateCount,
  }
}

export async function getBalance() {
  return checkCredits()
}

// ---------------- Delivery sync ----------------

const DELIVERY_BATCH_SIZE = 20 // concurrent fetch-delivery calls per round — keeps one poll fast enough to fit a serverless timeout
const DEFAULT_SYNC_LIMIT = 300 // messages processed per call — bounds worst-case duration; callers get back `remaining` to know if more is left

/**
 * Classify a raw Bonga DLR status string into our tri-state model.
 *
 * Failure-ish keywords are checked BEFORE the generic "DELIV" check on purpose:
 * "UNDELIVERED" contains "DELIV" as a substring, so checking DELIV first (as
 * the previous implementation did) silently misclassified undelivered
 * messages as successfully delivered.
 *
 * Returns null for anything unrecognized (e.g. still in transit) — callers
 * keep the message at SENT but stash the raw text so it isn't lost.
 */
function classifyDeliveryStatus(rawStatus: string): 'DELIVERED' | 'FAILED' | null {
  const status = rawStatus.toUpperCase()
  if (
    status.includes('UNDELIV') ||
    status.includes('FAIL') ||
    status.includes('EXPIR') ||
    status.includes('REJECT') ||
    status.includes('INVALID') ||
    status.includes('BLACKLIST') ||
    status.includes('DND')
  ) {
    return 'FAILED'
  }
  if (status.includes('DELIV')) {
    return 'DELIVERED'
  }
  return null
}

interface DeliverySyncRow {
  id: string
  campaignId: string | null
  bongaUniqueId: string
}

/**
 * Poll Bonga's fetch-delivery endpoint for a set of messages, in bounded
 * concurrent batches (rather than one-at-a-time), and persist whatever comes
 * back — including the raw carrier text when we can't classify it.
 */
async function syncMessagesDelivery(rows: DeliverySyncRow[]): Promise<{ updated: number; campaignIds: string[] }> {
  let updated = 0
  const campaignIds = new Set<string>()

  for (let i = 0; i < rows.length; i += DELIVERY_BATCH_SIZE) {
    const batch = rows.slice(i, i + DELIVERY_BATCH_SIZE)
    const results = await Promise.all(
      batch.map(async row => ({ row, res: await fetchDelivery(row.bongaUniqueId) }))
    )

    await Promise.all(
      results.map(async ({ row, res }) => {
        if (!res.ok || res.reports.length === 0) return
        const report = res.reports[0]
        const classification = classifyDeliveryStatus(report.status)

        if (classification === 'DELIVERED') {
          await prisma.smsMessage.update({
            where: { id: row.id },
            data: {
              status: 'DELIVERED',
              deliveryStatusRaw: report.status,
              deliveredAt: report.deliveredAt ? new Date(report.deliveredAt) : new Date(),
            },
          })
        } else if (classification === 'FAILED') {
          await prisma.smsMessage.update({
            where: { id: row.id },
            data: { status: 'FAILED', deliveryStatusRaw: report.status, errorMessage: report.status },
          })
        } else {
          await prisma.smsMessage.update({
            where: { id: row.id },
            data: { deliveryStatusRaw: report.status },
          })
          return // not a status change — don't count it or touch campaign aggregates
        }
        updated++
        if (row.campaignId) campaignIds.add(row.campaignId)
      })
    )
  }

  return { updated, campaignIds: Array.from(campaignIds) }
}

async function refreshCampaignAggregates(campaignIds: string[]): Promise<void> {
  await Promise.all(
    campaignIds.map(async campaignId => {
      const agg = await prisma.smsMessage.groupBy({
        by: ['status'],
        where: { campaignId },
        _count: { status: true },
      })
      const delivered = agg.find(a => a.status === 'DELIVERED')?._count.status ?? 0
      const failed = agg.find(a => a.status === 'FAILED')?._count.status ?? 0
      await prisma.smsCampaign.update({
        where: { id: campaignId },
        data: { deliveredCount: delivered, failedCount: failed },
      })
    })
  )
}

export interface DeliverySyncResult {
  updated: number
  processed: number
  remaining: number
}

/**
 * Sync delivery status for one campaign by polling Bonga for each SENT
 * message that has a uniqueId. Bounded by `limit` (default 300) so a large
 * campaign can't run past a serverless function's time budget — call again
 * (the UI does, via the `remaining` count) to keep draining the backlog.
 */
export async function syncCampaignDelivery(campaignId: string, opts?: { limit?: number }): Promise<DeliverySyncResult> {
  const limit = opts?.limit ?? DEFAULT_SYNC_LIMIT
  const where = { campaignId, status: 'SENT' as const, bongaUniqueId: { not: null } }

  const total = await prisma.smsMessage.count({ where })
  const messages = await prisma.smsMessage.findMany({
    where,
    select: { id: true, campaignId: true, bongaUniqueId: true },
    orderBy: { createdAt: 'asc' },
    take: limit,
  })
  const rows = messages.filter((m): m is DeliverySyncRow => !!m.bongaUniqueId)

  const { updated, campaignIds } = await syncMessagesDelivery(rows)
  if (campaignIds.length > 0) await refreshCampaignAggregates(campaignIds)

  return { updated, processed: rows.length, remaining: Math.max(0, total - rows.length) }
}

/**
 * Sync delivery status across ALL campaigns with outstanding SENT messages.
 * Used by the scheduled cron and the "Sync all pending" action on the
 * Delivery Reports page — the per-campaign button above is for a human
 * looking at one campaign; this is for reconciling everything at once
 * without anyone needing to open each campaign individually.
 *
 * Scoped to messages sent within `maxAgeDays` (default 14) since a carrier
 * report that never arrived after two weeks is not going to arrive.
 */
export async function syncAllPendingDeliveries(opts?: { limit?: number; maxAgeDays?: number }): Promise<DeliverySyncResult> {
  const limit = opts?.limit ?? DEFAULT_SYNC_LIMIT
  const maxAgeDays = opts?.maxAgeDays ?? 14
  const since = new Date()
  since.setDate(since.getDate() - maxAgeDays)

  const where = { status: 'SENT' as const, bongaUniqueId: { not: null }, createdAt: { gte: since } }

  const total = await prisma.smsMessage.count({ where })
  const messages = await prisma.smsMessage.findMany({
    where,
    select: { id: true, campaignId: true, bongaUniqueId: true },
    orderBy: { createdAt: 'asc' },
    take: limit,
  })
  const rows = messages.filter((m): m is DeliverySyncRow => !!m.bongaUniqueId)

  const { updated, campaignIds } = await syncMessagesDelivery(rows)
  if (campaignIds.length > 0) await refreshCampaignAggregates(campaignIds)

  return { updated, processed: rows.length, remaining: Math.max(0, total - rows.length) }
}
