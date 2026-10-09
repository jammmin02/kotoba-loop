-- CreateEnum
CREATE TYPE "ConversationRole" AS ENUM ('AI', 'USER');

-- CreateTable
CREATE TABLE "ConversationSession" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "scenario" TEXT NOT NULL,
    "topic" TEXT NOT NULL,
    "vocab_level" "JlptLevel" NOT NULL,
    "tone" TEXT NOT NULL,
    "target_turns" INTEGER NOT NULL,
    "summary_comment" TEXT,
    "summary_focus" TEXT,
    "exp_granted" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "finished_at" TIMESTAMP(3),

    CONSTRAINT "ConversationSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ConversationMessage" (
    "id" TEXT NOT NULL,
    "session_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "seq" INTEGER NOT NULL,
    "role" "ConversationRole" NOT NULL,
    "text" TEXT NOT NULL,
    "text_ko" TEXT,
    "hints" JSONB,
    "score" INTEGER,
    "grammar_score" INTEGER,
    "vocabulary_score" INTEGER,
    "naturalness_score" INTEGER,
    "is_accepted" BOOLEAN,
    "hint_used" BOOLEAN NOT NULL DEFAULT false,
    "feedback" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ConversationMessage_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ConversationSession_user_id_created_at_idx" ON "ConversationSession"("user_id", "created_at");

-- CreateIndex
CREATE INDEX "ConversationMessage_user_id_created_at_idx" ON "ConversationMessage"("user_id", "created_at");

-- CreateIndex
CREATE UNIQUE INDEX "ConversationMessage_session_id_seq_key" ON "ConversationMessage"("session_id", "seq");

-- AddForeignKey
ALTER TABLE "ConversationSession" ADD CONSTRAINT "ConversationSession_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConversationMessage" ADD CONSTRAINT "ConversationMessage_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "ConversationSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConversationMessage" ADD CONSTRAINT "ConversationMessage_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

