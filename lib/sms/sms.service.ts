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

/**
 * Sync delivery status for a campaign by polling Bonga for each SENT message
 * that has a uniqueId. Updates rows to DELIVERED / FAILED accordingly.
 */
export async function syncCampaignDelivery(campaignId: string): Promise<{ updated: number }> {
  const messages = await prisma.smsMessage.findMany({
    where: {
      campaignId,
      status: 'SENT',
      bongaUniqueId: { not: null },
    },
    select: { id: true, bongaUniqueId: true },
  })

  let updated = 0
  for (const m of messages) {
    if (!m.bongaUniqueId) continue
    const res = await fetchDelivery(m.bongaUniqueId)
    if (!res.ok || res.reports.length === 0) continue
    const status = res.reports[0].status.toUpperCase()
    if (status.includes('DELIV')) {
      await prisma.smsMessage.update({
        where: { id: m.id },
        data: {
          status: 'DELIVERED',
          deliveredAt: res.reports[0].deliveredAt ? new Date(res.reports[0].deliveredAt) : new Date(),
        },
      })
      updated++
    } else if (status.includes('FAIL') || status.includes('EXPIR') || status.includes('REJECT')) {
      await prisma.smsMessage.update({
        where: { id: m.id },
        data: { status: 'FAILED', errorMessage: res.reports[0].status },
      })
      updated++
    }
  }

  if (updated > 0) {
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
  }

  return { updated }
}
