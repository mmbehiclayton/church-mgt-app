import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { hasPermission } from "@/lib/rbac";
import prisma from "@/lib/db";

// GET /api/rbac/users/[id]/roles - Get user roles
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const hasAccess = await hasPermission('rbac', 'manage');
    if (!hasAccess) {
      return NextResponse.json({ error: "Insufficient permissions" }, { status: 403 });
    }

    const { id: userId } = await params;

    const userRoles = await prisma.userRole.findMany({
      where: { userId },
      include: {
        role: {
          select: {
            id: true,
            name: true,
            description: true
          }
        }
      }
    });

    return NextResponse.json(userRoles);
  } catch (error) {
    console.error('Error fetching user roles:', error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// POST /api/rbac/users/[id]/roles - Assign role to user
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const hasAccess = await hasPermission('rbac', 'manage');
    if (!hasAccess) {
      return NextResponse.json({ error: "Insufficient permissions" }, { status: 403 });
    }

    const { id: userId } = await params;
    const { roleIds } = await request.json();

    if (!roleIds || !Array.isArray(roleIds) || roleIds.length === 0) {
      return NextResponse.json({ error: "Role IDs are required" }, { status: 400 });
    }

    // Check if user exists
    const user = await prisma.user.findUnique({
      where: { id: userId }
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Check if all roles exist
    const roles = await prisma.role.findMany({
      where: { id: { in: roleIds } }
    });

    if (roles.length !== roleIds.length) {
      return NextResponse.json({ error: "One or more roles not found" }, { status: 404 });
    }

    // Assign roles to user (skip duplicates)
    const userRoles = [];
    for (const roleId of roleIds) {
      const existingRole = await prisma.userRole.findUnique({
        where: {
          userId_roleId: {
            userId,
            roleId
          }
        }
      });

      if (!existingRole) {
        const userRole = await prisma.userRole.create({
          data: {
            userId,
            roleId
          },
          include: {
            role: {
              select: {
                id: true,
                name: true,
                description: true
              }
            }
          }
        });
        userRoles.push(userRole);
      }
    }

    return NextResponse.json(userRoles);
  } catch (error) {
    console.error('Error assigning role to user:', error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// DELETE /api/rbac/users/[id]/roles/[roleId] - Remove role from user
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const hasAccess = await hasPermission('rbac', 'manage');
    if (!hasAccess) {
      return NextResponse.json({ error: "Insufficient permissions" }, { status: 403 });
    }

    const { id: userId } = await params;
    const url = new URL(request.url);
    const roleId = url.pathname.split('/').pop(); // Extract roleId from URL

    if (!roleId) {
      return NextResponse.json({ error: "Role ID is required" }, { status: 400 });
    }

    // Check if user exists
    const user = await prisma.user.findUnique({
      where: { id: userId }
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Check if role exists
    const role = await prisma.role.findUnique({
      where: { id: roleId }
    });

    if (!role) {
      return NextResponse.json({ error: "Role not found" }, { status: 404 });
    }

    // Check if user has this role
    const userRole = await prisma.userRole.findUnique({
      where: {
        userId_roleId: {
          userId,
          roleId
        }
      }
    });

    if (!userRole) {
      return NextResponse.json({ error: "User does not have this role" }, { status: 404 });
    }

    // Remove role from user
    await prisma.userRole.delete({
      where: {
        userId_roleId: {
          userId,
          roleId
        }
      }
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error removing role from user:', error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}