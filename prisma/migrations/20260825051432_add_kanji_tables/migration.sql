-- CreateTable
CREATE TABLE "Kanji" (
    "id" TEXT NOT NULL,
    "character" TEXT NOT NULL,
    "onyomi" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "kunyomi" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "korean_reading" TEXT NOT NULL,
    "meaning" TEXT NOT NULL,
    "stroke_count" INTEGER NOT NULL,
    "radical" TEXT NOT NULL,
    "school_grade" INTEGER,
    "jlpt_level_ref" "JlptLevel",

    CONSTRAINT "Kanji_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VocabularyKanji" (
    "vocabulary_id" TEXT NOT NULL,
    "kanji_id" TEXT NOT NULL,

    CONSTRAINT "VocabularyKanji_pkey" PRIMARY KEY ("vocabulary_id","kanji_id")
);

-- CreateTable
CREATE TABLE "UserKanji" (
    "user_id" TEXT NOT NULL,
    "kanji_id" TEXT NOT NULL,
    "learning_status" "LearningStatus" NOT NULL DEFAULT 'NEW',
    "last_reviewed_at" TIMESTAMP(3),
    "next_review_at" TIMESTAMP(3),
    "correct_count" INTEGER NOT NULL DEFAULT 0,
    "wrong_count" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "UserKanji_pkey" PRIMARY KEY ("user_id","kanji_id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Kanji_character_key" ON "Kanji"("character");

-- AddForeignKey
ALTER TABLE "VocabularyKanji" ADD CONSTRAINT "VocabularyKanji_vocabulary_id_fkey" FOREIGN KEY ("vocabulary_id") REFERENCES "Vocabulary"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VocabularyKanji" ADD CONSTRAINT "VocabularyKanji_kanji_id_fkey" FOREIGN KEY ("kanji_id") REFERENCES "Kanji"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserKanji" ADD CONSTRAINT "UserKanji_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserKanji" ADD CONSTRAINT "UserKanji_kanji_id_fkey" FOREIGN KEY ("kanji_id") REFERENCES "Kanji"("id") ON DELETE CASCADE ON UPDATE CASCADE;
