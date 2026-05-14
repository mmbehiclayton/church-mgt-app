import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";

export const runtime = "nodejs";

// Public route — no auth required — so a shared link can be opened by anyone
export async function GET(
    _req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const { id } = await params;
    const record = await prisma.meetingMinutes.findUnique({ where: { id } });
    if (!record) {
        return new NextResponse("Document not found", { status: 404 });
    }

    const url = record.filePath.startsWith("http")
        ? record.filePath
        : `https://res.cloudinary.com/${process.env.CLOUDINARY_CLOUD_NAME}/raw/upload/${record.filePath}`;

    return NextResponse.redirect(url);
}
