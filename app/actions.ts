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
            // @ts-expect-error - CreateMany input type issue with Relations, but valid in Prisma
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

export async function editCategory(id: string, newName: string) {
    try {
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
        return { success: true };
    } catch (_error) {
        return { error: "Failed to edit category" };
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
}) {
    try {
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
                rawMessage: data.rawMessage
            }
        });

        revalidatePath("/dashboard");
        return { success: true };
    } catch (error) {
        console.error("Update Transaction Error:", error);
        return { error: "Failed to update transaction" };
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

// --- User Management ---

import bcrypt from 'bcryptjs';

// Helper to sanitize user data (remove password)
function sanitizeUser(user: any) {
    const { password, passwordResetToken, passwordResetExpiry, ...sanitized } = user;
    return sanitized;
}

export async function getUsers() {
    try {
        const users = await prisma.user.findMany({
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
        const user = await prisma.user.findUnique({
            where: { id }
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
    role?: string;
    isActive?: boolean;
}) {
    try {
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
                role: data.role || 'ADMIN',
                isActive: data.isActive !== undefined ? data.isActive : true,
            }
        });

        revalidatePath("/dashboard/users");
        return { success: true, user: sanitizeUser(user) };
    } catch (error) {
        console.error("Create User Error:", error);
        return { error: "Failed to create user" };
    }
}

export async function updateUser(id: string, data: {
    name?: string;
    role?: string;
    isActive?: boolean;
}) {
    try {
        const user = await prisma.user.update({
            where: { id },
            data: {
                name: data.name,
                role: data.role,
                isActive: data.isActive,
            }
        });

        revalidatePath("/dashboard/users");
        return { success: true, user: sanitizeUser(user) };
    } catch (error) {
        console.error("Update User Error:", error);
        return { error: "Failed to update user" };
    }
}

export async function deleteUser(id: string, currentUserId: string) {
    try {
        // Prevent self-deletion
        if (id === currentUserId) {
            return { error: "You cannot delete your own account" };
        }

        // Check if this is the last admin
        const adminCount = await prisma.user.count({
            where: { role: 'ADMIN', isActive: true }
        });

        const userToDelete = await prisma.user.findUnique({
            where: { id }
        });

        if (userToDelete?.role === 'ADMIN' && adminCount <= 1) {
            return { error: "Cannot delete the last active admin user" };
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
        // Prevent self-deactivation
        if (id === currentUserId) {
            return { error: "You cannot deactivate your own account" };
        }

        const user = await prisma.user.findUnique({
            where: { id }
        });

        if (!user) {
            return { error: "User not found" };
        }

        // If deactivating an admin, check if there's at least one other active admin
        if (user.isActive && user.role === 'ADMIN') {
            const activeAdminCount = await prisma.user.count({
                where: { role: 'ADMIN', isActive: true }
            });

            if (activeAdminCount <= 1) {
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

// Get current user from session (placeholder - you'll need to implement proper session management)
export async function getCurrentUserId() {
    // TODO: Implement proper session management
    // For now, return the first admin user
    try {
        const user = await prisma.user.findFirst({
            where: { role: 'ADMIN' }
        });
        return user?.id || null;
    } catch (error) {
        console.error("Get Current User Error:", error);
        return null;
    }
}

// ==================== MEMBERSHIP MODULE ====================

// Department Actions
export async function getDepartments() {
    try {
        const departments = await prisma.department.findMany({
            include: {
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
        return { success: true, department };
    } catch (error) {
        console.error("Create Department Error:", error);
        return { error: "Failed to create department" };
    }
}

export async function updateDepartment(id: string, data: { name?: string; description?: string }) {
    try {
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
        return { success: true, department };
    } catch (error) {
        console.error("Update Department Error:", error);
        return { error: "Failed to update department" };
    }
}

// --- Home Fellowship Actions ---

export async function getHomeFellowships() {
    try {
        const fellowships = await prisma.homeFellowship.findMany({
            include: {
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
        // Optional: Check for members constraint for bulk delete if strict safety is needed
        await prisma.homeFellowship.deleteMany({
            where: { id: { in: ids } }
        });
        revalidatePath("/dashboard/membership");
        return { success: true };
    } catch (error) {
        console.error("Delete Home Fellowships Error:", error);
        return { error: "Failed to delete Home Fellowships" };
    }
}

// Member Actions

// Member Actions
export async function getMembers(filters?: { departmentId?: string; gender?: string }) {
    try {
        const where: any = {};

        if (filters?.departmentId) {
            where.departments = {
                some: {
                    departmentId: filters.departmentId
                }
            };
        }

        if (filters?.gender) {
            where.gender = filters.gender;
        }

        const members = await prisma.member.findMany({
            where,
            include: {
                homeFellowship: true,
                departments: {
                    include: {
                        department: true
                    }
                }
            },
            orderBy: { fullName: 'asc' }
        });

        return members;
    } catch (error) {
        console.error("Get Members Error:", error);
        return [];
    }
}

export async function getMemberById(id: string) {
    try {
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
    departmentIds?: string[];
    homeFellowshipId?: string;
}) {
    try {
        // Validate full name
        if (!data.fullName || data.fullName.trim().length < 2) {
            return { error: "Full name must be at least 2 characters" };
        }

        // Validate phone number (basic validation)
        if (!data.phoneNumber || data.phoneNumber.trim().length < 10) {
            return { error: "Please provide a valid phone number" };
        }

        // Validate gender
        if (!data.gender || !['Male', 'Female'].includes(data.gender)) {
            return { error: "Gender must be either Male or Female" };
        }

        const member = await prisma.member.create({
            data: {
                fullName: data.fullName.trim(),
                phoneNumber: data.phoneNumber.trim(),
                gender: data.gender,
                homeFellowshipId: data.homeFellowshipId || null,
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
    departmentIds?: string[];
    homeFellowshipId?: string | null;
}) {
    try {
        if (data.fullName && data.fullName.trim().length < 2) {
            return { error: "Full name must be at least 2 characters" };
        }

        if (data.phoneNumber && data.phoneNumber.trim().length < 10) {
            return { error: "Please provide a valid phone number" };
        }

        if (data.gender && !['Male', 'Female'].includes(data.gender)) {
            return { error: "Gender must be either Male or Female" };
        }

        const updateData: any = {
            fullName: data.fullName?.trim(),
            phoneNumber: data.phoneNumber?.trim(),
            gender: data.gender,
        };

        if (data.homeFellowshipId !== undefined) {
            updateData.homeFellowshipId = data.homeFellowshipId;
        }

        if (data.departmentIds !== undefined) {
            // Delete existing relationships and create new ones
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

export async function deleteMembers(ids: string[]) {
    try {
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

// ==================== ATTENDANCE MODULE ====================

// --- Attendance Sessions ---

export async function getAttendanceSessions() {
    try {
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

        let watchlist: any[] = [];

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
                .filter(([_, count]) => count === 2)
                .map(([id, _]) => id);

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
        let stats = {
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
