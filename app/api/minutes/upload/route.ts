import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/db";
import { v2 as cloudinary } from "cloudinary";

export const runtime = "nodejs";
export const maxDuration = 30;

cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
});

export async function POST(req: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const formData = await req.formData();
        const file = formData.get("file") as File | null;
        const title = (formData.get("title") as string | null)?.trim();
        const meetingDate = formData.get("meetingDate") as string | null;
        const meetingType = (formData.get("meetingType") as string | null)?.trim();
        const description = (formData.get("description") as string | null)?.trim() || null;

        if (!file || !title || !meetingDate || !meetingType) {
            return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
        }

        const isPdf =
            file.type === "application/pdf" ||
            file.type === "application/octet-stream" ||
            file.name.toLowerCase().endsWith(".pdf");
        if (!isPdf) {
            return NextResponse.json({ error: "Only PDF files are allowed" }, { status: 400 });
        }

        if (file.size > 20 * 1024 * 1024) {
            return NextResponse.json({ error: "File exceeds 20 MB limit" }, { status: 400 });
        }

        const parsedDate = new Date(meetingDate);
        if (isNaN(parsedDate.getTime())) {
            return NextResponse.json({ error: "Invalid meeting date" }, { status: 400 });
        }

        const bytes = await file.arrayBuffer();
        const buffer = Buffer.from(bytes);

        // Upload to Cloudinary — store secure_url so we can serve it directly
        const uploadResult = await new Promise<{ public_id: string; secure_url: string }>(
            (resolve, reject) => {
                cloudinary.uploader.upload_stream(
                    {
                        resource_type: "raw",
                        folder: "church-minutes",
                        use_filename: true,
                        unique_filename: true,
                        format: "pdf",
                    },
                    (error, result) => {
                        if (error || !result) reject(error ?? new Error("Cloudinary upload failed"));
                        else resolve(result as { public_id: string; secure_url: string });
                    }
                ).end(buffer);
            }
        );

        const record = await prisma.meetingMinutes.create({
            data: {
                title,
                meetingDate: parsedDate,
                meetingType,
                description,
                fileName: file.name,
                filePath: uploadResult.secure_url,  // store the full URL — no reconstruction needed
                fileSize: file.size,
                uploadedById: (session.user as { id?: string }).id ?? null,
                uploadedByName: session.user.name ?? session.user.email ?? null,
            },
        });

        return NextResponse.json({ id: record.id });
    } catch (err) {
        console.error("[minutes/upload] error:", err);
        return NextResponse.json(
            { error: err instanceof Error ? err.message : "Unknown error" },
            { status: 500 }
        );
    }
}
