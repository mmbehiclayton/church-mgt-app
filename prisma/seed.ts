import { PrismaClient, Prisma } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
    console.log('Start seeding ...')

    // 1. Create Admin User
    const password = await bcrypt.hash('password123', 10)
    const user = await prisma.user.upsert({
        where: { email: 'admin@church.com' },
        update: {},
        create: {
            email: 'admin@church.com',
            name: 'Admin User',
            password,
            role: 'ADMIN',
        },
    })
    console.log({ user })

    // 2. Create Categories
    const categories = [
        { name: 'Tithes' },
        { name: 'Offerings' },
        { name: 'Missions' },
        { name: 'Building Fund' },
        { name: 'Welfare' }
    ]

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const createdCats: any[] = []
    for (const cat of categories) {
        const c = await prisma.category.upsert({
            where: { name: cat.name },
            update: {},
            create: { name: cat.name },
        })
        createdCats.push(c)
    }
    console.log(`Created ${createdCats.length} categories`)

    // 3. Create Sample Transactions (if none exist)
    const count = await prisma.transaction.count()
    if (count === 0) {
        console.log('Seeding transactions...')
        const today = new Date()

        // Helpers
        const getCatId = (name: string) => createdCats.find(c => c.name === name)?.id || createdCats[0].id

        const transactions = [
            { ref: 'R10001', cat: 'Tithes', amt: 5000, daysAgo: 0 },
            { ref: 'R10002', cat: 'Offerings', amt: 200, daysAgo: 0 },
            { ref: 'R10003', cat: 'Missions', amt: 1500, daysAgo: 1 },
            { ref: 'R10004', cat: 'Tithes', amt: 2000, daysAgo: 2 },
            { ref: 'R10005', cat: 'Building Fund', amt: 10000, daysAgo: 3 },
            { ref: 'R10006', cat: 'Offerings', amt: 500, daysAgo: 5 },
            { ref: 'R10007', cat: 'Welfare', amt: 1000, daysAgo: 7 },
            { ref: 'R10008', cat: 'Tithes', amt: 3500, daysAgo: 10 },
            { ref: 'R10009', cat: 'Missions', amt: 2000, daysAgo: 12 },
            { ref: 'R10010', cat: 'Offerings', amt: 300, daysAgo: 15 },
            { ref: 'R10011', cat: 'Building Fund', amt: 5000, daysAgo: 20 },
            { ref: 'R10012', cat: 'Tithes', amt: 4000, daysAgo: 25 },
            { ref: 'R10013', cat: 'Offerings', amt: 150, daysAgo: 28 },
        ]

        for (const t of transactions) {
            const date = new Date(today)
            date.setDate(date.getDate() - t.daysAgo)

            // Generate realistic M-PESA message with account number
            const accountNumber = `131***${Math.floor(1000 + Math.random() * 9000)}`
            const hour = Math.floor(Math.random() * 12) + 1
            const minute = Math.floor(Math.random() * 60).toString().padStart(2, '0')
            const ampm = Math.random() > 0.5 ? 'AM' : 'PM'
            const timeStr = `${hour}:${minute} ${ampm}`

            const day = date.getDate()
            const month = date.getMonth() + 1
            const year = date.getFullYear()
            const dateStr = `${day}/${month}/${year}`

            const refCode = `U${String.fromCharCode(65 + Math.floor(Math.random() * 26))}${Math.random().toString(36).substring(2, 9).toUpperCase()}`

            const rawMessage = `Ksh ${t.amt.toFixed(2)} sent to KCB Pay Bill 522522 for account ${accountNumber} REPENTANCE AND HOLINESS MISSIONS has been received on ${dateStr} at ${timeStr}. M-PESA ref ${refCode}`

            await prisma.transaction.create({
                data: {
                    reference: refCode,
                    amount: t.amt,
                    categoryId: getCatId(t.cat),
                    transactionDate: date,
                    transactionTime: timeStr,
                    rawMessage: rawMessage,
                    bank: 'KCB',
                    account: accountNumber,
                    accountName: 'REPENTANCE AND HOLINESS MISSIONS',
                }
            })
        }
        console.log(`Created ${transactions.length} sample transactions`)
    } else {
        console.log('Transactions already exist, skipping seed.')
    }

    // 4. Create Departments
    const departments = [
        { name: 'Youth', description: 'Youth ministry and activities' },
        { name: 'Choir', description: 'Music and worship team' },
        { name: 'Ushers', description: 'Welcoming and seating congregation' },
        { name: 'Sunday School', description: 'Children and adult education' },
        { name: 'Intercessory', description: 'Prayer and intercession ministry' }
    ]

    const createdDepts = []
    for (const dept of departments) {
        const d = await prisma.department.upsert({
            where: { name: dept.name },
            update: {},
            create: { name: dept.name, description: dept.description },
        })
        createdDepts.push(d)
    }
    console.log(`Created ${createdDepts.length} departments`)

    // 5. Create Sample Members (if none exist)
    const memberCount = await prisma.member.count()
    if (memberCount === 0) {
        console.log('Seeding members...')
        const sampleMembers = [
            { fullName: 'John Kamau', phoneNumber: '0712345678', gender: 'Male', departmentId: createdDepts[0].id },
            { fullName: 'Mary Wanjiru', phoneNumber: '0723456789', gender: 'Female', departmentId: createdDepts[1].id },
            { fullName: 'Peter Omondi', phoneNumber: '0734567890', gender: 'Male', departmentId: createdDepts[2].id },
            { fullName: 'Grace Akinyi', phoneNumber: '0745678901', gender: 'Female', departmentId: createdDepts[3].id },
            { fullName: 'David Mwangi', phoneNumber: '0756789012', gender: 'Male', departmentId: createdDepts[4].id },
            { fullName: 'Sarah Njeri', phoneNumber: '0767890123', gender: 'Female', departmentId: createdDepts[0].id },
            { fullName: 'James Otieno', phoneNumber: '0778901234', gender: 'Male', departmentId: createdDepts[1].id },
            { fullName: 'Ruth Wambui', phoneNumber: '0789012345', gender: 'Female', departmentId: createdDepts[2].id },
            { fullName: 'Samuel Kipchoge', phoneNumber: '0790123456', gender: 'Male', departmentId: createdDepts[3].id },
            { fullName: 'Esther Chebet', phoneNumber: '0701234567', gender: 'Female', departmentId: createdDepts[4].id },
        ]

        for (const member of sampleMembers) {
            await prisma.member.create({
                data: member
            })
        }
        console.log(`Created ${sampleMembers.length} sample members`)
    } else {
        console.log('Members already exist, skipping seed.')
    }
}

main()
    .then(async () => {
        await prisma.$disconnect()
    })
    .catch(async (e) => {
        console.error(e)
        await prisma.$disconnect()
        process.exit(1)
    })
