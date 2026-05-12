/**
 * Phone number utilities for Kenyan SMS delivery.
 *
 * Bonga expects MSISDN in 254XXXXXXXXX form (no leading +, 12 digits total).
 * Inputs from our DB are typically:
 *   "0712345678"  (local)
 *   "0112345678"  (local Safaricom new range)
 *   "254712345678" (already normalized)
 *   "+254712345678" (E.164)
 *
 * Invalid numbers (too short, non-numeric after stripping) return null.
 */

export function normalizeKenyanPhone(raw: string | null | undefined): string | null {
  if (!raw) return null
  // Strip everything except digits
  const digits = String(raw).replace(/\D/g, '')
  if (!digits) return null

  // Already in 254 form
  if (digits.startsWith('254') && digits.length === 12) return digits

  // Leading 0 local form
  if (digits.startsWith('0') && digits.length === 10) {
    return '254' + digits.slice(1)
  }

  // Bare 9-digit (no leading 0)
  if (digits.length === 9 && (digits.startsWith('7') || digits.startsWith('1'))) {
    return '254' + digits
  }

  return null
}

export function isValidKenyanMobile(normalized: string | null): boolean {
  if (!normalized) return false
  // 254 7XX or 254 1XX, length 12
  return /^254[71]\d{8}$/.test(normalized)
}

/**
 * De-duplicate phone numbers, preserving first occurrence's metadata.
 */
export function dedupeByPhone<T extends { phoneNumber: string }>(items: T[]): T[] {
  const seen = new Set<string>()
  const out: T[] = []
  for (const item of items) {
    if (seen.has(item.phoneNumber)) continue
    seen.add(item.phoneNumber)
    out.push(item)
  }
  return out
}
