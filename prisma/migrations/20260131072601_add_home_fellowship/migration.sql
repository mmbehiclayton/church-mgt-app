-- AlterTable
ALTER TABLE "Member" ADD COLUMN     "homeFellowshipId" TEXT;

-- CreateTable
CREATE TABLE "HomeFellowship" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "leader" TEXT,
    "location" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "HomeFellowship_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "HomeFellowship_name_key" ON "HomeFellowship"("name");

-- AddForeignKey
ALTER TABLE "Member" ADD CONSTRAINT "Member_homeFellowshipId_fkey" FOREIGN KEY ("homeFellowshipId") REFERENCES "HomeFellowship"("id") ON DELETE SET NULL ON UPDATE CASCADE;
