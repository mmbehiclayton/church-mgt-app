import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  const memberCount = await prisma.member.count()
  const fellowships = await prisma.homeFellowship.findMany({
    select: { id: true, name: true, _count: { select: { members: true } } },
    orderBy: { name: 'asc' },
  })
  const departments = await prisma.department.findMany({
    select: { id: true, name: true, _count: { select: { members: true } } },
    orderBy: { name: 'asc' },
  })

  console.log(`Members in DB: ${memberCount}`)
  console.log(`\nFellowships (${fellowships.length}):`)
  for (const f of fellowships) console.log(`  ${f.name} — ${f._count.members} members`)
  console.log(`\nDepartments (${departments.length}):`)
  for (const d of departments) console.log(`  ${d.name} — ${d._count.members} members`)

  // Look up a sample by name to see if any of the import targets already exist
  const sampleNames = [
    'DAB GEORGE OLWENY',
    'PASTOR CLAYTON HAMISI',
    'OVERSEER GLADYS CHELANGAT',
  ]
  console.log('\nLookup samples (case-insensitive):')
  for (const n of sampleNames) {
    const m = await prisma.member.findMany({
      where: { fullName: { equals: n, mode: 'insensitive' } },
      select: { id: true, fullName: true, phoneNumber: true },
    })
    console.log(`  ${n}: ${m.length} match(es)`, m)
  }
}

main()
  .catch(e => {
    console.error(e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
