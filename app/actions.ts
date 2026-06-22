"use server";

import prisma from "@/lib/db";
import { revalidatePath } from "next/cache";
import { parse, isValid } from "date-fns";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { requirePermission, assignRolesToUser } from "@/lib/rbac";

// ... existing code ...

export async function importTransactions(data: {
    category: string;
    reference: string;
    amount: number;
    bank: string;
    account: string;
    date: string;
    time: string;
}[]) {
    try {
        await requirePermission('transactions', 'create');

        // 1. Manage Categories
        const categoryNames = Array.from(new Set(data.map(d => d.category?.trim()).filter(Boolean)));

        // Find existing categories
        const existingCategories = await prisma.category.findMany({
            where: { name: { in: categoryNames } }
        });
        const existingNames = new Set(existingCategories.map(c => c.name));

        // Create missing categories
        const newCategories = categoryNames.filter(name => !existingNames.has(name));
        if (newCategories.length > 0) {
            await prisma.category.createMany({
                data: newCategories.map(name => ({ name })),
                skipDuplicates: true
            });
        }

        // Re-fetch all needed categories to get IDs
        const allCategories = await prisma.category.findMany({
            where: { name: { in: categoryNames } }
        });
        const categoryMap = new Map(allCategories.map(c => [c.name, c.id]));

        // 2. Prepare Transactions
        const validTransactions = data
            .map(row => {
                const categoryId = categoryMap.get(row.category?.trim());
                if (!categoryId) return null; // Should not happen

                // Parse Date: 21/9/2025 -> Date object
                // Parse Time: 12:04
                let transactionDate;
                try {
                    transactionDate = parse(row.date, 'd/M/yyyy', new Date());
                    // Check if the parsed date is valid
                    if (!isValid(transactionDate)) {
                        return null; // Invalid date
                    }
                } catch {
                    return null; // Invalid date
                }

                return {
                    categoryId,
                    reference: row.reference?.toString(),
                    amount: parseFloat(row.amount.toString()),
                    bank: row.bank?.toString() || null,
                    account: row.account?.toString() || null,
                    // Store date as Date object
                    transactionDate: transactionDate,
                    // Time as string
                    transactionTime: row.time?.toString() || null,
                    rawMessage: `Imported via Excel: ${row.reference}`,
                };
            })
            .filter(t => t !== null && t.reference && !isNaN(t.amount)); // Filter invalid

        if (validTransactions.length === 0) {
            return { error: "No valid transactions found to import" };
        }

        // 3. Bulk Insert
        const result = await prisma.transaction.createMany({
            // @ts-expect-error - CreateMany input type issue with Relations, but valid in Prisma
            data: validTransactions,
            skipDuplicates: true
        });

        revalidatePath("/dashboard");
        revalidatePath("/dashboard/finance");
        return { success: true, count: result.count };
    } catch (error) {
        console.error("Import Error:", error);
        return { error: "Failed to import transactions" };
    }
}

// --- Categories ---

export async function getCategories(options?: { activeOnly?: boolean }) {
    try {
        await requirePermission('categories', 'read');
        return await prisma.category.findMany({
            where: options?.activeOnly ? { isActive: true } : undefined,
            orderBy: { createdAt: "desc" }
        });
    } catch (error) {
        if (!(error instanceof Error) || !error.message.startsWith("Insufficient permissions:")) {
            console.error('Get Categories Error:', error);
        }
        return [];
    }
}

export async function setCategoryActive(id: string, isActive: boolean) {
    try {
        await requirePermission('categories', 'update');
        await prisma.category.update({
            where: { id },
            data: { isActive },
        });
        revalidatePath("/dashboard");
        revalidatePath("/dashboard/finance");
        return { success: true };
    } catch (error) {
        console.error("Set Category Active Error:", error);
        return { error: "Failed to update category status" };
    }
}

export async function createCategory(name: string) {
    try {
        await requirePermission('categories', 'create');

        const existing = await prisma.category.findUnique({
            where: { name }
        });

        if (existing) return { error: "Category already exists" };

        await prisma.category.create({
            data: { name }
        });

        revalidatePath("/dashboard");
        revalidatePath("/dashboard/finance");
        return { success: true };
    } catch {
        return { error: "Failed to create category" };
    }
}

export async function deleteCategory(id: string) {
    try {
        await requirePermission('categories', 'delete');
        // Check for transactions first
        const count = await prisma.transaction.count({
            where: { categoryId: id }
        });

        if (count > 0) {
            return { error: "This category has transactions and can't be deleted. Set it inactive instead to hide it from new entries while keeping its history." };
        }

        await prisma.category.delete({
            where: { id }
        });

        revalidatePath("/dashboard");
        revalidatePath("/dashboard/finance");
        return { success: true };
    } catch {
        return { error: "Failed to delete category" };
    }
}

export async function editCategory(id: string, newName: string) {
    try {
        await requirePermission('categories', 'update');
        if (!newName || !newName.trim()) {
            return { error: "Category name cannot be empty" };
        }

        const trimmedName = newName.trim();
        const existing = await prisma.category.findUnique({
            where: { name: trimmedName }
        });

        if (existing && existing.id !== id) {
            return { error: "Category with this name already exists" };
        }

        await prisma.category.update({
            where: { id },
            data: { name: trimmedName }
        });

        revalidatePath("/dashboard");
        revalidatePath("/dashboard/finance");
        return { success: true };
    } catch {
        return { error: "Failed to edit category" };
    }
}

// --- Transactions ---

export async function deleteTransactions(ids: string[]) {
    try {
        await requirePermission('transactions', 'delete');
        await prisma.transaction.deleteMany({
            where: { id: { in: ids } }
        });
        revalidatePath("/dashboard");
        revalidatePath("/dashboard/finance");
        return { success: true };
    } catch (error) {
        console.error("Delete Transactions Error:", error);
        return { error: "Failed to delete transactions" };
    }
}

export async function setTransactionsReconciled(ids: string[], reconciled: boolean) {
    try {
        await requirePermission('transactions', 'update');
        if (ids.length === 0) return { success: true };
        await prisma.transaction.updateMany({
            where: { id: { in: ids } },
            data: {
                reconciled,
                reconciledAt: reconciled ? new Date() : null,
            },
        });
        revalidatePath("/dashboard");
        revalidatePath("/dashboard/finance");
        return { success: true };
    } catch (error) {
        console.error("Reconcile Transactions Error:", error);
        return { error: "Failed to update reconciliation status" };
    }
}

export async function saveTransaction(data: {
    categoryId: string;
    amount: number;
    reference: string;
    transactionDate: Date;
    transactionTime?: string | null;
    bank?: string | null;
    paybill?: string | null;
    account?: string | null;
    accountName?: string | null;
    rawMessage: string;
    memberId?: string | null;
    memberName?: string | null;
}) {
    try {
        await requirePermission('transactions', 'create');

        const existing = await prisma.transaction.findUnique({
            where: { reference: data.reference }
        });

        if (existing) return { error: "Duplicate transaction reference" };

        await prisma.transaction.create({
            data: {
                categoryId: data.categoryId,
                amount: data.amount,
                reference: data.reference,
                transactionDate: new Date(data.transactionDate),
                transactionTime: data.transactionTime,
                bank: data.bank || null,
                paybill: data.paybill || null,
                account: data.account || null,
                accountName: data.accountName || null,
                rawMessage: data.rawMessage,
                memberId: data.memberId || null,
                memberName: data.memberName || null,
            }
        });

        revalidatePath("/dashboard");
        revalidatePath("/dashboard/finance");
        return { success: true };
    } catch (error) {
        console.error("Save Transaction Error:", error);
        return { error: "Failed to save transaction" };
    }
}

