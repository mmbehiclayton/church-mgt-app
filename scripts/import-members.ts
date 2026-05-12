import * as XLSX from 'xlsx'
import * as path from 'path'
import { PrismaClient, type Prisma } from '@prisma/client'

const prisma = new PrismaClient()
const DRY_RUN = process.argv.includes('--dry-run')

const FELLOWSHIP_ALIAS: Record<string, string> = {
  // Map sheet fellowship name -> canonical DB name
  MWIKI: 'MWIKI MAIN',
}

const DEPT_NORMALIZE: Record<string, string> = {
  KEYBOADIST: 'KEYBOARDIST', // typo in sheet
  'YOUTH.': 'YOUTH', // trailing period typo, also merges with existing YOUTH in DB
}

function normalizeDept(raw: string): string {
  const trimmed = raw.trim().toUpperCase()
  return DEPT_NORMALIZE[trimmed] ?? trimmed
}

function normalizeFellowship(raw: string): string {
  const trimmed = raw.trim().toUpperCase()
  return FELLOWSHIP_ALIAS[trimmed] ?? trimmed
}

type ParsedMember = {
  sr: string
  name: string
  gender: string
  estate: string | null
  fellowship: string
  phone: string
  departments: string[]
}

function parse(): ParsedMember[] {
  const file = path.resolve(process.cwd(), 'MWIKI ALTAR ADULTS LIST.xlsx')
  const wb = XLSX.readFile(file)
  const ws = wb.Sheets['Sheet1']
  type Raw = Record<string, string | null>
  const rows = XLSX.utils.sheet_to_json<Raw>(ws, { defval: null, raw: false })

  const out: ParsedMember[] = []
  for (const r of rows) {
    const sr = r['MWIKI MAIN ALTAR ADULTS LIST']
    if (!sr || sr === 'SR. N') continue
    const name = r['__EMPTY']
    if (!name || !String(name).trim()) continue

    const gender = String(r['__EMPTY_1'] ?? '').trim().toUpperCase()
    const estate = r['__EMPTY_2'] ? String(r['__EMPTY_2']).trim() : null
    const fellowshipRaw = r['__EMPTY_3'] ? String(r['__EMPTY_3']).trim() : ''
    const phoneRaw = r['__EMPTY_4'] ? String(r['__EMPTY_4']).trim() : ''
    const deptRaw = r['__EMPTY_5'] ? String(r['__EMPTY_5']).trim() : ''

    const departments = deptRaw
      ? deptRaw.split(/\s*\/\s*/).map(normalizeDept).filter(d => d.length > 0)
      : []

    out.push({
      sr: String(sr),
      name: String(name).trim(),
      gender,
      estate,
      fellowship: normalizeFellowship(fellowshipRaw),
      phone: phoneRaw, // may be "" — user chose to insert empty string
      departments,
    })
  }
  return out
}

async function main() {
  const members = parse()
  console.log(`Parsed ${members.length} members from sheet.\n`)

  const fellowshipNames = [...new Set(members.map(m => m.fellowship))].sort()
  const departmentNames = [...new Set(members.flatMap(m => m.departments))].sort()

  // Pre-load existing fellowships & departments (case-insensitive match by uppercased name)
  const existingFellowships = await prisma.homeFellowship.findMany()
  const existingDepartments = await prisma.department.findMany()

  const fellowshipByKey = new Map<string, { id: string; name: string }>()
  for (const f of existingFellowships) fellowshipByKey.set(f.name.toUpperCase(), f)

  const departmentByKey = new Map<string, { id: string; name: string }>()
  for (const d of existingDepartments) departmentByKey.set(d.name.toUpperCase(), d)

  const fellowshipsToCreate = fellowshipNames.filter(n => !fellowshipByKey.has(n))
  const departmentsToCreate = departmentNames.filter(n => !departmentByKey.has(n))

  console.log('=== Fellowships ===')
  for (const n of fellowshipNames) {
    const existing = fellowshipByKey.get(n)
    console.log(`  ${n} ${existing ? `→ reuse existing "${existing.name}"` : '→ CREATE'}`)
  }
  console.log('\n=== Departments ===')
  for (const n of departmentNames) {
    const existing = departmentByKey.get(n)
    console.log(`  ${n} ${existing ? `→ reuse existing "${existing.name}"` : '→ CREATE'}`)
  }

  if (DRY_RUN) {
    console.log('\n=== Members (preview) ===')
    for (const m of members) {
      const phoneDisplay = m.phone || '(empty)'
      console.log(
        `  #${m.sr.padStart(3)} ${m.name} | ${m.gender} | estate=${m.estate ?? '-'} | fellowship=${m.fellowship} | phone=${phoneDisplay} | depts=[${m.departments.join(', ')}]`
      )
    }
    console.log(`\nDRY RUN — no DB writes performed.`)
    console.log(`Would create ${fellowshipsToCreate.length} fellowships, ${departmentsToCreate.length} departments, ${members.length} members.`)
    return
  }

  // === LIVE WRITES ===
  console.log('\n=== Writing to DB ===')

  // Create missing fellowships
  for (const name of fellowshipsToCreate) {
    const created = await prisma.homeFellowship.create({ data: { name } })
    fellowshipByKey.set(name, created)
    console.log(`  + Fellowship: ${created.name}`)
  }
  // Create missing departments
  for (const name of departmentsToCreate) {
    const created = await prisma.department.create({ data: { name } })
    departmentByKey.set(name, created)
    console.log(`  + Department: ${created.name}`)
  }

  // Insert members. Idempotency: skip if a member already exists with same fullName + phoneNumber.
  let inserted = 0
  let skipped = 0
  for (const m of members) {
    const existing = await prisma.member.findFirst({
      where: {
        fullName: { equals: m.name, mode: 'insensitive' },
        phoneNumber: m.phone,
      },
      select: { id: true },
    })
    if (existing) {
      skipped++
      console.log(`  = skip (exists): #${m.sr} ${m.name}`)
      continue
    }

    const fellowship = fellowshipByKey.get(m.fellowship)!
    const deptIds = m.departments.map(d => departmentByKey.get(d)!.id)

    const data: Prisma.MemberCreateInput = {
      fullName: m.name,
      phoneNumber: m.phone,
      gender: m.gender,
      estate: m.estate ?? undefined,
      homeFellowship: { connect: { id: fellowship.id } },
      departments: {
        create: deptIds.map(id => ({ department: { connect: { id } } })),
      },
    }
    const created = await prisma.member.create({ data, select: { id: true, fullName: true } })
    inserted++
    console.log(`  + #${m.sr} ${created.fullName}`)
  }

  console.log(`\nDone. Inserted ${inserted}, skipped ${skipped}.`)
}

main()
  .catch(e => {
    console.error('FAILED:', e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
