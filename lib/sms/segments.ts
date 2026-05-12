/**
 * SMS segment calculation.
 *
 * GSM-7 alphabet: single SMS = 160 chars, multi-part = 153 chars/segment
 * Unicode (UCS-2):  single SMS = 70 chars, multi-part = 67 chars/segment
 *
 * Reference: 3GPP TS 23.038 — we use a conservative GSM-7 character set check.
 */

// Standard GSM 03.38 charset + extensions
const GSM7_CHARS = new Set(
  (
    '@£$¥èéùìòÇ\nØø\rÅåΔ_ΦΓΛΩΠΨΣΘΞÆæßÉ !"#¤%&\'()*+,-./0123456789:;<=>?¡' +
    'ABCDEFGHIJKLMNOPQRSTUVWXYZÄÖÑÜ§¿abcdefghijklmnopqrstuvwxyzäöñüà'
  ).split('')
)
// GSM 03.38 escape chars (each takes 2 GSM-7 chars)
const GSM7_EXT = new Set('^{}\\[~]|€'.split(''))

export type SmsEncoding = 'GSM7' | 'UCS2'

export interface SegmentInfo {
  encoding: SmsEncoding
  length: number          // logical character count (GSM-7 ext chars count as 2)
  segments: number
  perSegment: number      // chars per segment for this encoding
  remaining: number       // chars left in current segment
}

export function analyzeSmsBody(body: string): SegmentInfo {
  let encoding: SmsEncoding = 'GSM7'
  let length = 0

  for (const ch of body) {
    if (GSM7_CHARS.has(ch)) {
      length += 1
    } else if (GSM7_EXT.has(ch)) {
      length += 2
    } else {
      encoding = 'UCS2'
      break
    }
  }

  if (encoding === 'UCS2') {
    // Use code unit count for UCS-2 (BMP chars = 1 unit; surrogate pairs = 2 units)
    length = 0
    for (let i = 0; i < body.length; i++) length++ // body.length is already UTF-16 code units
    length = body.length
  }

  const singleMax = encoding === 'GSM7' ? 160 : 70
  const multiMax = encoding === 'GSM7' ? 153 : 67

  if (length === 0) {
    return { encoding, length: 0, segments: 0, perSegment: singleMax, remaining: singleMax }
  }
  if (length <= singleMax) {
    return {
      encoding,
      length,
      segments: 1,
      perSegment: singleMax,
      remaining: singleMax - length,
    }
  }
  const segments = Math.ceil(length / multiMax)
  return {
    encoding,
    length,
    segments,
    perSegment: multiMax,
    remaining: segments * multiMax - length,
  }
}
