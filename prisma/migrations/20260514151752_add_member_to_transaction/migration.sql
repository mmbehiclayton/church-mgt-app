-- AlterTable
ALTER TABLE "Transaction" ADD COLUMN     "memberId" TEXT,
ADD COLUMN     "memberName" TEXT;

-- CreateIndex
CREATE INDEX "Transaction_memberId_idx" ON "Transaction"("memberId");