export async function updateTransaction(id: string, data: {
    categoryId: string;
    amount: number;
    reference: string;
    transactionDate: Date;
    transactionTime?: string | null;
    bank?: string | null;
    paybill?: string | null;
    account?: string | null;
    accountName?: string | null;
    rawMessage: string;
    memberId?: string | null;
    memberName?: string | null;
}) {
    try {
        await requirePermission('transactions', 'update');

        // Check if reference conflicts with ANOTHER transaction
        const existing = await prisma.transaction.findFirst({
            where: {
                reference: data.reference,
                id: { not: id }
            }
        });

        if (existing) return { error: "Duplicate transaction reference" };

        await prisma.transaction.update({
            where: { id },
            data: {
                categoryId: data.categoryId,
                amount: data.amount,
                reference: data.reference,
                transactionDate: new Date(data.transactionDate),
                transactionTime: data.transactionTime,
                bank: data.bank || null,
                paybill: data.paybill || null,
                account: data.account || null,
                accountName: data.accountName || null,
                rawMessage: data.rawMessage,
                memberId: data.memberId || null,
                memberName: data.memberName || null,
            }
        });

        revalidatePath("/dashboard");
        revalidatePath("/dashboard/finance");
        return { success: true };
    } catch (error) {
        console.error("Update Transaction Error:", error);
        return { error: "Failed to update transaction" };
    }
}

export async function searchMembers(query: string): Promise<{ id: string; fullName: string; phoneNumber: string }[]> {
    try {
        await requirePermission('members', 'read');
        if (!query.trim()) return [];
        return await prisma.member.findMany({
            where: {
                OR: [
                    { fullName: { contains: query, mode: 'insensitive' } },
                    { phoneNumber: { contains: query } },
                ],
            },
            select: { id: true, fullName: true, phoneNumber: true },
            orderBy: { fullName: 'asc' },
            take: 10,
        });
    } catch {
        return [];
    }
}

export async function getTransactions(filter?: { categoryIds?: string[], startDate?: Date, endDate?: Date, ref?: string }) {
    try {
        await requirePermission('transactions', 'read');
    } catch (error) {
        console.error('Get Transactions Error:', error);
        return [];
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const where: Record<string, any> = {};

    if (filter?.categoryIds && filter.categoryIds.length > 0) {
        where.categoryId = { in: filter.categoryIds };
    }

    if (filter?.startDate || filter?.endDate) {
        where.transactionDate = {};
        if (filter.startDate) where.transactionDate.gte = filter.startDate;
        if (filter.endDate) where.transactionDate.lte = filter.endDate;
    }

    if (filter?.ref) {
        where.reference = { contains: filter.ref, mode: 'insensitive' };
    }

    return await prisma.transaction.findMany({
        where,
        include: { category: true },
        orderBy: { transactionDate: 'desc' }
    });
}

// --- Analytics ---

interface DashboardFilters {
    startDate?: Date;
    endDate?: Date;
    categoryIds?: string[];
}

export async function getDashboardStats(filters?: DashboardFilters) {
    try {
        await requirePermission('transactions', 'read');
    } catch (error) {
        console.error('Get Dashboard Stats Error:', error);
        return {
            totalAmount: 0,
            totalTransactions: 0,
            avgTransaction: 0,
            topCategory: null,
            categoryBreakdown: [],
            revenueTrend: []
        };
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const where: Record<string, any> = {};

    // Apply Date Range

    if (filters?.startDate || filters?.endDate) {
        where.transactionDate = {};
        if (filters.startDate) where.transactionDate.gte = filters.startDate;
        if (filters.endDate) where.transactionDate.lte = filters.endDate;
    }

    // Apply Category Filter
    if (filters?.categoryIds && filters.categoryIds.length > 0) {
        where.categoryId = { in: filters.categoryIds };
    }

    // Run all aggregates and fetch queries concurrently
    const [totalAmount, byCategory, categories, trendDataRaw] = await Promise.all([
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
            orderBy: {
                _sum: { amount: 'desc' }
            }
        }),
        prisma.category.findMany(),
        prisma.transaction.findMany({
            where,
            select: { transactionDate: true, amount: true },
            orderBy: { transactionDate: 'asc' }
        })
    ]);

    const categoryMap = new Map(categories.map(c => [c.id, c]));

    // Only surface active categories in the breakdown / top-category analytics.
    const enrichedByCategory = byCategory
        .map((item: { categoryId: string; _sum: { amount: number | null } }) => {
            const cat = categoryMap.get(item.categoryId);
            return {
                name: cat?.name || "Unknown",
                amount: item._sum.amount || 0,
                isActive: cat?.isActive ?? true,
            };
        })
        .filter(c => c.isActive)
        .map(({ name, amount }) => ({ name, amount }));

    // Group by Date text (YYYY-MM-DD)
    const trendMap = new Map<string, number>();
    trendDataRaw.forEach((t: { transactionDate: Date; amount: number }) => {
        const day = t.transactionDate.toISOString().split('T')[0];
        trendMap.set(day, (trendMap.get(day) || 0) + t.amount);
    });

    const revenueTrend = Array.from(trendMap.entries()).map(([date, amount]) => ({ date, amount }));

    return {
        totalAmount: totalAmount._sum.amount || 0,
        totalTransactions: totalAmount._count.id || 0,
        avgTransaction: totalAmount._avg.amount || 0,
        topCategory: enrichedByCategory[0] || null,
        categoryBreakdown: enrichedByCategory,
        revenueTrend
    };
}

// --- Finance reports ---

export interface FinanceReportBranding {
    name: string;
    leaderName: string | null;
    email: string | null;
    phone: string | null;
    logoUrl: string | null;
}

/** Church branding for finance report headers (guarded by transactions:read). */
export async function getFinanceReportBranding(): Promise<FinanceReportBranding> {
    try {
        await requirePermission('transactions', 'read');
    } catch {
        return { name: "Church", leaderName: null, email: null, phone: null, logoUrl: null };
    }
    const org = await prisma.organization.findFirst({
        select: { name: true, leaderName: true, email: true, phone: true, logoUrl: true },
    });
    return {
        name: org?.name || "Church",
        leaderName: org?.leaderName || null,
        email: org?.email || null,
        phone: org?.phone || null,
        logoUrl: org?.logoUrl || null,
    };
}

export interface CategoryContributionRow {
    id: string;
    name: string;
    isActive: boolean;
    total: number;
    count: number;
    avg: number;
    share: number; // % of grand total
}

export interface CategoryReportTransaction {
    categoryId: string;
    categoryName: string;
    date: string; // ISO
    reference: string;
    memberName: string | null;
    amount: number;
}

export interface CategoryContributionReport {
    scope: string; // human label: "All categories" | "3 categories" | category name
    period: { from: string | null; to: string | null };
    categories: CategoryContributionRow[];
    grandTotal: number;
    grandCount: number;
    grandAvg: number;
    monthlyTrend: { month: string; total: number }[];
    transactions: CategoryReportTransaction[]; // for detailed reports
}

/**
 * Contribution analytics across one, several, or all categories.
 * Inactive categories are always included (they still hold historical data).
 */
