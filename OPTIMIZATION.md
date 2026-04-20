# Performance & Deployment Optimization Guide

## Critical Issues Found

From analyzing your dev logs, we identified **critical performance problems** that MUST be fixed before deployment:

### 1. **N+1 Query Problem (CRITICAL - 70s latency)**
**Issue**: The POST /dashboard/membership request took **70 seconds**. Root cause: N+1 queries.

**Evidence from logs**:
- Each member insertion is followed by a SELECT query
- 70+ separate INSERT/SELECT query pairs executed sequentially
- Related data (HomeFellowship, MemberDepartment, Department) fetched for each record

**Impact**: Linear performance degradation with data volume. 1000 members = minutes of load time.

---

## Priority 1: Critical Fixes (Do Before Deploy)

### 1.1 Add Database Indexes

**File**: `prisma/schema.prisma`

```prisma
model User {
  id                  String    @id @default(cuid())
  email               String    @unique
  password            String
  name                String?
  role                String    @default("ADMIN")
  isActive            Boolean   @default(true)
  lastLogin           DateTime?
  passwordResetToken  String?
  passwordResetExpiry DateTime?
  createdAt           DateTime  @default(now())
  updatedAt           DateTime  @updatedAt

  @@index([role])
  @@index([isActive])
}

model Transaction {
  id              String   @id @default(uuid())
  categoryId      String
  amount          Float
  bank            String?
  paybill         String?
  account         String?
  accountName     String?
  reference       String   @unique
  transactionDate DateTime
  transactionTime String?
  rawMessage      String
  createdAt       DateTime @default(now())
  
  category        Category @relation(fields: [categoryId], references: [id])

  @@index([categoryId])
  @@index([transactionDate])
  @@index([reference])
}

model Member {
  id           String              @id @default(cuid())
  fullName     String
  phoneNumber  String
  gender       String
  estate       String?
  homeFellowshipId String?
  homeFellowship HomeFellowship? @relation(fields: [homeFellowshipId], references: [id])
  departments  MemberDepartment[]
  attendance   AttendanceRecord[]
  createdAt    DateTime            @default(now())
  updatedAt    DateTime            @updatedAt

  @@index([homeFellowshipId])
  @@index([fullName])
  @@index([gender])
}

model MemberDepartment {
  id          String    @id @default(cuid())
  memberId    String
  member      Member    @relation(fields: [memberId], references: [id], onDelete: Cascade)
  departmentId String
  department  Department @relation(fields: [departmentId], references: [id], onDelete: Cascade)
  createdAt   DateTime  @default(now())

  @@unique([memberId, departmentId])
  @@index([memberId])
  @@index([departmentId])
}

model HomeFellowship {
  id          String   @id @default(cuid())
  name        String   @unique
  leader      String?
  location    String?
  members     Member[]
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  @@index([name])
}

model AttendanceRecord {
  id        String           @id @default(cuid())
  session   AttendanceSession @relation(fields: [sessionId], references: [id], onDelete: Cascade)
  sessionId String
  member    Member           @relation(fields: [memberId], references: [id], onDelete: Cascade)
  memberId  String
  status    AttendanceStatus @default(PRESENT)
  notes     String?
  createdAt DateTime         @default(now())
  updatedAt DateTime         @updatedAt

  @@unique([sessionId, memberId])
  @@index([sessionId])
  @@index([memberId])
  @@index([status])
}
```

**Create migration**:
```bash
npx prisma migrate dev --name add_performance_indexes
```

---

### 1.2 Optimize Prisma Queries - Fix N+1 Problem

**File**: `app/actions.ts` - Update `getMembers()` function:

