-- CreateTable
CREATE TABLE "UserGameProfile" (
    "user_id" TEXT NOT NULL,
    "level" INTEGER NOT NULL DEFAULT 1,
    "exp" INTEGER NOT NULL DEFAULT 0,
    "current_streak" INTEGER NOT NULL DEFAULT 0,
    "longest_streak" INTEGER NOT NULL DEFAULT 0,
    "last_studied_date" TIMESTAMP(3),

    CONSTRAINT "UserGameProfile_pkey" PRIMARY KEY ("user_id")
);

-- CreateTable
CREATE TABLE "UserSentence" (
    "user_id" TEXT NOT NULL,
    "vocabulary_id" TEXT NOT NULL,
    "sentence" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UserSentence_pkey" PRIMARY KEY ("user_id","vocabulary_id")
);

-- AddForeignKey
ALTER TABLE "UserGameProfile" ADD CONSTRAINT "UserGameProfile_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserSentence" ADD CONSTRAINT "UserSentence_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserSentence" ADD CONSTRAINT "UserSentence_vocabulary_id_fkey" FOREIGN KEY ("vocabulary_id") REFERENCES "Vocabulary"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Backfill: give every existing user a default gamification profile (PROMPT 24 요구사항).
-- New users after this migration get their row lazily created by lib/game/grant.ts's
-- self-healing upsert, so no signup-flow code changes are needed here.
INSERT INTO "UserGameProfile" (user_id, level, exp, current_streak, longest_streak)
SELECT id, 1, 0, 0, 0 FROM "User"
ON CONFLICT (user_id) DO NOTHING;
