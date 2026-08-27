-- CreateEnum
CREATE TYPE "AchievementCategory" AS ENUM ('word', 'kanji');

-- CreateTable
CREATE TABLE "Achievement" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "category" "AchievementCategory" NOT NULL,
    "title" TEXT NOT NULL,
    "condition_value" INTEGER NOT NULL,

    CONSTRAINT "Achievement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserAchievement" (
    "user_id" TEXT NOT NULL,
    "achievement_id" TEXT NOT NULL,
    "unlocked_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UserAchievement_pkey" PRIMARY KEY ("user_id","achievement_id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Achievement_code_key" ON "Achievement"("code");

-- AddForeignKey
ALTER TABLE "UserAchievement" ADD CONSTRAINT "UserAchievement_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserAchievement" ADD CONSTRAINT "UserAchievement_achievement_id_fkey" FOREIGN KEY ("achievement_id") REFERENCES "Achievement"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Seed the fixed Achievement catalog (PROMPT 27 — lib/achievement/constants.ts ACHIEVEMENT_SEEDS
-- must be kept in sync with these values). `id` reuses `code` since it only needs to be a stable,
-- unique TEXT value, not an actual UUID (same convention as the Quest seed migration).
INSERT INTO "Achievement" (id, code, category, title, condition_value) VALUES
    ('WORD_REGISTER_FIRST', 'WORD_REGISTER_FIRST', 'word', '첫 단어 등록', 1),
    ('WORD_STUDY_10', 'WORD_STUDY_10', 'word', '단어 10개 학습', 10),
    ('WORD_STUDY_100', 'WORD_STUDY_100', 'word', '단어 100개 학습', 100),
    ('WORD_STUDY_500', 'WORD_STUDY_500', 'word', '단어 500개 학습', 500),
    ('WORD_STUDY_1000', 'WORD_STUDY_1000', 'word', '단어 1,000개 학습', 1000),
    ('KANJI_100', 'KANJI_100', 'kanji', '한자 초보(100자)', 100),
    ('KANJI_500', 'KANJI_500', 'kanji', '한자 중급(500자)', 500),
    ('KANJI_1000', 'KANJI_1000', 'kanji', '한자 고급(1,000자)', 1000),
    ('KANJI_2136_MASTER', 'KANJI_2136_MASTER', 'kanji', '상용한자 MASTER(2,136자)', 2136)
ON CONFLICT (code) DO NOTHING;
