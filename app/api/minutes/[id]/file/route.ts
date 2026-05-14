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

function extractPublicId(filePath: string): string {
    // filePath is a full secure_url like:
    // https://res.cloudinary.com/<cloud>/raw/upload/v<ver>/church-minutes/file.pdf
    // public_id = everything after /raw/upload/v<ver>/ (or /raw/upload/)
    const match = filePath.match(/\/raw\/upload\/(?:v\d+\/)?(.+)$/);
    return match ? match[1] : filePath;
}

export async function GET(
    req: NextRequest,
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

    const download = req.nextUrl.searchParams.get("download") === "1";
    const publicId = extractPublicId(record.filePath);

    // Generate a signed URL valid for 1 hour.
    // Must pass type:"upload" — without it Cloudinary defaults to "authenticated"
    // and returns 404. Pass format:"" so it doesn't double-append ".pdf".
    const signedUrl = cloudinary.utils.private_download_url(publicId, "", {
        resource_type: "raw",
        type: "upload",
        expires_at: Math.floor(Date.now() / 1000) + 3600,
        attachment: download,
    });

    // Proxy the bytes back so the browser receives them from our origin.
    // This makes the download attribute work and avoids CORS/auth issues.
    const upstream = await fetch(signedUrl);
    if (!upstream.ok) {
        return NextResponse.json(
            { error: `Cloudinary error: ${upstream.status}` },
            { status: 502 }
        );
    }

    const headers: Record<string, string> = {
        "Content-Type": "application/pdf",
        "Cache-Control": "private, max-age=3600",
    };
    if (download) {
        headers["Content-Disposition"] = `attachment; filename="${record.fileName}"`;
    } else {
        headers["Content-Disposition"] = `inline; filename="${record.fileName}"`;
    }
    const contentLength = upstream.headers.get("content-length");
    if (contentLength) headers["Content-Length"] = contentLength;

    return new NextResponse(upstream.body, { status: 200, headers });
}
