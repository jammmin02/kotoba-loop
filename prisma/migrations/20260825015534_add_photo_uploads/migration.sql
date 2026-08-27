-- CreateEnum
CREATE TYPE "PhotoUploadStatus" AS ENUM ('pending');

-- CreateTable
CREATE TABLE "PhotoUpload" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "storage_key" TEXT NOT NULL,
    "mime_type" TEXT NOT NULL,
    "file_size" INTEGER NOT NULL,
    "width" INTEGER,
    "height" INTEGER,
    "status" "PhotoUploadStatus" NOT NULL DEFAULT 'pending',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PhotoUpload_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "PhotoUpload_storage_key_key" ON "PhotoUpload"("storage_key");

-- CreateIndex
CREATE INDEX "PhotoUpload_user_id_status_idx" ON "PhotoUpload"("user_id", "status");

-- AddForeignKey
ALTER TABLE "PhotoUpload" ADD CONSTRAINT "PhotoUpload_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