export async function getCategoryContributionReport(filters?: {
    categoryIds?: string[];
    startDate?: Date;
    endDate?: Date;
}): Promise<CategoryContributionReport | { error: string }> {
    try {
        await requirePermission('transactions', 'read');

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const where: Record<string, any> = {};
        if (filters?.categoryIds && filters.categoryIds.length > 0) {
            where.categoryId = { in: filters.categoryIds };
        }
        if (filters?.startDate || filters?.endDate) {
            where.transactionDate = {};
            if (filters.startDate) where.transactionDate.gte = filters.startDate;
            if (filters.endDate) where.transactionDate.lte = filters.endDate;
        }

        const [txns, cats] = await Promise.all([
            prisma.transaction.findMany({
                where,
                select: {
                    id: true,
                    amount: true,
                    transactionDate: true,
                    reference: true,
                    memberName: true,
                    categoryId: true,
                },
                orderBy: { transactionDate: 'desc' },
            }),
            prisma.category.findMany({
                where: filters?.categoryIds && filters.categoryIds.length > 0
                    ? { id: { in: filters.categoryIds } }
                    : undefined,
                select: { id: true, name: true, isActive: true },
                orderBy: { name: 'asc' },
            }),
        ]);

        const catMap = new Map(cats.map(c => [c.id, c]));

        // Per-category aggregation (seed with all in-scope categories so
        // zero-activity ones still appear in the report).
        const agg = new Map<string, { total: number; count: number }>();
        for (const c of cats) agg.set(c.id, { total: 0, count: 0 });
        for (const t of txns) {
            const a = agg.get(t.categoryId) ?? { total: 0, count: 0 };
            a.total += t.amount;
            a.count += 1;
            agg.set(t.categoryId, a);
        }

        const grandTotal = txns.reduce((s, t) => s + t.amount, 0);
        const grandCount = txns.length;
        const grandAvg = grandCount > 0 ? grandTotal / grandCount : 0;

        const categories: CategoryContributionRow[] = Array.from(agg.entries())
            .map(([id, a]) => {
                const c = catMap.get(id);
                return {
                    id,
                    name: c?.name ?? "Unknown",
                    isActive: c?.isActive ?? true,
                    total: a.total,
                    count: a.count,
                    avg: a.count > 0 ? a.total / a.count : 0,
                    share: grandTotal > 0 ? Math.round((a.total / grandTotal) * 1000) / 10 : 0,
                };
            })
            .sort((x, y) => y.total - x.total);

        // Monthly trend (yyyy-MM)
        const trendMap = new Map<string, number>();
        for (const t of txns) {
            const month = t.transactionDate.toISOString().slice(0, 7);
            trendMap.set(month, (trendMap.get(month) ?? 0) + t.amount);
        }
        const monthlyTrend = Array.from(trendMap.entries())
            .map(([month, total]) => ({ month, total }))
            .sort((a, b) => a.month.localeCompare(b.month));

        const transactions: CategoryReportTransaction[] = txns.map(t => ({
            categoryId: t.categoryId,
            categoryName: catMap.get(t.categoryId)?.name ?? "Unknown",
            date: t.transactionDate.toISOString(),
            reference: t.reference,
            memberName: t.memberName,
            amount: t.amount,
        }));

        // Scope label
        let scope = "All categories";
        if (filters?.categoryIds && filters.categoryIds.length > 0) {
            scope = filters.categoryIds.length === 1
                ? (catMap.get(filters.categoryIds[0])?.name ?? "1 category")
                : `${filters.categoryIds.length} categories`;
        }

        return {
            scope,
            period: {
                from: filters?.startDate ? filters.startDate.toISOString() : null,
                to: filters?.endDate ? filters.endDate.toISOString() : null,
            },
            categories,
            grandTotal,
            grandCount,
            grandAvg,
            monthlyTrend,
            transactions,
        };
    } catch (error) {
        console.error("getCategoryContributionReport error:", error);
        return { error: "Failed to generate report" };
    }
}

// --- Organization Settings ---

export async function getOrganization() {
    try {
        await requirePermission('settings', 'read');
        const org = await prisma.organization.findFirst();
        if (!org) {
            // Create default if not exists
            return await prisma.organization.create({
                data: {
                    name: "Church App",
                    leaderName: "",
                    email: "",
                    phone: "",
                    logoUrl: ""
                }
            });
        }
        return org;
    } catch (error) {
        if (!(error instanceof Error) || !error.message.startsWith("Insufficient permissions:")) {
            console.error("Get Organization Error:", error);
        }
        return null;
    }
}

export async function updateOrganization(data: {
    id: string;
    name: string;
    leaderName?: string | null;
    email?: string | null;
    phone?: string | null;
    logoUrl?: string | null;
}) {
    try {
        await requirePermission('settings', 'update');
        await prisma.organization.update({
            where: { id: data.id },
            data: {
                name: data.name,
                leaderName: data.leaderName,
                email: data.email,
                phone: data.phone,
                logoUrl: data.logoUrl
            }
        });
        revalidatePath("/dashboard");
        revalidatePath("/dashboard/settings");
        return { success: true };
    } catch (error) {
        console.error("Update Organization Error:", error);
        return { error: "Failed to update settings" };
    }
}

// --- User Management ---

import bcrypt from 'bcryptjs';

// Helper to sanitize user data (remove password)
function sanitizeUser<
    T extends {
        password?: string | null;
        passwordResetToken?: string | null;
        passwordResetExpiry?: Date | null;
    }
>(user: T): Omit<T, "password" | "passwordResetToken" | "passwordResetExpiry"> {
    const sanitized = { ...user };
    delete sanitized.password;
    delete sanitized.passwordResetToken;
    delete sanitized.passwordResetExpiry;
    return sanitized;
}

async function getActiveAdminCount(excludeUserId?: string) {
    return prisma.user.count({
        where: {
            isActive: true,
            userRoles: {
                some: {
                    role: {
                        name: {
                            equals: 'Super Admin',
                            mode: 'insensitive'
                        }
                    }
                }
            },
            ...(excludeUserId ? { id: { not: excludeUserId } } : {})
        }
    });
}

export async function getUsers() {
    try {
        await requirePermission('users', 'read');
        const users = await prisma.user.findMany({
            include: {
                userRoles: {
                    include: {
                        role: {
                            select: {
                                id: true,
                                name: true,
                                description: true
                            }
                        }
                    }
                }
            },
            orderBy: { createdAt: 'desc' }
        });
        return users.map(sanitizeUser);
    } catch (error) {
        console.error("Get Users Error:", error);
        return [];
    }
}

export async function getUserById(id: string) {
    try {
        await requirePermission('users', 'read');
        const user = await prisma.user.findUnique({
            where: { id },
            include: {
                userRoles: {
                    include: {
                        role: {
                            select: {
                                id: true,
                                name: true,
                                description: true
                            }
                        }
                    }
                }
            }
        });
        if (!user) return null;
        return sanitizeUser(user);
    } catch (error) {
        console.error("Get User Error:", error);
        return null;
    }
}

