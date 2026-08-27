-- DropIndex
DROP INDEX "Tag_name_trgm_idx";

-- DropIndex
DROP INDEX "Vocabulary_jlpt_level_idx";

-- DropIndex
DROP INDEX "Vocabulary_part_of_speech_trgm_idx";

-- DropIndex
DROP INDEX "Vocabulary_reading_trgm_idx";

-- DropIndex
DROP INDEX "Vocabulary_word_trgm_idx";

-- DropIndex
DROP INDEX "VocabularyMeaning_meaning_trgm_idx";

-- CreateIndex
CREATE INDEX "ReviewHistory_user_id_target_type_target_id_idx" ON "ReviewHistory"("user_id", "target_type", "target_id");

-- CreateIndex
CREATE INDEX "ReviewHistory_user_id_target_type_result_reviewed_at_idx" ON "ReviewHistory"("user_id", "target_type", "result", "reviewed_at");
