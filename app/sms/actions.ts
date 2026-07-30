'use server'

import prisma from '@/lib/db'
import { revalidatePath } from 'next/cache'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { requirePermission } from '@/lib/rbac'
import {
  sendCampaign,
  previewAudience,
  getBalance,
  syncCampaignDelivery,
  syncAllPendingDeliveries,
} from '@/lib/sms/sms.service'
import { analyzeSmsBody } from '@/lib/sms/segments'
import type { RecipientFilter } from '@/lib/sms/recipients'

// ---------------- Balance ----------------

export interface SmsBalanceResult {
  credits: number | null
  threshold: number | null
  clientName: string | null
  error: string | null
}

export async function getSmsBalance(): Promise<SmsBalanceResult> {
  try {
    await requirePermission('sms', 'read')
    const res = await getBalance()
    if (!res.ok) {
      return {
        credits: null,
        threshold: null,
        clientName: null,
        error: res.error || 'Unable to fetch balance',
      }
    }
    return {
      credits: res.credits ?? null,
      threshold: res.threshold ?? null,
      clientName: res.clientName ?? null,
      error: null,
    }
  } catch (e) {
    return {
      credits: null,
      threshold: null,
      clientName: null,
      error: e instanceof Error ? e.message : 'Failed',
    }
  }
}

// ---------------- Recipient preview ----------------

export async function previewSmsAudience(filter: RecipientFilter) {
  try {
    await requirePermission('sms', 'create')
    const audience = await previewAudience(filter)
    return {
      success: true as const,
      totalRecipients: audience.recipients.length,
      matchedMembers: audience.matchedMembers,
      invalidPhoneCount: audience.invalidPhoneCount,
      duplicateCount: audience.duplicateCount,
      sample: audience.recipients.slice(0, 10).map(r => ({
        memberId: r.memberId,
        fullName: r.fullName,
        phoneNumber: r.phoneNumber,
      })),
    }
  } catch (e) {
    return { success: false as const, error: e instanceof Error ? e.message : 'Failed' }
  }
}

// ---------------- Send ----------------

export async function sendSmsCampaign(input: {
  message: string
  filter: RecipientFilter
  name?: string
}) {
  try {
    await requirePermission('sms', 'create')

    if (!input.message || input.message.trim().length === 0) {
      return { success: false as const, error: 'Message body cannot be empty' }
    }
    if (input.message.length > 1500) {
      return { success: false as const, error: 'Message too long (max 1500 characters)' }
    }

    const session = await getServerSession(authOptions)
    const result = await sendCampaign({
      message: input.message,
      filter: input.filter,
      name: input.name,
      createdById: (session?.user?.id as string | undefined) ?? null,
      createdByName: (session?.user?.name as string | undefined) ?? (session?.user?.email as string | undefined) ?? null,
    })

    revalidatePath('/dashboard/sms')
    revalidatePath('/dashboard/sms/history')

    return { success: true as const, ...result }
  } catch (e) {
    return { success: false as const, error: e instanceof Error ? e.message : 'Failed to send campaign' }
  }
}

// ---------------- History ----------------

export async function getSmsCampaigns(opts?: { take?: number; skip?: number }) {
  try {
    await requirePermission('sms', 'read')
    const take = opts?.take ?? 50
    const skip = opts?.skip ?? 0
    const [campaigns, total] = await Promise.all([
      prisma.smsCampaign.findMany({
        orderBy: { createdAt: 'desc' },
        take,
        skip,
        select: {
          id: true,
          name: true,
          message: true,
          status: true,
          totalRecipients: true,
          sentCount: true,
          deliveredCount: true,
          failedCount: true,
          totalSegments: true,
          createdByName: true,
          createdAt: true,
          completedAt: true,
        },
      }),
      prisma.smsCampaign.count(),
    ])
    return { campaigns, total }
  } catch {
    return { campaigns: [], total: 0 }
  }
}

export async function getSmsCampaignById(id: string) {
  try {
    await requirePermission('sms', 'read')
    const campaign = await prisma.smsCampaign.findUnique({
      where: { id },
      include: {
        messages: {
          select: {
            id: true,
            phoneNumber: true,
            recipientName: true,
            status: true,
            segments: true,
            bongaUniqueId: true,
            errorMessage: true,
            deliveryStatusRaw: true,
            sentAt: true,
            deliveredAt: true,
          },
          orderBy: [{ status: 'asc' }, { phoneNumber: 'asc' }],
        },
      },
    })
    return campaign
  } catch {
    return null
  }
}