export async function createUser(data: {
    email: string;
    password: string;
    name?: string;
    roleIds?: string[];
    isActive?: boolean;
}) {
    try {
        await requirePermission('users', 'create');
        // Validate email
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(data.email)) {
            return { error: "Invalid email format" };
        }

        // Check if user already exists
        const existing = await prisma.user.findUnique({
            where: { email: data.email }
        });

        if (existing) {
            return { error: "User with this email already exists" };
        }

        // Validate password strength (minimum 6 characters)
        if (data.password.length < 6) {
            return { error: "Password must be at least 6 characters long" };
        }

        // Hash password
        const hashedPassword = await bcrypt.hash(data.password, 10);

        // Create user
        const user = await prisma.user.create({
            data: {
                email: data.email,
                password: hashedPassword,
                name: data.name || null,
                role: 'USER', // Default role, but will assign proper roles below
                isActive: data.isActive !== undefined ? data.isActive : true,
            }
        });

        // Assign roles if provided
        if (data.roleIds && data.roleIds.length > 0) {
            await assignRolesToUser(user.id, data.roleIds);
        }

        revalidatePath("/dashboard/users");
        return { success: true, user: sanitizeUser(user) };
    } catch (error) {
        console.error("Create User Error:", error);
        return { error: "Failed to create user" };
    }
}

export async function updateUser(id: string, data: {
    name?: string;
    roleIds?: string[];
    isActive?: boolean;
}) {
    try {
        await requirePermission('users', 'update');
        const existingUser = await prisma.user.findUnique({
            where: { id },
            include: {
                userRoles: {
                    include: {
                        role: {
                            select: {
                                name: true
                            }
                        }
                    }
                }
            }
        });

        if (!existingUser) {
            return { error: "User not found" };
        }

        if (data.roleIds && data.roleIds.length === 0) {
            return { error: "Please select at least one role" };
        }

        const nextRoleIds = data.roleIds;
        const existingRoleNames = existingUser.userRoles.map((userRole) => userRole.role.name.toLowerCase());
        const isCurrentlyAdmin = existingRoleNames.includes('super admin');

        if (isCurrentlyAdmin && nextRoleIds) {
            const nextRoles = await prisma.role.findMany({
                where: {
                    id: {
                        in: nextRoleIds
                    }
                },
                select: {
                    name: true
                }
            });

            const willRemainAdmin = nextRoles.some((role) => role.name.toLowerCase() === 'super admin');
            if (!willRemainAdmin) {
                const otherActiveAdmins = await getActiveAdminCount(id);
                if (existingUser.isActive && otherActiveAdmins <= 0) {
                    return { error: "Cannot remove the last active admin user" };
                }
            }
        }

        if (existingUser.isActive && data.isActive === false && isCurrentlyAdmin) {
            const otherActiveAdmins = await getActiveAdminCount(id);
            if (otherActiveAdmins <= 0) {
                return { error: "Cannot deactivate the last active admin user" };
            }
        }

        const user = await prisma.$transaction(async (tx) => {
            if (nextRoleIds) {
                const roles = await tx.role.findMany({
                    where: {
                        id: {
                            in: nextRoleIds
                        }
                    },
                    select: {
                        id: true
                    }
                });

                if (roles.length !== nextRoleIds.length) {
                    throw new Error("One or more selected roles no longer exist");
                }

                await tx.userRole.deleteMany({
                    where: { userId: id }
                });

                await tx.userRole.createMany({
                    data: nextRoleIds.map((roleId) => ({
                        userId: id,
                        roleId
                    })),
                    skipDuplicates: true
                });
            }

            return tx.user.update({
                where: { id },
                data: {
                    name: data.name,
                    isActive: data.isActive,
                },
                include: {
                    userRoles: {
                        include: {
                            role: {
                                select: {
                                    id: true,
                                    name: true,
                                    description: true
                                }
                            }
                        }
                    }
                }
            });
        });

        revalidatePath("/dashboard/users");
        return { success: true, user: sanitizeUser(user) };
    } catch (error) {
        if (error instanceof Error && error.message === "One or more selected roles no longer exist") {
            return { error: error.message };
        }
        console.error("Update User Error:", error);
        return { error: "Failed to update user" };
    }
}

export async function deleteUser(id: string, currentUserId: string) {
    try {
        await requirePermission('users', 'delete');
        // Prevent self-deletion
        if (id === currentUserId) {
            return { error: "You cannot delete your own account" };
        }

        const userToDelete = await prisma.user.findUnique({
            where: { id },
            include: {
                userRoles: {
                    include: {
                        role: {
                            select: {
                                name: true
                            }
                        }
                    }
                }
            }
        });

        const isAdminUser = userToDelete?.userRoles.some((userRole) => userRole.role.name.toLowerCase() === 'super admin');
        if (userToDelete?.isActive && isAdminUser) {
            const otherActiveAdmins = await getActiveAdminCount(id);
            if (otherActiveAdmins <= 0) {
                return { error: "Cannot delete the last active admin user" };
            }
        }

        if (!userToDelete) {
            return { error: "User not found" };
        }

        await prisma.user.delete({
            where: { id }
        });

        revalidatePath("/dashboard/users");
        return { success: true };
    } catch (error) {
        console.error("Delete User Error:", error);
        return { error: "Failed to delete user" };
    }
}

export async function resetUserPassword(id: string, newPassword: string) {
    try {
        await requirePermission('users', 'update');
        // Validate password strength
        if (newPassword.length < 6) {
            return { error: "Password must be at least 6 characters long" };
        }

        // Hash new password
        const hashedPassword = await bcrypt.hash(newPassword, 10);

        await prisma.user.update({
            where: { id },
            data: {
                password: hashedPassword,
                passwordResetToken: null,
                passwordResetExpiry: null,
            }
        });

        revalidatePath("/dashboard/users");
        return { success: true };
    } catch (error) {
        console.error("Reset Password Error:", error);
        return { error: "Failed to reset password" };
    }
}

export async function toggleUserStatus(id: string, currentUserId: string) {
    try {
        await requirePermission('users', 'update');
        // Prevent self-deactivation
        if (id === currentUserId) {
            return { error: "You cannot deactivate your own account" };
        }

        const user = await prisma.user.findUnique({
            where: { id },
            include: {
                userRoles: {
                    include: {
                        role: {
                            select: {
                                name: true
                            }
                        }
                    }
                }
            }
        });

        if (!user) {
            return { error: "User not found" };
        }

        // If deactivating an admin, check if there's at least one other active admin
        const isAdminUser = user.userRoles.some((userRole) => userRole.role.name.toLowerCase() === 'super admin');
        if (user.isActive && isAdminUser) {
            const otherActiveAdmins = await getActiveAdminCount(id);
            if (otherActiveAdmins <= 0) {
                return { error: "Cannot deactivate the last active admin user" };
            }
        }

        const updatedUser = await prisma.user.update({
            where: { id },
            data: {
                isActive: !user.isActive
            }
        });

        revalidatePath("/dashboard/users");
        return { success: true, user: sanitizeUser(updatedUser) };
    } catch (error) {
        console.error("Toggle User Status Error:", error);
        return { error: "Failed to toggle user status" };
    }
}

export async function getCurrentUserId() {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.id) {
            return null;
        }
        return session.user.id as string;
    } catch (error) {
        console.error("Get Current User Error:", error);
        return null;
    }
}

export async function getOwnProfile() {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.id) return { error: "Not authenticated" };
        const user = await prisma.user.findUnique({
            where: { id: session.user.id },
            select: { id: true, name: true, email: true, role: true, createdAt: true },
        });
        if (!user) return { error: "User not found" };
        return { data: user };
    } catch (error) {
        console.error("getOwnProfile error:", error);
        return { error: "Failed to load profile" };
    }
}

