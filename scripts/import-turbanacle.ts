import * as XLSX from 'xlsx'
import * as path from 'path'
import { PrismaClient } from '@prisma/client'
import { parse, isValid } from 'date-fns'

const prisma = new PrismaClient()
const LIVE = process.argv.includes('--live')
const CATEGORY_NAME = 'TERBANACLE 2026'

type ParsedRow = {
  date: string
  reference: string
  amount: number
  rawLine: string
}

function parseDate(raw: string): Date | null {
  // Extract the leading date portion in case the cell has extra text appended
  const cleaned = raw.trim()
    .replace(/[OoОо]/g, '0')   // OCR: letter O → digit 0
    .replace(/^I\//i, '1/')    // OCR: letter I at start → digit 1
    .replace(/(\d)\s+\//, '$1/') // remove spaces before slash: "19/8 /2025" → "19/8/2025"
    .replace(/\/\//g, '/')       // double slash: "5//7" → "5/7"

  // Extract date-like prefix ("d/M/yyyy" or "d/M/yy") stripping any trailing non-date text
  const match = cleaned.match(/^(\d{1,2}\/\d{1,2}\/\d{2,4})/)
  if (!match) return null

  let datePart = match[1]

  // Normalize 2-digit year to 4-digit: "8/9/25" → "8/9/2025"
  datePart = datePart.replace(/^(\d{1,2}\/\d{1,2}\/)(\d{2})$/, (_, prefix, yy) => `${prefix}20${yy}`)

  const d = parse(datePart, 'd/M/yyyy', new Date())
  return isValid(d) ? d : null
}

function loadRows(): ParsedRow[] {
  const file = path.resolve(process.cwd(), 'MWIKI TURBANACLE SUPPORT.xlsx')
  const wb = XLSX.readFile(file)
  const ws = wb.Sheets[wb.SheetNames[0]]
  const raw = XLSX.utils.sheet_to_json<string[]>(ws, { defval: null, raw: false, header: 1 })

  const out: ParsedRow[] = []
  let skippedHeader = false

  for (const row of raw) {
    // skip the header row
    if (!skippedHeader) {
      skippedHeader = true
      continue
    }

    const dateStr = row[0] ? String(row[0]).trim() : ''
    // col 1 is NAME — intentionally omitted
    const reference = row[2] ? String(row[2]).trim() : ''
    const amountStr = row[3] ? String(row[3]).trim() : ''

    if (!dateStr || !reference || !amountStr) continue

    const amount = parseFloat(amountStr.replace(/,/g, ''))
    if (isNaN(amount)) continue

    out.push({ date: dateStr, reference, amount, rawLine: row.join(' | ') })
  }

  return out
}

async function main() {
  const rows = loadRows()
  console.log(`Parsed ${rows.length} rows from Excel.\n`)

  // Validate dates
  const invalid: ParsedRow[] = []
  const valid: (ParsedRow & { parsedDate: Date })[] = []

  for (const r of rows) {
    const d = parseDate(r.date)
    if (!d) {
      invalid.push(r)
    } else {
      valid.push({ ...r, parsedDate: d })
    }
  }

  if (invalid.length > 0) {
    console.warn(`⚠  ${invalid.length} rows with unparseable dates (will be skipped):`)
    for (const r of invalid) console.warn(`   ${r.rawLine}`)
    console.warn()
  }

  console.log(`✓ ${valid.length} rows with valid dates.`)

  // Check for duplicate references within the file itself
  const refSet = new Set<string>()
  const inFileDupes: string[] = []
  for (const r of valid) {
    if (refSet.has(r.reference)) inFileDupes.push(r.reference)
    else refSet.add(r.reference)
  }
  if (inFileDupes.length > 0) {
    console.warn(`⚠  ${inFileDupes.length} duplicate references within the file (Prisma will keep the first):`)
    for (const ref of inFileDupes) console.warn(`   ${ref}`)
    console.warn()
  }

  if (!LIVE) {
    console.log('\nDRY RUN — preview of first 10 rows:')
    for (const r of valid.slice(0, 10)) {
      console.log(`  ${r.parsedDate.toISOString().slice(0, 10)}  ref=${r.reference}  amount=${r.amount}`)
    }
    console.log(`\nRun with --live to write to production DB.`)
    console.log(`Category "${CATEGORY_NAME}" will be created if it does not exist.`)
    console.log(`Existing transactions (matched by reference) will be skipped automatically.`)
    return
  }

  // === LIVE WRITES ===
  console.log('\n=== Writing to DB ===')

  // Ensure category exists
  let category = await prisma.category.findUnique({ where: { name: CATEGORY_NAME } })
  if (!category) {
    category = await prisma.category.create({ data: { name: CATEGORY_NAME } })
    console.log(`+ Created category: ${CATEGORY_NAME}`)
  } else {
    console.log(`= Reusing existing category: ${CATEGORY_NAME} (id=${category.id})`)
  }

  // Pre-check how many references already exist in the DB
  const existingRefs = await prisma.transaction.findMany({
    where: { reference: { in: valid.map(r => r.reference) } },
    select: { reference: true },
  })
  const existingRefSet = new Set(existingRefs.map(r => r.reference))
  console.log(`= ${existingRefSet.size} transactions already exist in DB (will be skipped).`)

  const toInsert = valid.map(r => ({
    categoryId: category!.id,
    reference: r.reference,
    amount: r.amount,
    transactionDate: r.parsedDate,
    transactionTime: null,
    bank: 'KCB',
    paybill: null,
    account: null,
    accountName: null,
    rawMessage: `Imported: ${r.reference} — ${CATEGORY_NAME}`,
    memberId: null,
    memberName: null,
  }))

  const result = await prisma.transaction.createMany({
    data: toInsert,
    skipDuplicates: true,
  })

  console.log(`\n✓ Done. Inserted ${result.count}, skipped ${valid.length - result.count} duplicates.`)
}

main()
  .catch(e => {
    console.error('FAILED:', e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
