-- AlterTable
-- Additive only: adds an isActive flag defaulting to true, so every existing
-- category remains active and no existing data is modified or removed.
ALTER TABLE "Category" ADD COLUMN     "isActive" BOOLEAN NOT NULL DEFAULT true;