export async function updateOwnProfile(data: { name?: string; currentPassword?: string; newPassword?: string }) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.id) return { error: "Not authenticated" };

        const user = await prisma.user.findUnique({ where: { id: session.user.id } });
        if (!user) return { error: "User not found" };

        const updateData: { name?: string; password?: string } = {};

        if (data.name !== undefined) {
            const trimmed = data.name.trim();
            if (!trimmed) return { error: "Name cannot be empty" };
            updateData.name = trimmed;
        }

        if (data.newPassword) {
            if (!data.currentPassword) return { error: "Current password is required" };
            const valid = await bcrypt.compare(data.currentPassword, user.password);
            if (!valid) return { error: "Current password is incorrect" };
            if (data.newPassword.length < 6) return { error: "New password must be at least 6 characters" };
            updateData.password = await bcrypt.hash(data.newPassword, 10);
        }

        if (Object.keys(updateData).length === 0) return { error: "No changes provided" };

        await prisma.user.update({ where: { id: session.user.id }, data: updateData });
        return { success: true };
    } catch (error) {
        console.error("updateOwnProfile error:", error);
        return { error: "Failed to update profile" };
    }
}

// ==================== MEMBERSHIP MODULE ====================

// Department Actions
export async function getDepartments() {
    try {
        await requirePermission('departments', 'read');
        const departments = await prisma.department.findMany({
            select: {
                id: true,
                name: true,
                description: true,
                createdAt: true,
                updatedAt: true,
                _count: {
                    select: { members: true }
                }
            },
            orderBy: { name: 'asc' }
        });
        return departments;
    } catch (error) {
        console.error("Get Departments Error:", error);
        return [];
    }
}

export async function getDepartmentById(id: string) {
    try {
        await requirePermission('departments', 'read');
        const department = await prisma.department.findUnique({
            where: { id },
            include: {
                members: {
                    include: {
                        member: true
                    }
                },
                _count: {
                    select: { members: true }
                }
            }
        });
        return department;
    } catch (error) {
        console.error("Get Department Error:", error);
        return null;
    }
}

export async function createDepartment(data: { name: string; description?: string }) {
    try {
        await requirePermission('departments', 'create');
        // Validate name
        if (!data.name || data.name.trim().length < 2) {
            return { error: "Department name must be at least 2 characters" };
        }

        // Check if department already exists
        const existing = await prisma.department.findUnique({
            where: { name: data.name.trim() }
        });

        if (existing) {
            return { error: "Department with this name already exists" };
        }

        const department = await prisma.department.create({
            data: {
                name: data.name.trim(),
                description: data.description?.trim() || null
            }
        });

        revalidatePath("/dashboard/membership");
        revalidatePath("/dashboard/settings/structure");
        return { success: true, department };
    } catch (error) {
        console.error("Create Department Error:", error);
        return { error: "Failed to create department" };
    }
}

export async function updateDepartment(id: string, data: { name?: string; description?: string }) {
    try {
        await requirePermission('departments', 'update');
        if (data.name && data.name.trim().length < 2) {
            return { error: "Department name must be at least 2 characters" };
        }

        const department = await prisma.department.update({
            where: { id },
            data: {
                name: data.name?.trim(),
                description: data.description?.trim()
            }
        });

        revalidatePath("/dashboard/membership");
        revalidatePath("/dashboard/settings/structure");
        return { success: true, department };
    } catch (error) {
        console.error("Update Department Error:", error);
        return { error: "Failed to update department" };
    }
}

export async function deleteDepartment(id: string) {
    try {
        await requirePermission('departments', 'delete');
        await prisma.department.delete({
            where: { id }
        });

        revalidatePath("/dashboard/membership");
        revalidatePath("/dashboard/settings/structure");
        return { success: true };
    } catch (error) {
        console.error("Delete Department Error:", error);
        return { error: "Failed to delete department" };
    }
}

export async function deleteDepartments(ids: string[]) {
    try {
        await requirePermission('departments', 'delete');
        await prisma.department.deleteMany({
            where: {
                id: {
                    in: ids
                }
            }
        });

        revalidatePath("/dashboard/membership");
        revalidatePath("/dashboard/settings/structure");
        return { success: true };
    } catch (error) {
        console.error("Delete Departments Error:", error);
        return { error: "Failed to delete departments" };
    }
}

// --- Home Fellowship Actions ---

export async function getHomeFellowships() {
    try {
        await requirePermission('fellowships', 'read');
        const fellowships = await prisma.homeFellowship.findMany({
            select: {
                id: true,
                name: true,
                leader: true,
                location: true,
                createdAt: true,
                updatedAt: true,
                _count: {
                    select: { members: true }
                }
            },
            orderBy: { name: 'asc' }
        });
        return fellowships;
    } catch (error) {
        console.error("Get Home Fellowships Error:", error);
        return [];
    }
}

export async function createHomeFellowship(data: { name: string; leader?: string; location?: string }) {
    try {
        await requirePermission('fellowships', 'create');
        if (!data.name || data.name.trim().length < 2) {
            return { error: "Name must be at least 2 characters" };
        }

        const existing = await prisma.homeFellowship.findUnique({
            where: { name: data.name.trim() }
        });

        if (existing) {
            return { error: "Home Fellowship with this name already exists" };
        }

        const homeFellowship = await prisma.homeFellowship.create({
            data: {
                name: data.name.trim(),
                leader: data.leader?.trim() || null,
                location: data.location?.trim() || null
            }
        });

        revalidatePath("/dashboard/membership");
        return { success: true, homeFellowship };
    } catch (error) {
        console.error("Create Home Fellowship Error:", error);
        return { error: "Failed to create Home Fellowship" };
    }
}

export async function updateHomeFellowship(id: string, data: { name?: string; leader?: string; location?: string }) {
    try {
        await requirePermission('fellowships', 'update');
        if (data.name && data.name.trim().length < 2) {
            return { error: "Name must be at least 2 characters" };
        }

        const homeFellowship = await prisma.homeFellowship.update({
            where: { id },
            data: {
                name: data.name?.trim(),
                leader: data.leader?.trim(),
                location: data.location?.trim()
            }
        });

        revalidatePath("/dashboard/membership");
        return { success: true, homeFellowship };
    } catch (error) {
        console.error("Update Home Fellowship Error:", error);
        return { error: "Failed to update Home Fellowship" };
    }
}

export async function deleteHomeFellowship(id: string) {
    try {
        await requirePermission('fellowships', 'delete');
        const fellowship = await prisma.homeFellowship.findUnique({
            where: { id },
            include: {
                _count: {
                    select: { members: true }
                }
            }
        });

        if (!fellowship) return { error: "Home Fellowship not found" };

        if (fellowship._count.members > 0) {
            return { error: "Cannot delete fellowship with assigned members" };
        }

        await prisma.homeFellowship.delete({ where: { id } });
        revalidatePath("/dashboard/membership");
        return { success: true };
    } catch (error) {
        console.error("Delete Home Fellowship Error:", error);
        return { error: "Failed to delete Home Fellowship" };
    }
}

export async function deleteHomeFellowships(ids: string[]) {
    try {
        await requirePermission('fellowships', 'delete');
        // Optional: Check for members constraint for bulk delete if strict safety is needed
        await prisma.homeFellowship.deleteMany({
            where: { id: { in: ids } }
        });
        revalidatePath("/dashboard/membership");
        revalidatePath("/dashboard/settings/structure");
        return { success: true };
    } catch (error) {
        console.error("Delete Home Fellowships Error:", error);
        return { error: "Failed to delete Home Fellowships" };
    }
}

// Member Actions

