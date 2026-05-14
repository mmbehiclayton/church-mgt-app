import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/db";
import { writeFile, mkdir } from "fs/promises";
import path from "path";

const UPLOAD_DIR = path.join(process.cwd(), "public", "uploads", "minutes");
const MAX_FILE_SIZE = 20 * 1024 * 1024; // 20 MB

export async function POST(req: NextRequest) {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    let formData: FormData;
    try {
        formData = await req.formData();
    } catch {
        return NextResponse.json({ error: "Invalid form data" }, { status: 400 });
    }

    const file = formData.get("file") as File | null;
    const title = (formData.get("title") as string | null)?.trim();
    const meetingDate = formData.get("meetingDate") as string | null;
    const meetingType = (formData.get("meetingType") as string | null)?.trim();
    const description = (formData.get("description") as string | null)?.trim() || null;

    if (!file || !title || !meetingDate || !meetingType) {
        return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    if (file.type !== "application/pdf") {
        return NextResponse.json({ error: "Only PDF files are allowed" }, { status: 400 });
    }

    if (file.size > MAX_FILE_SIZE) {
        return NextResponse.json({ error: "File exceeds 20 MB limit" }, { status: 400 });
    }

    const parsedDate = new Date(meetingDate);
    if (isNaN(parsedDate.getTime())) {
        return NextResponse.json({ error: "Invalid meeting date" }, { status: 400 });
    }

    // Ensure upload directory exists
    await mkdir(UPLOAD_DIR, { recursive: true });

    // Build a safe unique filename
    const timestamp = Date.now();
    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
    const fileName = `${timestamp}_${safeName}`;
    const filePath = path.join(UPLOAD_DIR, fileName);

    const bytes = await file.arrayBuffer();
    await writeFile(filePath, Buffer.from(bytes));

    const record = await prisma.meetingMinutes.create({
        data: {
            title,
            meetingDate: parsedDate,
            meetingType,
            description,
            fileName: file.name,
            filePath: fileName, // store only the filename; dir is fixed
            fileSize: file.size,
            uploadedById: session.user.id ?? null,
            uploadedByName: session.user.name ?? session.user.email ?? null,
        },
    });

    return NextResponse.json({ id: record.id });
}
