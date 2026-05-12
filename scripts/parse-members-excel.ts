import * as XLSX from 'xlsx'
import * as path from 'path'

const file = path.resolve(process.cwd(), 'MWIKI ALTAR ADULTS LIST.xlsx')
const wb = XLSX.readFile(file)

const ws = wb.Sheets['Sheet1']
type Raw = {
  'MWIKI MAIN ALTAR ADULTS LIST': string | null
  __EMPTY: string | null
  __EMPTY_1: string | null
  __EMPTY_2: string | null
  __EMPTY_3: string | null
  __EMPTY_4: string | null
  __EMPTY_5: string | null
}
const rows = XLSX.utils.sheet_to_json<Raw>(ws, { defval: null, raw: false })

const members: {
  sr: string
  name: string
  gender: string
  estate: string | null
  fellowship: string | null
  phone: string | null
  departments: string[]
}[] = []

for (const r of rows) {
  const sr = r['MWIKI MAIN ALTAR ADULTS LIST']
  if (!sr) continue
  if (sr === 'SR. N') continue
  const name = r['__EMPTY']
  if (!name || !String(name).trim()) continue
  const gender = (r['__EMPTY_1'] || '').toString().trim().toUpperCase()
  const estate = r['__EMPTY_2'] ? String(r['__EMPTY_2']).trim() : null
  const fellowship = r['__EMPTY_3'] ? String(r['__EMPTY_3']).trim() : null
  const phoneRaw = r['__EMPTY_4'] ? String(r['__EMPTY_4']).trim() : null
  const phone = phoneRaw && phoneRaw.length > 0 ? phoneRaw : null
  const deptRaw = r['__EMPTY_5'] ? String(r['__EMPTY_5']).trim() : ''
  const departments = deptRaw
    ? deptRaw.split(/\s*\/\s*/).map(d => d.trim()).filter(d => d.length > 0)
    : []
  members.push({
    sr: String(sr),
    name: String(name).trim(),
    gender,
    estate,
    fellowship,
    phone,
    departments,
  })
}

console.log(`Total member rows: ${members.length}`)

// Stats
const fellowships = new Set<string>()
const departments = new Set<string>()
const missingPhone: string[] = []
const missingFellowship: string[] = []
const missingGender: string[] = []
const missingDept: string[] = []
const genderValues = new Set<string>()

for (const m of members) {
  if (m.fellowship) fellowships.add(m.fellowship.toUpperCase())
  for (const d of m.departments) departments.add(d.toUpperCase())
  if (!m.phone) missingPhone.push(`#${m.sr} ${m.name}`)
  if (!m.fellowship) missingFellowship.push(`#${m.sr} ${m.name}`)
  if (!m.gender) missingGender.push(`#${m.sr} ${m.name}`)
  if (m.departments.length === 0) missingDept.push(`#${m.sr} ${m.name}`)
  genderValues.add(m.gender)
}

console.log('\n--- Distinct fellowships ---')
for (const f of [...fellowships].sort()) console.log(`  ${f}`)
console.log('\n--- Distinct departments (after splitting on /) ---')
for (const d of [...departments].sort()) console.log(`  ${d}`)
console.log('\n--- Distinct gender values ---', [...genderValues])

console.log(`\nMissing phone (${missingPhone.length}):`)
for (const x of missingPhone) console.log('  ' + x)
console.log(`\nMissing fellowship (${missingFellowship.length}):`)
for (const x of missingFellowship) console.log('  ' + x)
console.log(`\nMissing gender (${missingGender.length}):`)
for (const x of missingGender) console.log('  ' + x)
console.log(`\nMissing department (${missingDept.length}):`)
for (const x of missingDept) console.log('  ' + x)

console.log('\nLast row:', JSON.stringify(members[members.length - 1]))
