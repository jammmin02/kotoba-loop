-- CreateEnum
CREATE TYPE "JlptLevel" AS ENUM ('N5', 'N4', 'N3', 'N2', 'N1');

-- CreateEnum
CREATE TYPE "LearningStatus" AS ENUM ('NEW', 'LEARNING', 'REVIEW', 'WEAK', 'MASTERED');

-- CreateEnum
CREATE TYPE "ImageType" AS ENUM ('object', 'situation', 'ai_generated');

-- CreateEnum
CREATE TYPE "ReviewTargetType" AS ENUM ('vocab', 'kanji');

-- CreateEnum
CREATE TYPE "AIAnalysisStatus" AS ENUM ('pending', 'confirmed', 'edited');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "nickname" TEXT NOT NULL,
    "jlpt_level" "JlptLevel",
    "target_jlpt" "JlptLevel",
    "daily_word_target" INTEGER,
    "daily_study_time" INTEGER,
    "purpose" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VocabularyBook" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "is_public" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "VocabularyBook_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Vocabulary" (
    "id" TEXT NOT NULL,
    "word" TEXT NOT NULL,
    "reading" TEXT NOT NULL,
    "part_of_speech" TEXT NOT NULL,
    "jlpt_level" "JlptLevel",
    "difficulty" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Vocabulary_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VocabularyMeaning" (
    "id" TEXT NOT NULL,
    "vocabulary_id" TEXT NOT NULL,
    "meaning" TEXT NOT NULL,

    CONSTRAINT "VocabularyMeaning_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ExampleSentence" (
    "id" TEXT NOT NULL,
    "vocabulary_id" TEXT NOT NULL,
    "japanese" TEXT NOT NULL,
    "korean" TEXT NOT NULL,
    "source" TEXT,

    CONSTRAINT "ExampleSentence_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Image" (
    "id" TEXT NOT NULL,
    "vocabulary_id" TEXT NOT NULL,
    "image_url" TEXT NOT NULL,
    "image_type" "ImageType" NOT NULL,

    CONSTRAINT "Image_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VocabularyBookItem" (
    "vocabulary_book_id" TEXT NOT NULL,
    "vocabulary_id" TEXT NOT NULL,

    CONSTRAINT "VocabularyBookItem_pkey" PRIMARY KEY ("vocabulary_book_id","vocabulary_id")
);

-- CreateTable
CREATE TABLE "UserVocabulary" (
    "user_id" TEXT NOT NULL,
    "vocabulary_id" TEXT NOT NULL,
    "learning_status" "LearningStatus" NOT NULL DEFAULT 'NEW',
    "is_favorite" BOOLEAN NOT NULL DEFAULT false,
    "last_reviewed_at" TIMESTAMP(3),
    "next_review_at" TIMESTAMP(3),
    "interval_stage" INTEGER NOT NULL DEFAULT 0,
    "correct_count" INTEGER NOT NULL DEFAULT 0,
    "wrong_count" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "UserVocabulary_pkey" PRIMARY KEY ("user_id","vocabulary_id")
);

-- CreateTable
CREATE TABLE "ReviewHistory" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "target_type" "ReviewTargetType" NOT NULL,
    "target_id" TEXT NOT NULL,
    "quiz_type" TEXT NOT NULL,
    "result" BOOLEAN NOT NULL,
    "response_time" INTEGER NOT NULL,
    "reviewed_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ReviewHistory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Tag" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,

    CONSTRAINT "Tag_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VocabularyTag" (
    "vocabulary_id" TEXT NOT NULL,
    "tag_id" TEXT NOT NULL,

    CONSTRAINT "VocabularyTag_pkey" PRIMARY KEY ("vocabulary_id","tag_id")
);

-- CreateTable
CREATE TABLE "AIAnalysis" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "analysis_type" TEXT NOT NULL,
    "input_ref" TEXT NOT NULL,
    "result_json" JSONB NOT NULL,
    "status" "AIAnalysisStatus" NOT NULL DEFAULT 'pending',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AIAnalysis_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Tag_user_id_name_key" ON "Tag"("user_id", "name");

-- AddForeignKey
ALTER TABLE "VocabularyBook" ADD CONSTRAINT "VocabularyBook_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VocabularyMeaning" ADD CONSTRAINT "VocabularyMeaning_vocabulary_id_fkey" FOREIGN KEY ("vocabulary_id") REFERENCES "Vocabulary"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExampleSentence" ADD CONSTRAINT "ExampleSentence_vocabulary_id_fkey" FOREIGN KEY ("vocabulary_id") REFERENCES "Vocabulary"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Image" ADD CONSTRAINT "Image_vocabulary_id_fkey" FOREIGN KEY ("vocabulary_id") REFERENCES "Vocabulary"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VocabularyBookItem" ADD CONSTRAINT "VocabularyBookItem_vocabulary_book_id_fkey" FOREIGN KEY ("vocabulary_book_id") REFERENCES "VocabularyBook"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VocabularyBookItem" ADD CONSTRAINT "VocabularyBookItem_vocabulary_id_fkey" FOREIGN KEY ("vocabulary_id") REFERENCES "Vocabulary"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserVocabulary" ADD CONSTRAINT "UserVocabulary_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserVocabulary" ADD CONSTRAINT "UserVocabulary_vocabulary_id_fkey" FOREIGN KEY ("vocabulary_id") REFERENCES "Vocabulary"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReviewHistory" ADD CONSTRAINT "ReviewHistory_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Tag" ADD CONSTRAINT "Tag_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VocabularyTag" ADD CONSTRAINT "VocabularyTag_vocabulary_id_fkey" FOREIGN KEY ("vocabulary_id") REFERENCES "Vocabulary"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VocabularyTag" ADD CONSTRAINT "VocabularyTag_tag_id_fkey" FOREIGN KEY ("tag_id") REFERENCES "Tag"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AIAnalysis" ADD CONSTRAINT "AIAnalysis_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
