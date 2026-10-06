-- CreateEnum
CREATE TYPE "ReportTargetType" AS ENUM ('BOOK');

-- CreateEnum
CREATE TYPE "ReportReason" AS ENUM ('SPAM', 'ABUSE', 'INAPPROPRIATE', 'OTHER');

-- CreateEnum
CREATE TYPE "ReportStatus" AS ENUM ('OPEN', 'RESOLVED', 'DISMISSED');

-- AlterEnum
ALTER TYPE "AdminAuditAction" ADD VALUE 'HIDE_CONTENT';
ALTER TYPE "AdminAuditAction" ADD VALUE 'RESTORE_CONTENT';
ALTER TYPE "AdminAuditAction" ADD VALUE 'DELETE_CONTENT';
ALTER TYPE "AdminAuditAction" ADD VALUE 'WARN';
ALTER TYPE "AdminAuditAction" ADD VALUE 'RESTRICT_WRITE';
ALTER TYPE "AdminAuditAction" ADD VALUE 'RESOLVE_REPORT';
ALTER TYPE "AdminAuditAction" ADD VALUE 'DISMISS_REPORT';

-- AlterTable
ALTER TABLE "AdminAuditLog" ADD COLUMN     "target_id" TEXT,
ADD COLUMN     "target_label" TEXT,
ADD COLUMN     "target_type" "ReportTargetType";

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "warning_count" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "write_restricted_until" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "VocabularyBook" ADD COLUMN     "hidden_at" TIMESTAMP(3),
ADD COLUMN     "hidden_by" TEXT,
ADD COLUMN     "hide_reason" TEXT;

-- CreateTable
CREATE TABLE "Report" (
    "id" TEXT NOT NULL,
    "reporter_id" TEXT NOT NULL,
    "target_type" "ReportTargetType" NOT NULL,
    "target_id" TEXT NOT NULL,
    "reason" "ReportReason" NOT NULL,
    "detail" TEXT,
    "status" "ReportStatus" NOT NULL DEFAULT 'OPEN',
    "handled_by" TEXT,
    "handled_at" TIMESTAMP(3),
    "resolution_note" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Report_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Report_target_type_target_id_idx" ON "Report"("target_type", "target_id");

-- CreateIndex
CREATE INDEX "Report_status_idx" ON "Report"("status");

-- CreateIndex
CREATE UNIQUE INDEX "Report_reporter_id_target_type_target_id_key" ON "Report"("reporter_id", "target_type", "target_id");

-- AddForeignKey
ALTER TABLE "Report" ADD CONSTRAINT "Report_reporter_id_fkey" FOREIGN KEY ("reporter_id") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
