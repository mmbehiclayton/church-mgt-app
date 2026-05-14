import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/db";
import { writeFile, mkdir } from "fs/promises";
import path from "path";

export const runtime = "nodejs";

// Raise the body size limit for this route to 25 MB
export const maxDuration = 30;

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

        // Some browsers report PDF as application/octet-stream — accept both
        const isPdf =
            file.type === "application/pdf" ||
            file.type === "application/octet-stream" ||
            file.name.toLowerCase().endsWith(".pdf");

        if (!isPdf) {
            return NextResponse.json({ error: "Only PDF files are allowed" }, { status: 400 });
        }

        const MAX_FILE_SIZE = 20 * 1024 * 1024; // 20 MB
        if (file.size > MAX_FILE_SIZE) {
            return NextResponse.json({ error: "File exceeds 20 MB limit" }, { status: 400 });
        }

        const parsedDate = new Date(meetingDate);
        if (isNaN(parsedDate.getTime())) {
            return NextResponse.json({ error: "Invalid meeting date" }, { status: 400 });
        }

        // Ensure upload directory exists
        const uploadDir = path.join(process.cwd(), "public", "uploads", "minutes");
        await mkdir(uploadDir, { recursive: true });

        // Build a safe unique filename
        const timestamp = Date.now();
        const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
        const fileName = `${timestamp}_${safeName}`;
        const filePath = path.join(uploadDir, fileName);

        const bytes = await file.arrayBuffer();
        await writeFile(filePath, Buffer.from(bytes));

        const record = await prisma.meetingMinutes.create({
            data: {
                title,
                meetingDate: parsedDate,
                meetingType,
                description,
                fileName: file.name,
                filePath: fileName,
                fileSize: file.size,
                uploadedById: (session.user as { id?: string }).id ?? null,
                uploadedByName: session.user.name ?? session.user.email ?? null,
            },
        });

        return NextResponse.json({ id: record.id });
    } catch (err) {
        console.error("[minutes/upload] error:", err);
        const message = err instanceof Error ? err.message : "Unknown error";
        return NextResponse.json({ error: message }, { status: 500 });
    }
}
