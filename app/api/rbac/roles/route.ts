import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { hasPermission } from "@/lib/rbac";
import prisma from "@/lib/db";

// GET /api/rbac/roles - Get all roles
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const hasAccess = await hasPermission('rbac', 'manage');
    if (!hasAccess) {
      return NextResponse.json({ error: "Insufficient permissions" }, { status: 403 });
    }

    const roles = await prisma.role.findMany({
      include: {
        rolePermissions: {
          include: {
            permission: true
          }
        },
        _count: {
          select: {
            userRoles: true
          }
        }
      },
      orderBy: { name: 'asc' }
    });

    return NextResponse.json(roles);
  } catch (error) {
    console.error('Error fetching roles:', error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// POST /api/rbac/roles - Create a new role
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const hasAccess = await hasPermission('rbac', 'manage');
    if (!hasAccess) {
      return NextResponse.json({ error: "Insufficient permissions" }, { status: 403 });
    }

    const { name, description, permissionIds } = await request.json();

    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      return NextResponse.json({ error: "Role name is required" }, { status: 400 });
    }

    // Check if role already exists
    const existingRole = await prisma.role.findUnique({
      where: { name: name.trim() }
    });

    if (existingRole) {
      return NextResponse.json({ error: "Role with this name already exists" }, { status: 400 });
    }

    // Create the role
    const role = await prisma.role.create({
      data: {
        name: name.trim(),
        description: description?.trim() || null,
        isSystem: false
      }
    });

    // Assign permissions if provided
    if (permissionIds && Array.isArray(permissionIds) && permissionIds.length > 0) {
      await prisma.rolePermission.createMany({
        data: permissionIds.map((permissionId: string) => ({
          roleId: role.id,
          permissionId
        })),
        skipDuplicates: true
      });
    }

    return NextResponse.json(role, { status: 201 });
  } catch (error) {
    console.error('Error creating role:', error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}