import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function seedRBAC() {
    console.log('Seeding RBAC system...')

    // Create admin user first
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
    console.log('Created admin user:', user.email)

    // Define system permissions
    const permissions = [
        // User Management
        { name: 'users:read', resource: 'users', action: 'read', description: 'View users' },
        { name: 'users:create', resource: 'users', action: 'create', description: 'Create users' },
        { name: 'users:update', resource: 'users', action: 'update', description: 'Update users' },
        { name: 'users:delete', resource: 'users', action: 'delete', description: 'Delete users' },
        { name: 'users:manage', resource: 'users', action: 'manage', description: 'Full user management' },

        // Member Management
        { name: 'members:read', resource: 'members', action: 'read', description: 'View members' },
        { name: 'members:create', resource: 'members', action: 'create', description: 'Create members' },
        { name: 'members:update', resource: 'members', action: 'update', description: 'Update members' },
        { name: 'members:delete', resource: 'members', action: 'delete', description: 'Delete members' },
        { name: 'members:manage', resource: 'members', action: 'manage', description: 'Full member management' },

        // Finance/Transactions
        { name: 'transactions:read', resource: 'transactions', action: 'read', description: 'View transactions' },
        { name: 'transactions:create', resource: 'transactions', action: 'create', description: 'Create transactions' },
        { name: 'transactions:update', resource: 'transactions', action: 'update', description: 'Update transactions' },
        { name: 'transactions:delete', resource: 'transactions', action: 'delete', description: 'Delete transactions' },
        { name: 'transactions:manage', resource: 'transactions', action: 'manage', description: 'Full transaction management' },

        // Categories
        { name: 'categories:read', resource: 'categories', action: 'read', description: 'View categories' },
        { name: 'categories:create', resource: 'categories', action: 'create', description: 'Create categories' },
        { name: 'categories:update', resource: 'categories', action: 'update', description: 'Update categories' },
        { name: 'categories:delete', resource: 'categories', action: 'delete', description: 'Delete categories' },
        { name: 'categories:manage', resource: 'categories', action: 'manage', description: 'Full category management' },

        // Attendance
        { name: 'attendance:read', resource: 'attendance', action: 'read', description: 'View attendance records' },
        { name: 'attendance:create', resource: 'attendance', action: 'create', description: 'Mark attendance' },
        { name: 'attendance:update', resource: 'attendance', action: 'update', description: 'Update attendance' },
        { name: 'attendance:delete', resource: 'attendance', action: 'delete', description: 'Delete attendance records' },
        { name: 'attendance:manage', resource: 'attendance', action: 'manage', description: 'Full attendance management' },

        // Departments & Fellowships
        { name: 'departments:read', resource: 'departments', action: 'read', description: 'View departments' },
        { name: 'departments:create', resource: 'departments', action: 'create', description: 'Create departments' },
        { name: 'departments:update', resource: 'departments', action: 'update', description: 'Update departments' },
        { name: 'departments:delete', resource: 'departments', action: 'delete', description: 'Delete departments' },
        { name: 'departments:manage', resource: 'departments', action: 'manage', description: 'Full department management' },

        { name: 'fellowships:read', resource: 'fellowships', action: 'read', description: 'View fellowships' },
        { name: 'fellowships:create', resource: 'fellowships', action: 'create', description: 'Create fellowships' },
        { name: 'fellowships:update', resource: 'fellowships', action: 'update', description: 'Update fellowships' },
        { name: 'fellowships:delete', resource: 'fellowships', action: 'delete', description: 'Delete fellowships' },
        { name: 'fellowships:manage', resource: 'fellowships', action: 'manage', description: 'Full fellowship management' },

        // Settings & Organization
        { name: 'settings:read', resource: 'settings', action: 'read', description: 'View settings' },
        { name: 'settings:update', resource: 'settings', action: 'update', description: 'Update settings' },
        { name: 'settings:manage', resource: 'settings', action: 'manage', description: 'Full settings management' },

        // Reports & Analytics
        { name: 'reports:read', resource: 'reports', action: 'read', description: 'View reports and analytics' },
        { name: 'reports:export', resource: 'reports', action: 'export', description: 'Export reports' },

        // System Administration
        { name: 'system:manage', resource: 'system', action: 'manage', description: 'System administration' },
        { name: 'rbac:manage', resource: 'rbac', action: 'manage', description: 'Manage roles and permissions' },

        // SMS
        { name: 'sms:read', resource: 'sms', action: 'read', description: 'View SMS dashboard, history, and templates' },
        { name: 'sms:create', resource: 'sms', action: 'create', description: 'Send SMS campaigns' },
        { name: 'sms:manage', resource: 'sms', action: 'manage', description: 'Full SMS management including templates' },

        // Meeting Minutes
        { name: 'minutes:read', resource: 'minutes', action: 'read', description: 'View meeting minutes and download PDFs' },
        { name: 'minutes:create', resource: 'minutes', action: 'create', description: 'Upload meeting minutes' },
        { name: 'minutes:delete', resource: 'minutes', action: 'delete', description: 'Delete meeting minutes' },
    ]

    // Create permissions
    const createdPermissions: Array<Record<string, unknown>> = []
    for (const perm of permissions) {
        const permission = await prisma.permission.upsert({
            where: { name: perm.name },
            update: {},
            create: { ...perm, isSystem: true },
        })
        createdPermissions.push(permission)
    }
    console.log(`Created ${createdPermissions.length} permissions`)

    // Define roles
    const roles = [
        {
            name: 'Super Admin',
            description: 'Full system access',
            isSystem: true,
            permissions: createdPermissions.map(p => p.name) // All permissions
        },
        {
            name: 'Admin',
            description: 'Administrative access with most permissions',
            isSystem: true,
            permissions: [
                'users:read', 'users:create', 'users:update', 'users:delete',
                'members:manage', 'transactions:manage', 'categories:manage',
                'attendance:manage', 'departments:manage', 'fellowships:manage',
                'settings:manage', 'reports:read', 'reports:export',
                'sms:manage',
                'minutes:read', 'minutes:create', 'minutes:delete',
            ]
        },
        {
            name: 'Finance Manager',
            description: 'Manage financial transactions and categories',
            isSystem: false,
            permissions: [
                'transactions:manage', 'categories:manage', 'reports:read', 'reports:export'
            ]
        },
        {
            name: 'Membership Coordinator',
            description: 'Manage members, departments, and fellowships',
            isSystem: false,
            permissions: [
                'members:manage', 'departments:manage', 'fellowships:manage',
                'attendance:manage', 'reports:read'
            ]
        },
        {
            name: 'Attendance Clerk',
            description: 'Mark and manage attendance records',
            isSystem: false,
            permissions: [
                'attendance:manage', 'members:read', 'reports:read'
            ]
        },
        {
            name: 'Viewer',
            description: 'Read-only access to most modules',
            isSystem: false,
            permissions: [
                'users:read', 'members:read', 'transactions:read', 'categories:read',
                'attendance:read', 'departments:read', 'fellowships:read',
                'settings:read', 'reports:read', 'sms:read', 'minutes:read'
            ]
        }
    ]

    // Create roles and assign permissions
    for (const roleData of roles) {
        const role = await prisma.role.upsert({
            where: { name: roleData.name },
            update: {},
            create: {
                name: roleData.name,
                description: roleData.description,
                isSystem: roleData.isSystem,
            },
        })

        // Assign permissions to role
        const rolePermissions: { roleId: string; permissionId: string }[] = roleData.permissions
            .map(permName => {
                const permission = createdPermissions.find(p => p.name === permName)
                return permission ? { roleId: role.id, permissionId: permission.id } : null
            })
            .filter((item): item is { roleId: string; permissionId: string } => item !== null)

        if (rolePermissions.length > 0) {
            await prisma.rolePermission.createMany({
                data: rolePermissions,
                skipDuplicates: true,
            })
        }

        console.log(`Created role: ${role.name} with ${rolePermissions.length} permissions`)
    }

    // Assign Super Admin role to the admin user
    const superAdminRole = await prisma.role.findUnique({
        where: { name: 'Super Admin' }
    })

    if (superAdminRole) {
        await prisma.userRole.upsert({
            where: {
                userId_roleId: {
                    userId: user.id,
                    roleId: superAdminRole.id
                }
            },
            update: {},
            create: {
                userId: user.id,
                roleId: superAdminRole.id
            },
        })
        console.log('Assigned Super Admin role to admin user')
    }
}

async function main() {
    console.log('Start seeding ...')

    // 1. Create RBAC System - Roles, Permissions, and Admin User
    await seedRBAC()

    console.log('Seeding completed successfully')
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
