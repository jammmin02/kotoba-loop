-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "PhotoUploadStatus" ADD VALUE 'processing';
ALTER TYPE "PhotoUploadStatus" ADD VALUE 'completed';
ALTER TYPE "PhotoUploadStatus" ADD VALUE 'failed';

-- CreateTable
CREATE TABLE "PhotoOcrResult" (
    "id" TEXT NOT NULL,
    "photo_upload_id" TEXT NOT NULL,
    "raw_text" TEXT NOT NULL,
    "char_count" INTEGER NOT NULL,
    "processing_ms" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PhotoOcrResult_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "PhotoOcrResult_photo_upload_id_key" ON "PhotoOcrResult"("photo_upload_id");

-- AddForeignKey
ALTER TABLE "PhotoOcrResult" ADD CONSTRAINT "PhotoOcrResult_photo_upload_id_fkey" FOREIGN KEY ("photo_upload_id") REFERENCES "PhotoUpload"("id") ON DELETE CASCADE ON UPDATE CASCADE;
