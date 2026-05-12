/**
 * Bonga SMS API client.
 *
 * Docs reference: https://documenter.getpostman.com/view/9210981/SVtVUv8M
 *
 * The Bonga API uses three auth fields on every request:
 *   apiClientID, key, secret
 *
 * Endpoints used:
 *   1) POST  http://167.172.14.50:4002/v1/send-sms        — single message
 *   2) GET   https://app.bongasms.co.ke/api/check-credits — current balance
 *   3) GET   https://app.bongasms.co.ke/api/fetch-delivery — delivery report
 *
 * The send-sms IP is intentionally the raw IP per Bonga support guidance; the
 * production hostname behind it is internal. Keep both base URLs configurable
 * in case Bonga rotates them.
 */

const SEND_URL = process.env.BONGA_SMS_SEND_URL || 'http://167.172.14.50:4002/v1/send-sms'
const CREDITS_URL = process.env.BONGA_SMS_CREDITS_URL || 'https://app.bongasms.co.ke/api/check-credits'
const DELIVERY_URL = process.env.BONGA_SMS_DELIVERY_URL || 'https://app.bongasms.co.ke/api/fetch-delivery'

function getCreds() {
  const clientId = process.env.BONGA_SMS_CLIENT_ID
  const key = process.env.BONGA_SMS_API_KEY
  const secret = process.env.BONGA_SMS_API_SECRET
  const serviceId = process.env.BONGA_SMS_SERVICE_ID
  if (!clientId || !key || !secret) {
    throw new Error('Bonga SMS credentials missing. Set BONGA_SMS_CLIENT_ID, BONGA_SMS_API_KEY, BONGA_SMS_API_SECRET.')
  }
  return {
    apiClientID: Number(clientId),
    key,
    secret,
    serviceID: serviceId ? Number(serviceId) : undefined,
  }
}

export interface BongaSendResult {
  ok: boolean
  uniqueId?: string
  statusCode?: number
  description?: string
  raw: unknown
}

/**
 * Send a single SMS via Bonga. Returns a normalized result with an `ok` flag.
 *
 * Bonga's success status code is 222 ("Sent Successfully"). We treat anything
 * else as a failure (errorMessage populated from `Description` field).
 */
export async function sendSms(opts: { to: string; message: string }): Promise<BongaSendResult> {
  const creds = getCreds()
  const body = {
    apiClientID: creds.apiClientID,
    key: creds.key,
    secret: creds.secret,
    txtMessage: opts.message,
    MSISDN: opts.to,
    ...(creds.serviceID ? { serviceID: creds.serviceID } : {}),
  }

  let res: Response
  try {
    res = await fetch(SEND_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      // Bonga's send endpoint is on a raw IP without HTTPS — short timeout.
      signal: AbortSignal.timeout(15_000),
    })
  } catch (err) {
    return {
      ok: false,
      description: err instanceof Error ? err.message : 'network error',
      raw: { error: String(err) },
    }
  }

  let json: unknown
  try {
    json = await res.json()
  } catch {
    return { ok: false, description: `HTTP ${res.status} non-JSON response`, raw: null }
  }

  const obj = (json && typeof json === 'object' ? (json as Record<string, unknown>) : {}) as Record<string, unknown>
  const statusCode = typeof obj.status === 'number' ? obj.status : undefined
  const uniqueId =
    typeof obj.unique_id === 'string'
      ? obj.unique_id
      : typeof obj.uniqueId === 'string'
        ? obj.uniqueId
        : undefined
  const description =
    typeof obj.Description === 'string'
      ? obj.Description
      : typeof obj.description === 'string'
        ? obj.description
        : typeof obj.message === 'string'
          ? (obj.message as string)
          : undefined

  const ok = res.ok && statusCode === 222

  return { ok, uniqueId, statusCode, description, raw: json }
}

export interface BongaCreditsResult {
  ok: boolean
  credits?: number
  threshold?: number
  clientName?: string
  emailCredits?: number
  utilityCredits?: number
  raw: unknown
  error?: string
}

