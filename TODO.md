# Future TODOs

Ideas parked for later, in suggested order (do #2 first — it makes #1, #3 and #4 more accurate).

## Contributions / finance

- [ ] **1. Remind people who haven't given yet.** Per-category "pledged but not given" list, plus a button to text them via the existing SMS module (Bonga).
- [ ] **2. Match payments to members automatically.** `memberName` currently falls back to the M-Pesa account name. Match on phone number or name, remember the choice, and flag unmatched payments for one-click linking.
- [ ] **3. Save each share as a snapshot.** Record every shared message with date and totals, to compare week-over-week and show who gave since the last update.
- [ ] **4. Public read-only link per category.** Live list, progress bar and paybill details, with a names/initials toggle. Confirm with leadership that publishing names is acceptable first.
- [ ] **5. Target deadline and pace indicator.** Optional target date per category; show "needs ~Ksh X/week to hit target" and surface categories falling behind.

## Small follow-ups

- [ ] Unit tests for `buildShareMessage` and the per-person combining logic in `components/finance/ShareContributions.tsx` (the format is copied verbatim, so regressions are visible).
