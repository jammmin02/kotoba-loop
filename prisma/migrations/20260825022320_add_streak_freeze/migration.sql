-- AlterTable
ALTER TABLE "UserGameProfile" ADD COLUMN     "streak_freeze_count" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "streak_freeze_notice_pending" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "StreakFreezeLog" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "protected_date" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StreakFreezeLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "StreakFreezeLog_user_id_protected_date_key" ON "StreakFreezeLog"("user_id", "protected_date");

-- AddForeignKey
ALTER TABLE "StreakFreezeLog" ADD CONSTRAINT "StreakFreezeLog_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
