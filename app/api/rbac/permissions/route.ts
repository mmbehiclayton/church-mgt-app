import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { hasPermission } from "@/lib/rbac";
import prisma from "@/lib/db";

// GET /api/rbac/permissions - Get all permissions
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

    const permissions = await prisma.permission.findMany({
      orderBy: [
        { resource: 'asc' },
        { action: 'asc' }
      ]
    });

    return NextResponse.json(permissions);
  } catch (error) {
    console.error('Error fetching permissions:', error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
