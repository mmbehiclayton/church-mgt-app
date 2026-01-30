"use server";

import prisma from "@/lib/db";
import { revalidatePath } from "next/cache";
import { parse, isValid } from "date-fns";

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
            // @ts-ignore - CreateMany input type issue with Relations, but valid in Prisma
            data: validTransactions,
            skipDuplicates: true
        });

        revalidatePath("/dashboard");
        return { success: true, count: result.count };
    } catch (error) {
        console.error("Import Error:", error);
        return { error: "Failed to import transactions" };
    }
}

// --- Categories ---

export async function getCategories() {
    return await prisma.category.findMany({
        orderBy: { createdAt: "desc" }
    });
}

export async function createCategory(name: string) {
    try {
        const existing = await prisma.category.findUnique({
            where: { name }
        });

        if (existing) return { error: "Category already exists" };

        await prisma.category.create({
            data: { name }
        });

        revalidatePath("/dashboard");
        return { success: true };
    } catch (_error) {
        return { error: "Failed to create category" };
    }
}

export async function deleteCategory(id: string) {
    try {
        // Check for transactions first
        const count = await prisma.transaction.count({
            where: { categoryId: id }
        });

        if (count > 0) {
            return { error: "Cannot delete category with existing transactions" };
        }

        await prisma.category.delete({
            where: { id }
        });

        revalidatePath("/dashboard");
        return { success: true };
    } catch (_error) {
        return { error: "Failed to delete category" };
    }
}

// --- Transactions ---

export async function deleteTransactions(ids: string[]) {
    try {
        await prisma.transaction.deleteMany({
            where: { id: { in: ids } }
        });
        revalidatePath("/dashboard");
        return { success: true };
    } catch (error) {
        console.error("Delete Transactions Error:", error);
        return { error: "Failed to delete transactions" };
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
}) {
    try {
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
                rawMessage: data.rawMessage
            }
        });

        revalidatePath("/dashboard");
        return { success: true };
    } catch (error) {
        console.error("Save Transaction Error:", error);
        return { error: "Failed to save transaction" };
    }
}

export async function getTransactions(filter?: { categoryIds?: string[], startDate?: Date, endDate?: Date }) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const where: any = {};

    if (filter?.categoryIds && filter.categoryIds.length > 0) {
        where.categoryId = { in: filter.categoryIds };
    }

    if (filter?.startDate || filter?.endDate) {
        where.transactionDate = {};
        if (filter.startDate) where.transactionDate.gte = filter.startDate;
        if (filter.endDate) where.transactionDate.lte = filter.endDate;
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
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const where: any = {};

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

    // 1. Aggregates
    const totalAmount = await prisma.transaction.aggregate({
        where,
        _sum: { amount: true },
        _count: { id: true },
        _avg: { amount: true }
    });

    // 2. Category Breakdown
    const byCategory = await prisma.transaction.groupBy({
        by: ['categoryId'],
        where,
        _sum: { amount: true },
        orderBy: {
            _sum: { amount: 'desc' }
        }
    });

    // Optimized: Fetch all categories at once to avoid N+1 queries
    const categories = await prisma.category.findMany();
    const categoryMap = new Map(categories.map(c => [c.id, c.name]));

    const enrichedByCategory = byCategory.map((item: { categoryId: string; _sum: { amount: number | null } }) => ({
        name: categoryMap.get(item.categoryId) || "Unknown",
        amount: item._sum.amount || 0
    }));

    // 3. Trend (Group by Date)
    const trendDataRaw = await prisma.transaction.findMany({
        where,
        select: {
            transactionDate: true,
            amount: true
        },
        orderBy: { transactionDate: 'asc' }
    });

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

// --- Organization Settings ---

export async function getOrganization() {
    try {
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
        console.error("Get Organization Error:", error);
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
