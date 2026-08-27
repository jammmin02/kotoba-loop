-- AlterTable
ALTER TABLE "VocabularyBook" ADD COLUMN     "import_count" INTEGER NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE "Friend" (
    "follower_id" TEXT NOT NULL,
    "followee_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Friend_pkey" PRIMARY KEY ("follower_id","followee_id")
);

-- AddForeignKey
ALTER TABLE "Friend" ADD CONSTRAINT "Friend_follower_id_fkey" FOREIGN KEY ("follower_id") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Friend" ADD CONSTRAINT "Friend_followee_id_fkey" FOREIGN KEY ("followee_id") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