export async function refreshCampaignDelivery(id: string) {
  try {
    await requirePermission('sms', 'read')
    const result = await syncCampaignDelivery(id)
    revalidatePath(`/dashboard/sms/history/${id}`)
    revalidatePath('/dashboard/sms/history')
    revalidatePath('/dashboard/sms')
    return { success: true as const, ...result }
  } catch (e) {
    return { success: false as const, error: e instanceof Error ? e.message : 'Failed' }
  }
}

// ---------------- Delivery reports (cross-campaign) ----------------

export interface DeliveryReportFilter {
  status?: 'PENDING' | 'SENT' | 'DELIVERED' | 'FAILED'
  campaignId?: string
  search?: string
  from?: string // ISO date
  to?: string // ISO date
}

export async function getDeliveryReport(filter: DeliveryReportFilter, opts?: { take?: number; skip?: number }) {
  try {
    await requirePermission('sms', 'read')
    const take = Math.min(opts?.take ?? 50, 200)
    const skip = opts?.skip ?? 0

    const where: Record<string, unknown> = {}
    if (filter.status) where.status = filter.status
    if (filter.campaignId) where.campaignId = filter.campaignId
    if (filter.from || filter.to) {
      where.createdAt = {
        ...(filter.from ? { gte: new Date(filter.from) } : {}),
        ...(filter.to ? { lte: new Date(filter.to) } : {}),
      }
    }
    if (filter.search) {
      where.OR = [
        { phoneNumber: { contains: filter.search, mode: 'insensitive' } },
        { recipientName: { contains: filter.search, mode: 'insensitive' } },
      ]
    }

    const [messages, total, statusCounts] = await Promise.all([
      prisma.smsMessage.findMany({
        where,
        select: {
          id: true,
          phoneNumber: true,
          recipientName: true,
          status: true,
          deliveryStatusRaw: true,
          errorMessage: true,
          sentAt: true,
          deliveredAt: true,
          createdAt: true,
          campaign: { select: { id: true, name: true, message: true } },
        },
        orderBy: { createdAt: 'desc' },
        take,
        skip,
      }),
      prisma.smsMessage.count({ where }),
      prisma.smsMessage.groupBy({ by: ['status'], where, _count: { status: true } }),
    ])

    const counts = { PENDING: 0, SENT: 0, DELIVERED: 0, FAILED: 0 }
    for (const row of statusCounts) {
      counts[row.status as keyof typeof counts] = row._count.status
    }

    return { success: true as const, messages, total, counts }
  } catch (e) {
    return { success: false as const, error: e instanceof Error ? e.message : 'Failed to load delivery report' }
  }
}

export async function getDeliveryReportCampaignOptions() {
  try {
    await requirePermission('sms', 'read')
    return await prisma.smsCampaign.findMany({
      select: { id: true, name: true, message: true },
      orderBy: { createdAt: 'desc' },
      take: 200,
    })
  } catch {
    return []
  }
}

export async function syncAllPendingDeliveriesAction(opts?: { limit?: number }) {
  try {
    await requirePermission('sms', 'read')
    const result = await syncAllPendingDeliveries(opts)
    revalidatePath('/dashboard/sms/reports')
    revalidatePath('/dashboard/sms/history')
    revalidatePath('/dashboard/sms')
    return { success: true as const, ...result }
  } catch (e) {
    return { success: false as const, error: e instanceof Error ? e.message : 'Failed to sync deliveries' }
  }
}

/**
 * Small, fast, fire-and-forget style sync used by SmsNav's background
 * trigger (throttled client-side) so delivery statuses drift toward
 * accurate while anyone is actively using the SMS module — without
 * depending solely on the once-a-day cron (Vercel Hobby plan only allows
 * daily cron schedules).
 */
export async function triggerBackgroundDeliverySync() {
  try {
    await requirePermission('sms', 'read')
    const result = await syncAllPendingDeliveries({ limit: 50 })
    if (result.updated > 0) {
      revalidatePath('/dashboard/sms/reports')
      revalidatePath('/dashboard/sms/history')
      revalidatePath('/dashboard/sms')
    }
    return { success: true as const, ...result }
  } catch {
    return { success: false as const }
  }
}

// ---------------- Dashboard stats ----------------

