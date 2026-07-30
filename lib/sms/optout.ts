/**
 * Opt-out suffix for promotional/bulk SMS.
 *
 * Mobile network operators require bulk/promotional SMS to carry opt-out
 * instructions — sender IDs that skip this risk suspension. Applied at
 * compose time (Compose UI) rather than baked into templates, since the
 * same template may be reused for a promotional blast or a one-off
 * personal message where it doesn't apply.
 */
export const OPT_OUT_SUFFIX = '\n\n@MWIKI MAIN ALTAR. Dial *456*9*5# to STOP'

export function appendOptOut(message: string, enabled: boolean): string {
  if (!enabled) return message
  return `${message}${OPT_OUT_SUFFIX}`
}
