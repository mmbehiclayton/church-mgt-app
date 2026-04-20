import { PrismaClient } from "@prisma/client"

const prismaClientSingleton = () => {
    return new PrismaClient({
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