// Member Actions
export async function getMembers(filters?: {
    departmentId?: string
    fellowshipId?: string
    accountabilityGroupId?: string
    gender?: string
    status?: string
    page?: number
    limit?: number
    search?: string
}) {
    try {
        await requirePermission('members', 'read');
        const where: Record<string, unknown> = {}
        const page = filters?.page || 1
        const limit = filters?.limit || 50
        const skip = (page - 1) * limit

        if (filters?.search && filters.search.trim()) {
            where.OR = [
                { fullName: { contains: filters.search.trim(), mode: 'insensitive' } },
                { phoneNumber: { contains: filters.search.trim(), mode: 'insensitive' } },
                { estate: { contains: filters.search.trim(), mode: 'insensitive' } }
            ]
        }

        if (filters?.departmentId) {
            where.departments = {
                some: {
                    departmentId: filters.departmentId
                }
            }
        }

        if (filters?.fellowshipId) {
            where.homeFellowshipId = filters.fellowshipId
        }

        if (filters?.accountabilityGroupId) {
            where.accountabilityGroupId = filters.accountabilityGroupId
        }

        if (filters?.gender) {
            where.gender = filters.gender
        }

        if (filters?.status) {
            where.status = filters.status
        }

        // Execute count and fetch in parallel for better performance
        const [members, total] = await Promise.all([
            prisma.member.findMany({
                where,
                select: {
                    id: true,
                    fullName: true,
                    phoneNumber: true,
                    gender: true,
                    estate: true,
                    status: true,
                    dateJoined: true,
                    homeFellowshipId: true,
                    homeFellowship: {
                        select: { id: true, name: true }
                    },
                    accountabilityGroupId: true,
                    accountabilityGroup: {
                        select: { id: true, name: true }
                    },
                    departments: {
                        select: {
                            department: {
                                select: { id: true, name: true }
                            }
                        }
                    }
                },
                orderBy: { fullName: 'asc' },
                skip,
                take: limit
            }),
            prisma.member.count({ where })
        ])

        return {
            data: members,
            pagination: {
                total,
                page,
                limit,
                pages: Math.ceil(total / limit)
            }
        }
    } catch (error) {
        console.error("Get Members Error:", error)
        return { data: [], pagination: { total: 0, page: 1, limit: 50, pages: 0 } }
    }
}

export async function getMemberById(id: string) {
    try {
        await requirePermission('members', 'read');
        const member = await prisma.member.findUnique({
            where: { id },
            include: {
                homeFellowship: true,
                departments: {
                    include: {
                        department: true
                    }
                }
            }
        });
        return member;
    } catch (error) {
        console.error("Get Member Error:", error);
        return null;
    }
}

export async function createMember(data: {
    fullName: string;
    phoneNumber: string;
    gender: string;
    estate?: string;
    status?: string;
    dateJoined?: string;
    departmentIds?: string[];
    homeFellowshipId?: string;
    accountabilityGroupId?: string;
}) {
    try {
        await requirePermission('members', 'create');
        if (!data.fullName || data.fullName.trim().length < 2) {
            return { error: "Full name must be at least 2 characters" };
        }
        if (!data.phoneNumber || data.phoneNumber.trim().length < 10) {
            return { error: "Please provide a valid phone number" };
        }
        if (!data.gender || !['Male', 'Female'].includes(data.gender)) {
            return { error: "Gender must be either Male or Female" };
        }
        const validStatuses = ['Active', 'Visitor', 'Inactive'];
        const status = data.status && validStatuses.includes(data.status) ? data.status : 'Active';

        const member = await prisma.member.create({
            data: {
                fullName: data.fullName.trim(),
                phoneNumber: data.phoneNumber.trim(),
                gender: data.gender,
                estate: data.estate?.trim() || null,
                status,
                dateJoined: data.dateJoined ? new Date(data.dateJoined) : null,
                homeFellowshipId: data.homeFellowshipId || null,
                accountabilityGroupId: data.accountabilityGroupId || null,
                departments: {
                    create: (data.departmentIds || []).map(deptId => ({
                        departmentId: deptId
                    }))
                }
            }
        });

        revalidatePath("/dashboard/membership");
        return { success: true, member };
    } catch (error) {
        console.error("Create Member Error:", error);
        return { error: "Failed to create member" };
    }
}

export async function updateMember(id: string, data: {
    fullName?: string;
    phoneNumber?: string;
    gender?: string;
    estate?: string;
    status?: string;
    dateJoined?: string | null;
    departmentIds?: string[];
    homeFellowshipId?: string | null;
    accountabilityGroupId?: string | null;
}) {
    try {
        await requirePermission('members', 'update');
        if (data.fullName && data.fullName.trim().length < 2) {
            return { error: "Full name must be at least 2 characters" };
        }
        if (data.phoneNumber && data.phoneNumber.trim().length < 10) {
            return { error: "Please provide a valid phone number" };
        }
        if (data.gender && !['Male', 'Female'].includes(data.gender)) {
            return { error: "Gender must be either Male or Female" };
        }

        const updateData: Record<string, unknown> = {
            fullName: data.fullName?.trim(),
            phoneNumber: data.phoneNumber?.trim(),
            gender: data.gender,
            estate: data.estate?.trim(),
        };

        if (data.status !== undefined) {
            const validStatuses = ['Active', 'Visitor', 'Inactive'];
            if (validStatuses.includes(data.status)) updateData.status = data.status;
        }

        if (data.dateJoined !== undefined) {
            updateData.dateJoined = data.dateJoined ? new Date(data.dateJoined) : null;
        }

        if (data.homeFellowshipId !== undefined) {
            updateData.homeFellowshipId = data.homeFellowshipId;
        }

        if (data.accountabilityGroupId !== undefined) {
            updateData.accountabilityGroupId = data.accountabilityGroupId;
        }

        if (data.departmentIds !== undefined) {
            updateData.departments = {
                deleteMany: {},
                create: data.departmentIds.map(deptId => ({
                    departmentId: deptId
                }))
            };
        }

        const member = await prisma.member.update({
            where: { id },
            data: updateData
        });

        revalidatePath("/dashboard/membership");
        return { success: true, member };
    } catch (error) {
        console.error("Update Member Error:", error);
        return { error: "Failed to update member" };
    }
}

export async function deleteMember(id: string) {
    try {
        await requirePermission('members', 'delete');
        await prisma.member.delete({
            where: { id }
        });

        revalidatePath("/dashboard/membership");
        return { success: true };
    } catch (error) {
        console.error("Delete Member Error:", error);
        return { error: "Failed to delete member" };
    }
}

export async function getMembersForExport(filters?: {
    departmentId?: string;
    fellowshipId?: string;
    gender?: string;
}) {
    try {
        await requirePermission('members', 'read');
        const where: Record<string, unknown> = {};

        if (filters?.departmentId) {
            where.departments = { some: { departmentId: filters.departmentId } };
        }
        if (filters?.fellowshipId) {
            where.homeFellowshipId = filters.fellowshipId;
        }
        if (filters?.gender) {
            where.gender = filters.gender;
        }

        const members = await prisma.member.findMany({
            where,
            select: {
                id: true,
                fullName: true,
                phoneNumber: true,
                gender: true,
                estate: true,
                status: true,
                dateJoined: true,
                homeFellowship: { select: { name: true } },
                accountabilityGroup: { select: { name: true } },
                departments: { select: { department: { select: { name: true } } } },
            },
            orderBy: { fullName: 'asc' },
        });
        return { data: members };
    } catch (error) {
        console.error("getMembersForExport error:", error);
        return { error: "Failed to fetch members" };
    }
}

