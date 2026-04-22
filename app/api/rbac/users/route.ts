import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { hasPermission } from "@/lib/rbac";
import prisma from "@/lib/db";

// GET /api/rbac/users - Get all users with their roles and permissions
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

    const users = await prisma.user.findMany({
      select: {
        id: true,
        email: true,
        name: true,
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
        },
        userPermissions: {
          include: {
            permission: {
              select: {
                id: true,
                name: true,
                resource: true,
                action: true,
                description: true
              }
            }
          }
        }
      },
      orderBy: { email: 'asc' }
    });

    return NextResponse.json(users);
  } catch (error) {
    console.error('Error fetching users:', error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
