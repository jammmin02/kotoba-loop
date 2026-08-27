-- Trigram indexes speed up the `ILIKE '%term%'` substring matches that
-- GET /api/search issues against word/reading/meaning/tag-name. Prisma 7
-- dropped declarative `postgresqlExtensions` support, so this extension and
-- its indexes are managed only here, not in schema.prisma.
CREATE EXTENSION IF NOT EXISTS pg_trgm;

CREATE INDEX IF NOT EXISTS "Vocabulary_word_trgm_idx" ON "Vocabulary" USING gin ("word" gin_trgm_ops);
CREATE INDEX IF NOT EXISTS "Vocabulary_reading_trgm_idx" ON "Vocabulary" USING gin ("reading" gin_trgm_ops);
CREATE INDEX IF NOT EXISTS "Vocabulary_part_of_speech_trgm_idx" ON "Vocabulary" USING gin ("part_of_speech" gin_trgm_ops);
CREATE INDEX IF NOT EXISTS "VocabularyMeaning_meaning_trgm_idx" ON "VocabularyMeaning" USING gin ("meaning" gin_trgm_ops);
CREATE INDEX IF NOT EXISTS "Tag_name_trgm_idx" ON "Tag" USING gin ("name" gin_trgm_ops);

-- Exact-match lookups (search query equals "N5"/"N4"/... ) benefit from a plain btree index.
CREATE INDEX IF NOT EXISTS "Vocabulary_jlpt_level_idx" ON "Vocabulary" ("jlpt_level");
