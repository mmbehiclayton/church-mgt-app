-- AlterTable
-- Additive only: adds a reconciliation flag (defaulting to false) plus an
-- optional timestamp. Every existing transaction stays unreconciled and no
-- existing data is modified or removed.
ALTER TABLE "Transaction" ADD COLUMN     "reconciled" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "reconciledAt" TIMESTAMP(3);

-- CreateIndex
CREATE INDEX "Transaction_reconciled_idx" ON "Transaction"("reconciled");