```typescript
// BEFORE (N+1 problem):
export async function getMembers(filters?: { departmentId?: string; gender?: string }) {
    const where: any = {};
    if (filters?.departmentId) {
        where.departments = { some: { departmentId: filters.departmentId } };
    }
    if (filters?.gender) {
        where.gender = filters.gender;
    }

    const members = await prisma.member.findMany({
        where,
        include: {
            homeFellowship: true,
            departments: { include: { department: true } }
        },
        orderBy: { fullName: 'asc' }
    });
    return members;
}

// AFTER (Optimized with pagination & efficient queries):
export async function getMembers(
    filters?: { 
        departmentId?: string
        gender?: string
        page?: number
        limit?: number
    }
) {
    try {
        const where: any = {};
        const page = filters?.page || 1;
        const limit = filters?.limit || 50; // Add pagination
        const skip = (page - 1) * limit;

        if (filters?.departmentId) {
            where.departments = { some: { departmentId: filters.departmentId } };
        }
        if (filters?.gender) {
            where.gender = filters.gender;
        }

        // Execute count and fetch in parallel
        const [members, total] = await Promise.all([
            prisma.member.findMany({
                where,
                select: {
                    id: true,
                    fullName: true,
                    phoneNumber: true,
                    gender: true,
                    estate: true,
                    homeFellowshipId: true,
                    homeFellowship: {
                        select: { id: true, name: true } // Only fetch needed fields
                    },
                    departments: {
                        select: {
                            department: {
                                select: { id: true, name: true } // Only needed fields
                            }
                        }
                    }
                },
                orderBy: { fullName: 'asc' },
                skip,
                take: limit
            }),
            prisma.member.count({ where })
        ]);

        return {
            data: members,
            pagination: {
                total,
                page,
                limit,
                pages: Math.ceil(total / limit)
            }
        };
    } catch (error) {
        console.error("Get Members Error:", error);
        return { data: [], pagination: { total: 0, page: 1, limit: 50, pages: 0 } };
    }
}
```

**Update related functions**:
```typescript
export async function getDepartments() {
    try {
        const departments = await prisma.department.findMany({
            select: {
                id: true,
                name: true,
                description: true,
                _count: { select: { members: true } }
            },
            orderBy: { name: 'asc' }
            // Add limit if many departments
        });
        return departments;
    } catch (error) {
        console.error("Get Departments Error:", error);
        return [];
    }
}

export async function getHomeFellowships() {
    try {
        const fellowships = await prisma.homeFellowship.findMany({
            select: {
                id: true,
                name: true,
                leader: true,
                location: true,
                _count: { select: { members: true } }
            },
            orderBy: { name: 'asc' }
        });
        return fellowships;
    } catch (error) {
        console.error("Get Home Fellowships Error:", error);
        return [];
    }
}
```

---

### 1.3 Disable Prisma Query Logging in Production

**File**: `lib/db.ts`

```typescript
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
```

---

### 1.4 Optimize Bulk Member Creation

**File**: `app/actions.ts` - Optimize `createMember()` and `addMembers()`:

```typescript
// Optimize for bulk creates
export async function addMembers(data: Array<{
    fullName: string
    phoneNumber: string
    gender: string
    estate?: string
    homeFellowshipId?: string
    departmentIds?: string[]
}>) {
    try {
        const results = []
        
        // Process in batches of 25 for better performance
        const batchSize = 25
        for (let i = 0; i < data.length; i += batchSize) {
            const batch = data.slice(i, i + batchSize)
            
            // Create members in parallel without individual verification
            const created = await Promise.all(
                batch.map(item =>
                    prisma.member.create({
                        data: {
                            fullName: item.fullName,
                            phoneNumber: item.phoneNumber,
                            gender: item.gender,
                            estate: item.estate,
                            homeFellowshipId: item.homeFellowshipId
                        },
                        select: { id: true } // Only fetch ID for department linking
                    })
                )
            )
            
            // Add department relationships (if any)
            for (let j = 0; j < batch.length; j++) {
                if (batch[j].departmentIds?.length) {
                    await prisma.memberDepartment.createMany({
                        data: batch[j].departmentIds!.map(deptId => ({
                            memberId: created[j].id,
                            departmentId: deptId
                        }))
                    })
                }
            }
            
            results.push(...created)
        }

        revalidatePath("/dashboard/membership")
        return { success: true, count: results.length }
    } catch (error) {
        console.error("Add Members Error:", error)
        return { error: "Failed to add members" }
    }
}
```

