-- CreateEnum
CREATE TYPE "QuestType" AS ENUM ('daily');

-- CreateTable
CREATE TABLE "Quest" (
    "id" TEXT NOT NULL,
    "type" "QuestType" NOT NULL DEFAULT 'daily',
    "code" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "target_count" INTEGER NOT NULL,
    "exp_reward" INTEGER NOT NULL,

    CONSTRAINT "Quest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserQuestProgress" (
    "user_id" TEXT NOT NULL,
    "quest_id" TEXT NOT NULL,
    "date_or_week_key" TEXT NOT NULL,
    "current_count" INTEGER NOT NULL DEFAULT 0,
    "is_completed" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "UserQuestProgress_pkey" PRIMARY KEY ("user_id","quest_id","date_or_week_key")
);

-- CreateIndex
CREATE UNIQUE INDEX "Quest_code_key" ON "Quest"("code");

-- AddForeignKey
ALTER TABLE "UserQuestProgress" ADD CONSTRAINT "UserQuestProgress_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserQuestProgress" ADD CONSTRAINT "UserQuestProgress_quest_id_fkey" FOREIGN KEY ("quest_id") REFERENCES "Quest"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Seed the 4 fixed Daily Quest catalog rows (PROMPT 25 — lib/quest/constants.ts DAILY_QUEST_SEEDS
-- must be kept in sync with these values). `id` reuses `code` since it only needs to be a stable,
-- unique TEXT value, not an actual UUID.
INSERT INTO "Quest" (id, type, code, title, target_count, exp_reward) VALUES
    ('NEW_WORD_STUDY', 'daily', 'NEW_WORD_STUDY', '새 단어 {count}개 학습', 10, 5),
    ('REVIEW_COMPLETE', 'daily', 'REVIEW_COMPLETE', '복습 {count}개 완료', 10, 5),
    ('WEAK_RETRY', 'daily', 'WEAK_RETRY', '오답 문제 재도전 {count}회 이상', 1, 5),
    ('SENTENCE_MAKING', 'daily', 'SENTENCE_MAKING', '문장 만들기 {count}회 이상', 1, 5)
ON CONFLICT (code) DO NOTHING;