export async function getMembersWithoutPhone() {
    try {
        await requirePermission('members', 'read');
        const members = await prisma.member.findMany({
            where: {
                phoneNumber: "",
            },
            select: {
                id: true,
                fullName: true,
                phoneNumber: true,
                gender: true,
                estate: true,
                homeFellowship: { select: { name: true } },
                departments: { select: { department: { select: { name: true } } } },
            },
            orderBy: { fullName: "asc" },
        });
        return { data: members };
    } catch (error) {
        console.error("getMembersWithoutPhone error:", error);
        return { error: "Failed to fetch members" };
    }
}

export async function bulkUpdateMembers(
    ids: string[],
    update: {
        type: "gender" | "fellowship" | "department" | "accountabilityGroup" | "status";
        value: string;
        mode?: "add" | "replace"; // only relevant for department
    }
): Promise<{ success?: boolean; count?: number; error?: string }> {
    try {
        await requirePermission("members", "update");
        if (!ids.length) return { error: "No members selected" };

        if (update.type === "gender") {
            if (!["Male", "Female"].includes(update.value))
                return { error: "Invalid gender value" };
            await prisma.member.updateMany({
                where: { id: { in: ids } },
                data: { gender: update.value },
            });

        } else if (update.type === "status") {
            if (!["Active", "Visitor", "Inactive"].includes(update.value))
                return { error: "Invalid status value" };
            await prisma.member.updateMany({
                where: { id: { in: ids } },
                data: { status: update.value },
            });

        } else if (update.type === "fellowship") {
            await prisma.member.updateMany({
                where: { id: { in: ids } },
                data: { homeFellowshipId: update.value || null },
            });

        } else if (update.type === "accountabilityGroup") {
            await prisma.member.updateMany({
                where: { id: { in: ids } },
                data: { accountabilityGroupId: update.value || null },
            });

        } else if (update.type === "department") {
            const dept = await prisma.department.findUnique({ where: { id: update.value } });
            if (!dept) return { error: "Department not found" };

            if (update.mode === "replace") {
                await prisma.memberDepartment.deleteMany({ where: { memberId: { in: ids } } });
            }
            await prisma.memberDepartment.createMany({
                data: ids.map(memberId => ({ memberId, departmentId: update.value })),
                skipDuplicates: true,
            });
        } else {
            return { error: "Unknown update type" };
        }

        revalidatePath("/dashboard/membership");
        return { success: true, count: ids.length };
    } catch (error) {
        console.error("bulkUpdateMembers error:", error);
        return { error: "Bulk update failed" };
    }
}

export async function deleteMembers(ids: string[]) {
    try {
        await requirePermission('members', 'delete');
        await prisma.member.deleteMany({
            where: {
                id: { in: ids }
            }
        });

        revalidatePath("/dashboard/membership");
        return { success: true };
    } catch (error) {
        console.error("Delete Members Error:", error);
        return { error: "Failed to delete members" };
    }
}

export async function importMembers(data: {
    fullName: string;
    phoneNumber: string;
    gender: string;
    estate?: string;
    fellowshipName?: string;
    departmentNames?: string; // Comma separated
}[]) {
    try {
        await requirePermission('members', 'manage');
        // 1. Pre-fetch all needed data for mapping
        const [departments, fellowships] = await Promise.all([
            prisma.department.findMany(),
            prisma.homeFellowship.findMany()
        ]);

        const deptMap = new Map(departments.map(d => [d.name.toLowerCase().trim(), d.id]));
        const fellowshipMap = new Map(fellowships.map(f => [f.name.toLowerCase().trim(), f.id]));

        // 2. Process members
        let successCount = 0;
        let skipCount = 0;

        for (const row of data) {
            if (!row.fullName || !row.phoneNumber || !row.gender) {
                skipCount++;
                continue;
            }

            const hfId = row.fellowshipName ? fellowshipMap.get(row.fellowshipName.toLowerCase().trim()) : null;
            const deptNames = row.departmentNames ? row.departmentNames.split(',').map(n => n.trim().toLowerCase()) : [];
            const deptIds = deptNames.map(name => deptMap.get(name)).filter(Boolean) as string[];

            await prisma.member.create({
                data: {
                    fullName: row.fullName.trim(),
                    phoneNumber: row.phoneNumber.toString().trim(),
                    gender: row.gender.trim(),
                    estate: row.estate?.trim() || null,
                    homeFellowshipId: hfId || null,
                    departments: {
                        create: deptIds.map(deptId => ({
                            departmentId: deptId
                        }))
                    }
                }
            });
            successCount++;
        }

        revalidatePath("/dashboard/membership");
        return { success: true, count: successCount, skipped: skipCount };
    } catch (error) {
        console.error("Import Members Error:", error);
        return { error: "Failed to import members" };
    }
}

// --- Accountability Group Actions ---

export async function getAccountabilityGroups() {
    try {
        await requirePermission('members', 'read');
        const groups = await prisma.accountabilityGroup.findMany({
            select: {
                id: true,
                name: true,
                description: true,
                createdAt: true,
                updatedAt: true,
                leaders: {
                    select: {
                        member: { select: { id: true, fullName: true, phoneNumber: true } }
                    }
                },
                _count: { select: { members: true } }
            },
            orderBy: { name: 'asc' }
        });
        return groups;
    } catch (error) {
        console.error("Get Accountability Groups Error:", error);
        return [];
    }
}

export async function createAccountabilityGroup(data: { name: string; leaderIds?: string[]; description?: string }) {
    try {
        await requirePermission('members', 'create');
        if (!data.name || data.name.trim().length < 2) {
            return { error: "Name must be at least 2 characters" };
        }
        const existing = await prisma.accountabilityGroup.findUnique({ where: { name: data.name.trim() } });
        if (existing) return { error: "A group with this name already exists" };

        const group = await prisma.accountabilityGroup.create({
            data: {
                name: data.name.trim(),
                description: data.description?.trim() || null,
                leaders: data.leaderIds?.length
                    ? { create: data.leaderIds.map(memberId => ({ memberId })) }
                    : undefined,
            }
        });
        revalidatePath("/dashboard/membership");
        return { success: true, group };
    } catch (error) {
        console.error("Create Accountability Group Error:", error);
        return { error: "Failed to create accountability group" };
    }
}

export async function updateAccountabilityGroup(id: string, data: { name?: string; leaderIds?: string[]; description?: string }) {
    try {
        await requirePermission('members', 'update');
        if (data.name && data.name.trim().length < 2) {
            return { error: "Name must be at least 2 characters" };
        }
        const group = await prisma.accountabilityGroup.update({
            where: { id },
            data: {
                name: data.name?.trim(),
                description: data.description?.trim() ?? undefined,
                // Replace all leaders when leaderIds is provided
                ...(data.leaderIds !== undefined && {
                    leaders: {
                        deleteMany: {},
                        create: data.leaderIds.map(memberId => ({ memberId })),
                    }
                }),
            }
        });
        revalidatePath("/dashboard/membership");
        return { success: true, group };
    } catch (error) {
        console.error("Update Accountability Group Error:", error);
        return { error: "Failed to update accountability group" };
    }
}

