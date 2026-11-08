-- AlterTable
-- Additive only: optional target amount and payment details used when sharing a
-- category's contributions. Existing rows get NULL; no data is modified or removed.
ALTER TABLE "Category" ADD COLUMN     "targetAmount" DOUBLE PRECISION,
ADD COLUMN     "paybill" TEXT,
ADD COLUMN     "accountNumber" TEXT,
ADD COLUMN     "shareNote" TEXT;
