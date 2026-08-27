-- CreateEnum
CREATE TYPE "BattleRoomStatus" AS ENUM ('waiting', 'playing', 'finished');

-- CreateTable
CREATE TABLE "BattleRoom" (
    "id" TEXT NOT NULL,
    "room_code" TEXT NOT NULL,
    "host_user_id" TEXT NOT NULL,
    "vocabulary_book_id" TEXT NOT NULL,
    "status" "BattleRoomStatus" NOT NULL DEFAULT 'waiting',
    "round_count" INTEGER NOT NULL DEFAULT 10,
    "questions" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BattleRoom_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BattleParticipant" (
    "id" TEXT NOT NULL,
    "room_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "score" INTEGER NOT NULL DEFAULT 0,
    "joined_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BattleParticipant_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BattleRound" (
    "id" TEXT NOT NULL,
    "room_id" TEXT NOT NULL,
    "round_number" INTEGER NOT NULL,
    "vocabulary_id" TEXT NOT NULL,
    "started_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ended_at" TIMESTAMP(3),
    "winner_participant_id" TEXT,

    CONSTRAINT "BattleRound_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BattleAnswer" (
    "id" TEXT NOT NULL,
    "round_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "participant_id" TEXT NOT NULL,
    "response_time_ms" INTEGER NOT NULL,
    "is_correct" BOOLEAN NOT NULL,
    "answered_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BattleAnswer_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "BattleRoom_room_code_key" ON "BattleRoom"("room_code");

-- CreateIndex
CREATE INDEX "BattleRoom_host_user_id_idx" ON "BattleRoom"("host_user_id");

-- CreateIndex
CREATE INDEX "BattleParticipant_room_id_idx" ON "BattleParticipant"("room_id");

-- CreateIndex
CREATE UNIQUE INDEX "BattleParticipant_room_id_user_id_key" ON "BattleParticipant"("room_id", "user_id");

-- CreateIndex
CREATE INDEX "BattleRound_room_id_idx" ON "BattleRound"("room_id");

-- CreateIndex
CREATE UNIQUE INDEX "BattleRound_room_id_round_number_key" ON "BattleRound"("room_id", "round_number");

-- CreateIndex
CREATE INDEX "BattleAnswer_round_id_idx" ON "BattleAnswer"("round_id");

-- CreateIndex
CREATE UNIQUE INDEX "BattleAnswer_round_id_user_id_key" ON "BattleAnswer"("round_id", "user_id");

-- AddForeignKey
ALTER TABLE "BattleRoom" ADD CONSTRAINT "BattleRoom_host_user_id_fkey" FOREIGN KEY ("host_user_id") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BattleRoom" ADD CONSTRAINT "BattleRoom_vocabulary_book_id_fkey" FOREIGN KEY ("vocabulary_book_id") REFERENCES "VocabularyBook"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BattleParticipant" ADD CONSTRAINT "BattleParticipant_room_id_fkey" FOREIGN KEY ("room_id") REFERENCES "BattleRoom"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BattleParticipant" ADD CONSTRAINT "BattleParticipant_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BattleRound" ADD CONSTRAINT "BattleRound_room_id_fkey" FOREIGN KEY ("room_id") REFERENCES "BattleRoom"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BattleRound" ADD CONSTRAINT "BattleRound_vocabulary_id_fkey" FOREIGN KEY ("vocabulary_id") REFERENCES "Vocabulary"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BattleRound" ADD CONSTRAINT "BattleRound_winner_participant_id_fkey" FOREIGN KEY ("winner_participant_id") REFERENCES "BattleParticipant"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BattleAnswer" ADD CONSTRAINT "BattleAnswer_round_id_fkey" FOREIGN KEY ("round_id") REFERENCES "BattleRound"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BattleAnswer" ADD CONSTRAINT "BattleAnswer_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BattleAnswer" ADD CONSTRAINT "BattleAnswer_participant_id_fkey" FOREIGN KEY ("participant_id") REFERENCES "BattleParticipant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