---

## Priority 2: Important Improvements

### 2.1 Add Response Caching

**File**: `app/dashboard/membership/page.tsx`

```typescript
import { getMembers, getDepartments, getHomeFellowships } from "@/app/actions"
import MembersTable from "@/components/membership/MembersTable"

// Cache for 60 seconds - significant improvement for frequently viewed page
export const revalidate = 60 // ISR: Revalidate every 60 seconds

export const dynamic = 'force-dynamic' // Remove if possible after fixing queries

export default async function MembershipPage() {
    const [membersResult, departments, homeFellowships] = await Promise.all([
        getMembers({ page: 1, limit: 50 }),
        getDepartments(),
        getHomeFellowships()
    ])

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-gray-900">Membership</h1>
                    <p className="text-gray-500 mt-1">Manage church members and departments</p>
                </div>
            </div>

            <MembersTable 
                members={membersResult.data}
                pagination={membersResult.pagination}
                departments={departments}
                homeFellowships={homeFellowships}
            />
        </div>
    )
}
```

### 2.2 Update MembersTable for Pagination

**File**: `components/membership/MembersTable.tsx` - Add pagination support:

```typescript
interface MembersTableProps {
    members: Member[]
    pagination?: {
        total: number
        page: number
        limit: number
        pages: number
    }
    departments: Department[]
    homeFellowships: HomeFellowship[]
}

export default function MembersTable({ 
    members, 
    pagination,
    departments, 
    homeFellowships 
}: MembersTableProps) {
    const [currentPage, setCurrentPage] = useState(pagination?.page || 1)
    
    // ... rest of component

    // Add pagination controls at bottom of table
    return (
        <div className="space-y-4">
            {/* Existing table content */}
            
            {pagination && pagination.pages > 1 && (
                <div className="flex items-center justify-between">
                    <p className="text-sm text-gray-600">
                        Showing {(currentPage - 1) * pagination.limit + 1} to{' '}
                        {Math.min(currentPage * pagination.limit, pagination.total)} of{' '}
                        {pagination.total} members
                    </p>
                    <div className="flex gap-2">
                        <Button
                            variant="outline"
                            disabled={currentPage === 1}
                            onClick={() => setCurrentPage(p => p - 1)}
                        >
                            Previous
                        </Button>
                        <Button
                            variant="outline"
                            disabled={currentPage >= pagination.pages}
                            onClick={() => setCurrentPage(p => p + 1)}
                        >
                            Next
                        </Button>
                    </div>
                </div>
            )}
        </div>
    )
}
```

---

### 2.3 Add Error Boundaries for Slow Queries

**File**: Create `app/dashboard/error.tsx`

```typescript
'use client'

import { useEffect } from 'react'
import { Button } from '@/components/ui/button'

export default function Error({
    error,
    reset,
}: {
    error: Error & { digest?: string }
    reset: () => void
}) {
    useEffect(() => {
        console.error(error)
    }, [error])

    return (
        <div className="flex h-screen items-center justify-center">
            <div className="text-center">
                <h2 className="mb-4 text-2xl font-bold">Something went wrong</h2>
                <p className="mb-4 text-gray-600">
                    {error.message || 'An error occurred while loading the page'}
                </p>
                <Button onClick={() => reset()}>Try again</Button>
            </div>
        </div>
    )
}
```

---

### 2.4 Optimize Transaction Queries

**File**: `app/actions.ts` - Optimize dashboard stats:

```typescript
export async function getDashboardStats(filters?: DashboardFilters) {
    const where: any = {}

    if (filters?.startDate || filters?.endDate) {
        where.transactionDate = {}
        if (filters.startDate) where.transactionDate.gte = filters.startDate
        if (filters.endDate) where.transactionDate.lte = filters.endDate
    }

    if (filters?.categoryIds && filters.categoryIds.length > 0) {
        where.categoryId = { in: filters.categoryIds }
    }

    // Parallel queries - good! But optimize the aggregate queries
    const [
        { _sum, _count, _avg },
        byCategory,
        categories,
        trendDataRaw
    ] = await Promise.all([
        prisma.transaction.aggregate({
            where,
            _sum: { amount: true },
            _count: { id: true },
            _avg: { amount: true }
        }),
        prisma.transaction.groupBy({
            by: ['categoryId'],
            where,
            _sum: { amount: true },
            orderBy: { _sum: { amount: 'desc' } },
            take: 10 // Add limit to prevent loading too much data
        }),
        prisma.category.findMany({
            select: { id: true, name: true },
            orderBy: { name: 'asc' }
        }),
        prisma.transaction.findMany({
            where,
            select: {
                transactionDate: true,
                amount: true
            },
            orderBy: { transactionDate: 'asc' },
            take: 100 // Limit trend data
        })
    ])

    // ... rest of function
}
```

---

## Priority 3: Security & Best Practices

### 3.1 Enable NextAuth Environment Validation

Create `.env.example`:
```
CHURCH_DATABASE_URL=postgresql://...
NEXTAUTH_SECRET=generate-with-: openssl rand -base64 32
NEXTAUTH_URL=http://localhost:3000
```

### 3.2 Add Request Rate Limiting

**Install**: `npm install next-rate-limit`

Create `lib/rate-limit.ts`:
```typescript
import { Ratelimit } from '@upstash/ratelimit'
import { Redis } from '@upstash/redis'

export const ratelimit = new Ratelimit({
    redis: Redis.fromEnv(),
    limiter: Ratelimit.slidingWindow(100, '1 h'),
})
```

Use in API routes to prevent abuse.

### 3.3 Add Monitoring for Slow Queries

**File**: `lib/db.ts` - Add query tracking:

```typescript
const prisma = new PrismaClient({
    log: [
        {
            emit: 'event',
            level: 'query',
        },
        {
            emit: 'stdout',
            level: 'error',
        },
    ],
})

prisma.$on('query', (e) => {
    if (e.duration > 1000) {
        console.warn(`Slow query detected: ${e.query}`)
        console.warn(`Duration: ${e.duration}ms`)
    }
})
```

---

## Priority 4: Deployment Checklist

### Before Deploying to Production:

- [ ] **Run migrations**: `npx prisma migrate deploy`
- [ ] **Build successfully**: `npm run build` (0 errors)
- [ ] **Test pagination**: Verify member list loads in <2 seconds
- [ ] **Set environment variables** on Vercel/hosting:
  - `CHURCH_DATABASE_URL`
  - `NEXTAUTH_SECRET` (use `openssl rand -base64 32`)
  - `NEXTAUTH_URL=https://yourdomain.com`
- [ ] **Enable database backup** (Neon provides this)
- [ ] **Test NextAuth login** in production environment
- [ ] **Set up monitoring** (Vercel Analytics, Sentry for errors)
- [ ] **Enable Edge Caching** in Vercel (ISR for static pages)

---

## Performance Benchmarks (Expected After Fixes)

| Operation | Before | After | Target |
|-----------|--------|-------|--------|
| Load members page (70 users) | 70s | ~500ms | <1s |
| Add single member | 2-3s | ~100ms | <200ms |
| Add 70 members | 70s+ | ~2s | <5s |
| Dashboard stats load | 4-5s | ~500ms | <1s |
| Database query (avg) | ? | <50ms | <100ms |

---

## Quick Start Commands

```bash
# 1. Add indexes
npx prisma migrate dev --name add_performance_indexes

# 2. Verify database indexes
npx prisma db execute --stdin < check_indexes.sql

# 3. Test production build locally
npm run build
npm start

# 4. Deploy to Vercel
vercel --prod

# 5. Monitor logs
vercel logs
```

---

## Additional Resources

- [Prisma Performance](https://www.prisma.io/docs/guides/performance-and-optimization/query-optimization)
- [Next.js Caching](https://nextjs.org/docs/app/building-your-application/caching)
- [PostgreSQL Indexing](https://www.postgresql.org/docs/current/indexes.html)
- [NextAuth.js Deployment](https://next-auth.js.org/deployment)