export async function checkCredits(): Promise<BongaCreditsResult> {
  const creds = getCreds()
  const params = new URLSearchParams({
    apiClientID: String(creds.apiClientID),
    key: creds.key,
    secret: creds.secret,
  })
  let res: Response
  try {
    res = await fetch(`${CREDITS_URL}?${params.toString()}`, {
      method: 'GET',
      signal: AbortSignal.timeout(10_000),
    })
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : 'network error', raw: null }
  }
  let json: unknown
  try {
    json = await res.json()
  } catch {
    return { ok: false, error: `HTTP ${res.status} non-JSON`, raw: null }
  }
  const obj = (json && typeof json === 'object' ? (json as Record<string, unknown>) : {}) as Record<string, unknown>

  // Bonga returns { status: 222, sms_credits, sms_threshold, client_name, ... }
  // Keep fallbacks for older/alternate field names.
  const rawCredits =
    obj.sms_credits ?? obj.smsCredits ?? obj.credits ?? obj.credit ?? obj.balance
  const credits =
    typeof rawCredits === 'number'
      ? rawCredits
      : typeof rawCredits === 'string'
        ? Number(rawCredits)
        : NaN

  if (!Number.isFinite(credits)) {
    return {
      ok: false,
      error: typeof obj.status_message === 'string' ? obj.status_message : 'Could not parse credits from response',
      raw: json,
    }
  }

  const threshold =
    typeof obj.sms_threshold === 'number'
      ? obj.sms_threshold
      : typeof obj.sms_threshold === 'string'
        ? Number(obj.sms_threshold)
        : undefined
  const emailCredits =
    typeof obj.email_credits === 'number' ? obj.email_credits : undefined
  const utilityCredits =
    typeof obj.utility_credits === 'number' ? obj.utility_credits : undefined
  const clientName = typeof obj.client_name === 'string' ? obj.client_name : undefined

  return {
    ok: true,
    credits,
    threshold,
    clientName,
    emailCredits,
    utilityCredits,
    raw: json,
  }
}

export interface BongaDeliveryStatus {
  uniqueId: string
  status: string // raw status text from Bonga (DELIVERED, PENDING, FAILED, EXPIRED, etc.)
  deliveredAt?: string
}

export interface BongaDeliveryResult {
  ok: boolean
  reports: BongaDeliveryStatus[]
  raw: unknown
  error?: string
}

export async function fetchDelivery(uniqueId: string): Promise<BongaDeliveryResult> {
  const creds = getCreds()
  const params = new URLSearchParams({
    apiClientID: String(creds.apiClientID),
    key: creds.key,
    secret: creds.secret,
    unique_id: uniqueId,
  })
  let res: Response
  try {
    res = await fetch(`${DELIVERY_URL}?${params.toString()}`, {
      method: 'GET',
      signal: AbortSignal.timeout(10_000),
    })
  } catch (err) {
    return { ok: false, reports: [], error: err instanceof Error ? err.message : 'network error', raw: null }
  }
  let json: unknown
  try {
    json = await res.json()
  } catch {
    return { ok: false, reports: [], error: `HTTP ${res.status} non-JSON`, raw: null }
  }
  const obj = (json && typeof json === 'object' ? (json as Record<string, unknown>) : {}) as Record<string, unknown>

  // Response can be a single report object or an array under `reports` / `data`.
  const raw = (Array.isArray(obj.reports) ? obj.reports : Array.isArray(obj.data) ? obj.data : [obj]) as Record<string, unknown>[]

  const reports: BongaDeliveryStatus[] = raw
    .map(r => {
      const id = typeof r.unique_id === 'string' ? r.unique_id : typeof r.uniqueId === 'string' ? r.uniqueId : uniqueId
      const status = typeof r.status === 'string' ? r.status : typeof r.delivery_status === 'string' ? r.delivery_status : ''
      const deliveredAt =
        typeof r.delivered_at === 'string'
          ? r.delivered_at
          : typeof r.deliveredAt === 'string'
            ? r.deliveredAt
            : undefined
      return { uniqueId: id, status, deliveredAt }
    })
    .filter(r => r.status.length > 0)

  return { ok: true, reports, raw: json }
}
