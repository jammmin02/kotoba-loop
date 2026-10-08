-- CreateEnum
CREATE TYPE "CompositionMode" AS ENUM ('DEFAULT', 'CUSTOM', 'ENDLESS');

-- CreateTable
CREATE TABLE "CompositionSession" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "situation" TEXT NOT NULL,
    "vocab_level" "JlptLevel" NOT NULL,
    "composition_level" TEXT NOT NULL,
    "tone" TEXT NOT NULL,
    "mode" "CompositionMode" NOT NULL,
    "target_count" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "finished_at" TIMESTAMP(3),

    CONSTRAINT "CompositionSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CompositionAttempt" (
    "id" TEXT NOT NULL,
    "session_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "order" INTEGER NOT NULL,
    "prompt_korean" TEXT NOT NULL,
    "answer_japanese" TEXT NOT NULL,
    "score" INTEGER NOT NULL,
    "grammar_score" INTEGER NOT NULL,
    "vocabulary_score" INTEGER NOT NULL,
    "naturalness_score" INTEGER NOT NULL,
    "is_accepted" BOOLEAN NOT NULL,
    "feedback" JSONB NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CompositionAttempt_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "CompositionSession_user_id_created_at_idx" ON "CompositionSession"("user_id", "created_at");

-- CreateIndex
CREATE INDEX "CompositionAttempt_user_id_created_at_idx" ON "CompositionAttempt"("user_id", "created_at");

-- CreateIndex
CREATE UNIQUE INDEX "CompositionAttempt_session_id_order_key" ON "CompositionAttempt"("session_id", "order");

-- AddForeignKey
ALTER TABLE "CompositionSession" ADD CONSTRAINT "CompositionSession_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CompositionAttempt" ADD CONSTRAINT "CompositionAttempt_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "CompositionSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CompositionAttempt" ADD CONSTRAINT "CompositionAttempt_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
