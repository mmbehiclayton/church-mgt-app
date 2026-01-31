import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function updateTransactions() {
    console.log('Updating transactions with realistic M-PESA messages...')

    // Get all transactions
    const transactions = await prisma.transaction.findMany()

    console.log(`Found ${transactions.length} transactions to update`)

    // Update each transaction with a realistic M-PESA message
    for (const transaction of transactions) {
        const accountNumber = `131***${Math.floor(1000 + Math.random() * 9000)}`
        const date = new Date(transaction.transactionDate)

        const hour = Math.floor(Math.random() * 12) + 1
        const minute = Math.floor(Math.random() * 60).toString().padStart(2, '0')
        const ampm = Math.random() > 0.5 ? 'AM' : 'PM'
        const timeStr = `${hour}:${minute} ${ampm}`

        const day = date.getDate()
        const month = date.getMonth() + 1
        const year = date.getFullYear()
        const dateStr = `${day}/${month}/${year}`

        const rawMessage = `Ksh ${transaction.amount.toFixed(2)} sent to KCB Pay Bill 522522 for account ${accountNumber} REPENTANCE AND HOLINESS MISSIONS has been received on ${dateStr} at ${timeStr}. M-PESA ref ${transaction.reference}`

        await prisma.transaction.update({
            where: { id: transaction.id },
            data: {
                account: accountNumber,
                accountName: 'REPENTANCE AND HOLINESS MISSIONS',
                bank: 'KCB',
                rawMessage: rawMessage,
                transactionTime: timeStr
            }
        })
    }

    console.log(`Updated ${transactions.length} transactions`)
}

updateTransactions()
    .then(async () => {
        await prisma.$disconnect()
    })
    .catch(async (e) => {
        console.error(e)
        await prisma.$disconnect()
        process.exit(1)
    })
