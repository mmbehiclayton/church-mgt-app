import { PrismaClient } from "@prisma/client"

const databaseUrl = process.env.CHURCH_DATABASE_URL ?? process.env.DATABASE_URL

const prismaClientSingleton = () => {
    return new PrismaClient({
        datasourceUrl: databaseUrl,
        // Only log errors in production, queries in development
        log: process.env.NODE_ENV === 'production' 
            ? ['error', 'warn'] 
            : ['query', 'error', 'warn'],
    })
}

type PrismaClientSingleton = ReturnType<typeof prismaClientSingleton>

const globalForPrisma = globalThis as unknown as {
    prisma: PrismaClientSingleton | undefined
}

const prisma = globalForPrisma.prisma ?? prismaClientSingleton()

export default prisma

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma
