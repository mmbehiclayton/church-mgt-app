"use server";

import prisma from "@/lib/db";
import { requirePermission } from "@/lib/rbac";
import { unlink } from "fs/promises";
import path from "path";

const UPLOAD_DIR = path.join(process.cwd(), "public", "uploads", "minutes");

export interface MinutesRecord {
    id: string;
    title: string;
    meetingDate: Date;
    meetingType: string;
    description: string | null;
    fileName: string;
    fileSize: number;
    uploadedByName: string | null;
    createdAt: Date;
}

export async function getMinutes(filters?: {
    meetingType?: string;
    search?: string;
    page?: number;
    limit?: number;
}) {
    await requirePermission("minutes", "read");

    const page = filters?.page ?? 1;
    const limit = filters?.limit ?? 20;
    const skip = (page - 1) * limit;

    const where: Record<string, unknown> = {};

    if (filters?.meetingType) {
        where.meetingType = filters.meetingType;
    }

    if (filters?.search?.trim()) {
        where.OR = [
            { title: { contains: filters.search.trim(), mode: "insensitive" } },
            { description: { contains: filters.search.trim(), mode: "insensitive" } },
        ];
    }

    const [records, total] = await Promise.all([
        prisma.meetingMinutes.findMany({
            where,
            select: {
                id: true,
                title: true,
                meetingDate: true,
                meetingType: true,
                description: true,
                fileName: true,
                fileSize: true,
                uploadedByName: true,
                createdAt: true,
            },
            orderBy: { meetingDate: "desc" },
            skip,
            take: limit,
        }),
        prisma.meetingMinutes.count({ where }),
    ]);

    return {
        data: records,
        pagination: { total, page, limit, pages: Math.ceil(total / limit) },
    };
}

export async function deleteMinutes(id: string) {
    await requirePermission("minutes", "delete");

    const record = await prisma.meetingMinutes.findUnique({ where: { id } });
    if (!record) return { error: "Record not found" };

    // Delete file from disk (best-effort)
    try {
        if (!record.filePath.includes("/") && !record.filePath.includes("\\")) {
            await unlink(path.join(UPLOAD_DIR, record.filePath));
        }
    } catch {
        // File already gone — continue with DB delete
    }

    await prisma.meetingMinutes.delete({ where: { id } });
    return { success: true };
}

export async function getMeetingTypes(): Promise<string[]> {
    await requirePermission("minutes", "read");
    const rows = await prisma.meetingMinutes.findMany({
        select: { meetingType: true },
        distinct: ["meetingType"],
        orderBy: { meetingType: "asc" },
    });
    return rows.map((r) => r.meetingType);
}
