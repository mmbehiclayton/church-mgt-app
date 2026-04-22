import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { hasPermission } from "@/lib/rbac";
import prisma from "@/lib/db";

// DELETE /api/rbac/roles/[id] - Delete a role
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

    const { id: roleId } = await params;

    // Check if role exists and is not a system role
    const role = await prisma.role.findUnique({
      where: { id: roleId },
      include: {
        _count: {
          select: {
            userRoles: true
          }
        }
      }
    });

    if (!role) {
      return NextResponse.json({ error: "Role not found" }, { status: 404 });
    }

    if (role.isSystem) {
      return NextResponse.json({ error: "Cannot delete system roles" }, { status: 400 });
    }

    if (role._count.userRoles > 0) {
      return NextResponse.json({ error: "Cannot delete role that is assigned to users" }, { status: 400 });
    }

    // Delete the role (this will cascade delete role permissions)
    await prisma.role.delete({
      where: { id: roleId }
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting role:', error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}