export async function getSmsDashboardStats() {
  try {
    await requirePermission('sms', 'read')

    const [byStatus, campaignCount, recent] = await Promise.all([
      prisma.smsMessage.groupBy({
        by: ['status'],
        _count: { status: true },
      }),
      prisma.smsCampaign.count(),
      prisma.smsCampaign.findMany({
        orderBy: { createdAt: 'desc' },
        take: 5,
        select: {
          id: true,
          name: true,
          message: true,
          status: true,
          totalRecipients: true,
          sentCount: true,
          deliveredCount: true,
          failedCount: true,
          createdByName: true,
          createdAt: true,
        },
      }),
    ])

    const counts = { PENDING: 0, SENT: 0, DELIVERED: 0, FAILED: 0 }
    for (const row of byStatus) {
      counts[row.status as keyof typeof counts] = row._count.status
    }

    // 7-day daily volume
    const since = new Date()
    since.setDate(since.getDate() - 7)
    const recentMessages = await prisma.smsMessage.findMany({
      where: { createdAt: { gte: since } },
      select: { createdAt: true, status: true },
    })
    const dayMap = new Map<string, { sent: number; failed: number }>()
    for (const m of recentMessages) {
      const day = m.createdAt.toISOString().slice(0, 10)
      const entry = dayMap.get(day) ?? { sent: 0, failed: 0 }
      if (m.status === 'FAILED') entry.failed++
      else entry.sent++
      dayMap.set(day, entry)
    }
    const trend = Array.from(dayMap.entries())
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([date, v]) => ({ date, ...v }))

    return {
      totalCampaigns: campaignCount,
      totalSent: counts.SENT + counts.DELIVERED,
      totalDelivered: counts.DELIVERED,
      totalFailed: counts.FAILED,
      totalPending: counts.PENDING,
      trend,
      recent,
    }
  } catch {
    return {
      totalCampaigns: 0,
      totalSent: 0,
      totalDelivered: 0,
      totalFailed: 0,
      totalPending: 0,
      trend: [] as { date: string; sent: number; failed: number }[],
      recent: [] as Array<{ id: string; name: string | null; message: string; status: string; totalRecipients: number; sentCount: number; deliveredCount: number; failedCount: number; createdByName: string | null; createdAt: Date }>,
    }
  }
}

// ---------------- Templates ----------------

export async function getSmsTemplates() {
  try {
    await requirePermission('sms', 'read')
    return await prisma.smsTemplate.findMany({ orderBy: [{ category: 'asc' }, { name: 'asc' }] })
  } catch {
    return []
  }
}

export async function createSmsTemplate(data: { name: string; body: string; category?: string }) {
  try {
    await requirePermission('sms', 'manage')
    if (!data.name?.trim()) return { error: 'Template name is required' }
    if (!data.body?.trim()) return { error: 'Template body is required' }

    const existing = await prisma.smsTemplate.findUnique({ where: { name: data.name.trim() } })
    if (existing) return { error: 'A template with this name already exists' }

    const seg = analyzeSmsBody(data.body)
    if (seg.segments > 5) return { error: 'Template is too long (more than 5 SMS segments)' }

    const session = await getServerSession(authOptions)
    await prisma.smsTemplate.create({
      data: {
        name: data.name.trim(),
        body: data.body,
        category: data.category?.trim() || null,
        createdById: (session?.user?.id as string | undefined) ?? null,
      },
    })
    revalidatePath('/dashboard/sms/templates')
    return { success: true }
  } catch (e) {
    return { error: e instanceof Error ? e.message : 'Failed to create template' }
  }
}

export async function updateSmsTemplate(id: string, data: { name?: string; body?: string; category?: string | null }) {
  try {
    await requirePermission('sms', 'manage')
    await prisma.smsTemplate.update({
      where: { id },
      data: {
        name: data.name?.trim(),
        body: data.body,
        category: data.category === undefined ? undefined : data.category?.trim() || null,
      },
    })
    revalidatePath('/dashboard/sms/templates')
    return { success: true }
  } catch (e) {
    return { error: e instanceof Error ? e.message : 'Failed to update template' }
  }
}

export async function deleteSmsTemplate(id: string) {
  try {
    await requirePermission('sms', 'manage')
    await prisma.smsTemplate.delete({ where: { id } })
    revalidatePath('/dashboard/sms/templates')
    return { success: true }
  } catch (e) {
    return { error: e instanceof Error ? e.message : 'Failed to delete template' }
  }
}

// ---------------- Reference data for composer ----------------

export async function getSmsComposerOptions() {
  try {
    await requirePermission('sms', 'create')
    const [departments, fellowships, memberCount] = await Promise.all([
      prisma.department.findMany({
        select: { id: true, name: true, _count: { select: { members: true } } },
        orderBy: { name: 'asc' },
      }),
      prisma.homeFellowship.findMany({
        select: { id: true, name: true, _count: { select: { members: true } } },
        orderBy: { name: 'asc' },
      }),
      prisma.member.count(),
    ])
    return { departments, fellowships, memberCount }
  } catch {
    return { departments: [], fellowships: [], memberCount: 0 }
  }
}
