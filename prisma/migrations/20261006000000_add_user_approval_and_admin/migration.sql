-- CreateEnum
CREATE TYPE "UserStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'SUSPENDED');

-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('USER', 'ADMIN');

-- CreateEnum
CREATE TYPE "AdminAuditAction" AS ENUM ('APPROVE', 'REJECT', 'SUSPEND', 'RESTORE');

-- AlterTable
-- 기존 사용자는 모두 APPROVED로 시작해야 로그인이 막히지 않는다. 컬럼 추가 시 기본값을 APPROVED로
-- 채운 뒤, 이후 신규 가입을 위해 기본값을 PENDING으로 바꾼다.
ALTER TABLE "User" ADD COLUMN     "last_active_at" TIMESTAMP(3),
ADD COLUMN     "reject_reason" TEXT,
ADD COLUMN     "reviewed_at" TIMESTAMP(3),
ADD COLUMN     "reviewed_by" TEXT,
ADD COLUMN     "role" "UserRole" NOT NULL DEFAULT 'USER',
ADD COLUMN     "status" "UserStatus" NOT NULL DEFAULT 'APPROVED';

ALTER TABLE "User" ALTER COLUMN "status" SET DEFAULT 'PENDING';

-- 기존 관리자 계정(prisma/seed-admin-account.ts)에 ADMIN role 부여
UPDATE "User" SET "role" = 'ADMIN' WHERE "email" = 'admin@kotoba-loop.app';

-- CreateTable
CREATE TABLE "AdminAuditLog" (
    "id" TEXT NOT NULL,
    "admin_id" TEXT,
    "target_user_id" TEXT,
    "target_user_email" TEXT NOT NULL,
    "action" "AdminAuditAction" NOT NULL,
    "reason" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AdminAuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AdminAuditLog_created_at_idx" ON "AdminAuditLog"("created_at");

-- CreateIndex
CREATE INDEX "AdminAuditLog_target_user_id_idx" ON "AdminAuditLog"("target_user_id");

-- CreateIndex
CREATE INDEX "User_status_idx" ON "User"("status");

-- AddForeignKey
ALTER TABLE "AdminAuditLog" ADD CONSTRAINT "AdminAuditLog_admin_id_fkey" FOREIGN KEY ("admin_id") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AdminAuditLog" ADD CONSTRAINT "AdminAuditLog_target_user_id_fkey" FOREIGN KEY ("target_user_id") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
