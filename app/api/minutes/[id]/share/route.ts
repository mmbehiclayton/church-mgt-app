import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";
import { v2 as cloudinary } from "cloudinary";

export const runtime = "nodejs";

cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
});

function extractPublicId(filePath: string): string {
    const match = filePath.match(/\/raw\/upload\/(?:v\d+\/)?(.+)$/);
    return match ? match[1] : filePath;
}

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

    const publicId = extractPublicId(record.filePath);

    const signedUrl = cloudinary.utils.private_download_url(publicId, "", {
        resource_type: "raw",
        type: "upload",
        expires_at: Math.floor(Date.now() / 1000) + 3600,
        attachment: false,
    });

    const upstream = await fetch(signedUrl);
    if (!upstream.ok) {
        return new NextResponse(`Could not load document (${upstream.status})`, { status: 502 });
    }

    return new NextResponse(upstream.body, {
        status: 200,
        headers: {
            "Content-Type": "application/pdf",
            "Content-Disposition": `inline; filename="${record.fileName}"`,
            "Cache-Control": "private, max-age=3600",
        },
    });
}
