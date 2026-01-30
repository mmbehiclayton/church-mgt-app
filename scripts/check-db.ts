
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
    const count = await prisma.transaction.count()
    console.log(`Total Transactions: ${count}`)

    if (count > 0) {
        const recent = await prisma.transaction.findMany({
            take: 5,
            orderBy: { transactionDate: 'desc' },
            select: { id: true, reference: true, transactionDate: true, amount: true }
        })
        console.log("Most Recent Transactions:")
        console.table(recent)
    }
}

main()
    .catch((e) => {
        console.error(e)
        process.exit(1)
    })
    .finally(async () => {
        await prisma.$disconnect()
    })
