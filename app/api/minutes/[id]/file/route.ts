import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/db";
import { readFile } from "fs/promises";
import path from "path";

const UPLOAD_DIR = path.join(process.cwd(), "public", "uploads", "minutes");

export async function GET(
    _req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const record = await prisma.meetingMinutes.findUnique({ where: { id } });
    if (!record) {
        return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    // Prevent path traversal: filePath must be a plain filename with no slashes
    if (record.filePath.includes("/") || record.filePath.includes("\\") || record.filePath.startsWith(".")) {
        return NextResponse.json({ error: "Invalid file path" }, { status: 400 });
    }

    const fullPath = path.join(UPLOAD_DIR, record.filePath);

    let buffer: Uint8Array;
    try {
        buffer = await readFile(fullPath);
    } catch {
        return NextResponse.json({ error: "File not found on disk" }, { status: 404 });
    }

    const safeFileName = encodeURIComponent(record.fileName);
    return new NextResponse(buffer as unknown as BodyInit, {
        headers: {
            "Content-Type": "application/pdf",
            "Content-Disposition": `inline; filename="${safeFileName}"`,
            "Content-Length": buffer.byteLength.toString(),
            "Cache-Control": "private, max-age=3600",
        },
    });
}
