-- CreateEnum
CREATE TYPE "AnnouncementLevel" AS ENUM ('INFO', 'WARNING');

-- AlterEnum
ALTER TYPE "AdminAuditAction" ADD VALUE 'CREATE_ANNOUNCEMENT';
ALTER TYPE "AdminAuditAction" ADD VALUE 'UPDATE_ANNOUNCEMENT';
ALTER TYPE "AdminAuditAction" ADD VALUE 'DELETE_ANNOUNCEMENT';
ALTER TYPE "AdminAuditAction" ADD VALUE 'UPDATE_SETTING';
ALTER TYPE "AdminAuditAction" ADD VALUE 'UPDATE_CONTENT';
ALTER TYPE "AdminAuditAction" ADD VALUE 'SOFT_DELETE_USER';
ALTER TYPE "AdminAuditAction" ADD VALUE 'RESTORE_USER';
ALTER TYPE "AdminAuditAction" ADD VALUE 'EXPORT_MEMBERS';
ALTER TYPE "AdminAuditAction" ADD VALUE 'BLOCK_AI_RESULT';

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "deleted_at" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "Announcement" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "level" "AnnouncementLevel" NOT NULL DEFAULT 'INFO',
    "starts_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ends_at" TIMESTAMP(3),
    "is_pinned" BOOLEAN NOT NULL DEFAULT false,
    "created_by" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Announcement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SystemSetting" (
    "key" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SystemSetting_pkey" PRIMARY KEY ("key")
);

-- CreateTable
CREATE TABLE "AiUsageLog" (
    "id" TEXT NOT NULL,
    "user_id" TEXT,
    "feature" TEXT NOT NULL,
    "model" TEXT NOT NULL,
    "input_tokens" INTEGER NOT NULL,
    "output_tokens" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AiUsageLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Announcement_starts_at_ends_at_idx" ON "Announcement"("starts_at", "ends_at");

-- CreateIndex
CREATE INDEX "AiUsageLog_created_at_idx" ON "AiUsageLog"("created_at");

-- CreateIndex
CREATE INDEX "AiUsageLog_user_id_created_at_idx" ON "AiUsageLog"("user_id", "created_at");

-- AddForeignKey
ALTER TABLE "Announcement" ADD CONSTRAINT "Announcement_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AiUsageLog" ADD CONSTRAINT "AiUsageLog_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
