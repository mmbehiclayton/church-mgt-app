-- CreateTable
CREATE TABLE "MeetingMinutes" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "meetingDate" TIMESTAMP(3) NOT NULL,
    "meetingType" TEXT NOT NULL,
    "description" TEXT,
    "fileName" TEXT NOT NULL,
    "filePath" TEXT NOT NULL,
    "fileSize" INTEGER NOT NULL,
    "uploadedById" TEXT,
    "uploadedByName" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MeetingMinutes_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "MeetingMinutes_meetingDate_idx" ON "MeetingMinutes"("meetingDate");

-- CreateIndex
CREATE INDEX "MeetingMinutes_meetingType_idx" ON "MeetingMinutes"("meetingType");

-- CreateIndex
CREATE INDEX "MeetingMinutes_uploadedById_idx" ON "MeetingMinutes"("uploadedById");
