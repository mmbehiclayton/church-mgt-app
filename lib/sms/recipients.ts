/**
 * Recipient resolution for SMS campaigns.
 *
 * Audiences are NOT a new entity — they're combinations of the existing
 * Member graph: departments, home fellowships, and gender. Specific
 * audience presets ("Men Fellowship", "Choir", "Pastors") map onto those
 * filters via name conventions.
 *
 * Resolution is permissive: any of `memberIds`, `departmentIds`,
 * `fellowshipIds`, `genders`, `allMembers` will widen the set.
 */

import prisma from '@/lib/db'
import { normalizeKenyanPhone, isValidKenyanMobile } from './phone'

export interface RecipientFilter {
  allMembers?: boolean
  memberIds?: string[]
  departmentIds?: string[]
  fellowshipIds?: string[]
  genders?: string[] // ["MALE"] / ["FEMALE"] / ["MALE","FEMALE"]
  /** Additional ad-hoc phone numbers (no member backing) */
  extraPhones?: string[]
}

export interface ResolvedRecipient {
  memberId: string | null
  fullName: string | null
  phoneNumber: string // normalized 254XXXXXXXXX
}

export interface ResolvedAudience {
  recipients: ResolvedRecipient[]
  /** Total matched before phone normalization/dedupe */
  matchedMembers: number
  /** Members whose phone is missing or invalid (excluded from recipients) */
  invalidPhoneCount: number
  /** Number of duplicate phone numbers collapsed */
  duplicateCount: number
}

export async function resolveRecipients(filter: RecipientFilter): Promise<ResolvedAudience> {
  const OR: Record<string, unknown>[] = []

  if (filter.allMembers) {
    // Match-all
    OR.push({})
  } else {
    if (filter.memberIds && filter.memberIds.length > 0) {
      OR.push({ id: { in: filter.memberIds } })
    }
    if (filter.departmentIds && filter.departmentIds.length > 0) {
      OR.push({ departments: { some: { departmentId: { in: filter.departmentIds } } } })
    }
    if (filter.fellowshipIds && filter.fellowshipIds.length > 0) {
      OR.push({ homeFellowshipId: { in: filter.fellowshipIds } })
    }
    if (filter.genders && filter.genders.length > 0) {
      OR.push({ gender: { in: filter.genders, mode: 'insensitive' } })
    }
  }

  let members: { id: string; fullName: string; phoneNumber: string }[] = []
  if (OR.length === 1 && filter.allMembers) {
    members = await prisma.member.findMany({
      select: { id: true, fullName: true, phoneNumber: true },
      orderBy: { fullName: 'asc' },
    })
  } else if (OR.length > 0) {
    members = await prisma.member.findMany({
      where: { OR },
      select: { id: true, fullName: true, phoneNumber: true },
      orderBy: { fullName: 'asc' },
    })
  }

  const matchedMembers = members.length
  const seenPhones = new Set<string>()
  const recipients: ResolvedRecipient[] = []
  let invalidPhoneCount = 0
  let duplicateCount = 0

  for (const m of members) {
    const phone = normalizeKenyanPhone(m.phoneNumber)
    if (!isValidKenyanMobile(phone)) {
      invalidPhoneCount++
      continue
    }
    if (seenPhones.has(phone!)) {
      duplicateCount++
      continue
    }
    seenPhones.add(phone!)
    recipients.push({ memberId: m.id, fullName: m.fullName, phoneNumber: phone! })
  }

  // Extra phones (no member backing)
  if (filter.extraPhones && filter.extraPhones.length > 0) {
    for (const raw of filter.extraPhones) {
      const phone = normalizeKenyanPhone(raw)
      if (!isValidKenyanMobile(phone)) {
        invalidPhoneCount++
        continue
      }
      if (seenPhones.has(phone!)) {
        duplicateCount++
        continue
      }
      seenPhones.add(phone!)
      recipients.push({ memberId: null, fullName: null, phoneNumber: phone! })
    }
  }

  return { recipients, matchedMembers, invalidPhoneCount, duplicateCount }
}

/**
 * Substitute placeholders in a message template.
 * Supported: {name}, {phone}, {fellowship}, {department}
 * (Limited to data we can resolve cheaply per-recipient.)
 */
export function applyPlaceholders(
  template: string,
  ctx: { name?: string | null; phone?: string; fellowship?: string | null; department?: string | null }
): string {
  return template
    .replace(/\{name\}/gi, ctx.name ?? '')
    .replace(/\{phone\}/gi, ctx.phone ?? '')
    .replace(/\{fellowship\}/gi, ctx.fellowship ?? '')
    .replace(/\{department\}/gi, ctx.department ?? '')
}