export async function deleteAccountabilityGroup(id: string) {
    try {
        await requirePermission('members', 'delete');
        const group = await prisma.accountabilityGroup.findUnique({
            where: { id },
            include: { _count: { select: { members: true } } }
        });
        if (!group) return { error: "Group not found" };
        if (group._count.members > 0) {
            return { error: `Cannot delete: ${group._count.members} member(s) are assigned to this group` };
        }
        await prisma.accountabilityGroup.delete({ where: { id } });
        revalidatePath("/dashboard/membership");
        return { success: true };
    } catch (error) {
        console.error("Delete Accountability Group Error:", error);
        return { error: "Failed to delete accountability group" };
    }
}

// ==================== ATTENDANCE MODULE ====================

// --- Attendance Sessions ---

export async function getAttendanceSessions() {
    try {
        await requirePermission('attendance', 'read');
        const sessions = await prisma.attendanceSession.findMany({
            orderBy: { date: 'desc' },
            include: {
                _count: {
                    select: { records: true }
                }
            }
        });
        return sessions;
    } catch (error) {
        console.error("Get Attendance Sessions Error:", error);
        return [];
    }
}

export async function getAttendanceSessionById(id: string) {
    try {
        await requirePermission('attendance', 'read');
        const session = await prisma.attendanceSession.findUnique({
            where: { id },
            include: {
                records: {
                    include: {
                        member: true
                    },
                    orderBy: {
                        member: { fullName: 'asc' }
                    }
                }
            }
        });
        return session;
    } catch (error) {
        console.error("Get Attendance Session Error:", error);
        return null;
    }
}

export async function createAttendanceSession(data: {
    date: Date;
    type: 'SUNDAY_SERVICE' | 'MIDWEEK_SERVICE' | 'EVENT' | 'OTHER';
    description?: string;
}) {
    try {
        await requirePermission('attendance', 'create');
        const session = await prisma.attendanceSession.create({
            data: {
                date: data.date,
                type: data.type,
                description: data.description || null,
                status: 'DRAFT'
            }
        });

        revalidatePath("/dashboard/attendance");
        return { success: true, session };
    } catch (error) {
        console.error("Create Attendance Session Error:", error);
        return { error: "Failed to create attendance session" };
    }
}

export async function updateAttendanceSession(id: string, data: {
    date?: Date;
    type?: 'SUNDAY_SERVICE' | 'MIDWEEK_SERVICE' | 'EVENT' | 'OTHER';
    description?: string;
    status?: 'DRAFT' | 'SUBMITTED';
}) {
    try {
        await requirePermission('attendance', 'update');
        const session = await prisma.attendanceSession.update({
            where: { id },
            data: {
                date: data.date,
                type: data.type,
                description: data.description,
                status: data.status
            }
        });

        revalidatePath("/dashboard/attendance");
        return { success: true, session };
    } catch (error) {
        console.error("Update Attendance Session Error:", error);
        return { error: "Failed to update attendance session" };
    }
}

export async function deleteAttendanceSession(id: string) {
    try {
        await requirePermission('attendance', 'delete');
        await prisma.attendanceSession.delete({
            where: { id }
        });
        revalidatePath("/dashboard/attendance");
        return { success: true };
    } catch (error) {
        console.error("Delete Attendance Session Error:", error);
        return { error: "Failed to delete attendance session" };
    }
}

// --- Attendance Records ---

export async function upsertAttendanceRecords(sessionId: string, records: { memberId: string; status: 'PRESENT' | 'ABSENT' | 'EXCUSED'; notes?: string }[]) {
    try {
        await requirePermission('attendance', 'update');
        // Use transaction for bulk operations
        await prisma.$transaction(
            records.map(record =>
                prisma.attendanceRecord.upsert({
                    where: {
                        sessionId_memberId: {
                            sessionId,
                            memberId: record.memberId
                        }
                    },
                    update: {
                        status: record.status,
                        notes: record.notes
                    },
                    create: {
                        sessionId,
                        memberId: record.memberId,
                        status: record.status,
                        notes: record.notes
                    }
                })
            )
        );

        revalidatePath(`/dashboard/attendance/${sessionId}`);
        return { success: true };
    } catch (error) {
        console.error("Upsert Attendance Records Error:", error);
        return { error: "Failed to save attendance records" };
    }
}

// --- Analytics ---

export async function getAttendanceAnalytics() {
    try {
        await requirePermission('attendance', 'read');
        // 1. Recent Trends (Last 12 weeks of Sunday Services)
        const recentSessions = await prisma.attendanceSession.findMany({
            where: {
                type: 'SUNDAY_SERVICE',
                status: 'SUBMITTED' // Only count submitted sessions
            },
            orderBy: { date: 'desc' },
            take: 12,
            include: {
                records: {
                    where: { status: 'PRESENT' }
                }
            }
        });

        const trends = recentSessions.map(session => ({
            date: session.date.toISOString().split('T')[0],
            count: session.records.length
        })).reverse();

        // 2. Watchlist (Absent for last 2 consecutive Sunday sessions)
        // Get last 2 submitted Sunday sessions
        const lastTwoSessions = await prisma.attendanceSession.findMany({
            where: {
                type: 'SUNDAY_SERVICE',
                status: 'SUBMITTED'
            },
            orderBy: { date: 'desc' },
            take: 2,
            select: { id: true }
        });

        let watchlist: Array<Record<string, unknown>> = [];

        if (lastTwoSessions.length === 2) {
            const sessionIds = lastTwoSessions.map(s => s.id);

            // Find members who have ABSENT records for BOTH sessions
            // OR members who have NO records (implicitly absent if not in list? No, explicitly recorded as absent usually)
            // Let's assume we mark everyone. So check for explicit ABSENT.

            const absenteeRecords = await prisma.attendanceRecord.findMany({
                where: {
                    sessionId: { in: sessionIds },
                    status: 'ABSENT'
                },
                select: { memberId: true }
            });

            // Count absences per member
            const memberAbsenceCount = new Map<string, number>();
            absenteeRecords.forEach(r => {
                memberAbsenceCount.set(r.memberId, (memberAbsenceCount.get(r.memberId) || 0) + 1);
            });

            // Filter for members with 2 absences
            const watchlistMemberIds = Array.from(memberAbsenceCount.entries())
                .filter(([, count]) => count === 2)
                .map(([id]) => id);

            if (watchlistMemberIds.length > 0) {
                watchlist = await prisma.member.findMany({
                    where: { id: { in: watchlistMemberIds } },
                    include: {
                        homeFellowship: true
                    }
                });
            }
        }

        // 3. Stats for Cards (Latest Session)
        const stats = {
            present: 0,
            absent: 0,
            watchlist: watchlist.length
        };

        if (recentSessions.length > 0) {
            const latestSession = recentSessions[0];
            // We need to fetch full stats for this session to get absent count correctly
            // Or just check records. content of recentSessions includes records where status=PRESENT
            // We need to know TOTAL records to know absent?
            // "Absent" usually means 'Total Members' - 'Present'.
            // But we only have 'records' where status='PRESENT' in the query above.

            // Let's refetch the latest session fully to be accurate
            const latestSessionFull = await prisma.attendanceSession.findUnique({
                where: { id: latestSession.id },
                include: {
                    records: true
                }
            });

            if (latestSessionFull) {
                stats.present = latestSessionFull.records.filter(r => r.status === 'PRESENT').length;
                stats.absent = latestSessionFull.records.filter(r => r.status === 'ABSENT').length;
            }
        }

        return { trends, watchlist, stats };

    } catch (error) {
        console.error("Get Attendance Analytics Error:", error);
        return { trends: [], watchlist: [], stats: { present: 0, absent: 0, watchlist: 0 } };
    }
}
