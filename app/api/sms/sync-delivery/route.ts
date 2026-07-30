import { NextRequest, NextResponse } from 'next/server'
import { syncAllPendingDeliveries } from '@/lib/sms/sms.service'

export const runtime = 'nodejs'
export const maxDuration = 60

/**
 * Scheduled delivery-report reconciliation (see vercel.json `crons`).
 *
 * Vercel signs cron-triggered requests with `Authorization: Bearer $CRON_SECRET`
 * when that env var is set — reject anything else so this endpoint can't be
 * used by a third party to burn through Bonga API calls / DB writes.
 *
 * This is a safety net, not the primary sync path: Vercel's Hobby plan only
 * allows a daily cron schedule, so day-to-day freshness comes from the
 * throttled client-side trigger (see triggerBackgroundDeliverySync) and the
 * manual "Sync Delivery" / "Sync all pending" buttons.
 */
export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET
  if (!secret) {
    return NextResponse.json({ error: 'CRON_SECRET is not configured' }, { status: 500 })
  }
  const authHeader = req.headers.get('authorization')
  if (authHeader !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const result = await syncAllPendingDeliveries({ limit: 1000 })
  return NextResponse.json(result)
}
