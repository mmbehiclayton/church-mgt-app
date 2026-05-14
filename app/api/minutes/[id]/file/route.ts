import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/db";
import { v2 as cloudinary } from "cloudinary";

export const runtime = "nodejs";

cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
});

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

    // Generate a signed URL valid for 1 hour
    const signedUrl = cloudinary.utils.private_download_url(
        record.filePath,
        "pdf",
        {
            resource_type: "raw",
            expires_at: Math.floor(Date.now() / 1000) + 3600,
            attachment: false,
        }
    );

    return NextResponse.redirect(signedUrl);
}
