-- Seed the 5th Daily Quest catalog row added by PROMPT 37 (lib/quest/constants.ts
-- DAILY_QUEST_SEEDS must be kept in sync with this value). No schema change here — the
-- Quest table already exists (see add_daily_quests); this is a data-only migration.
INSERT INTO "Quest" (id, type, code, title, target_count, exp_reward) VALUES
    ('KANJI_REVIEW_COMPLETE', 'daily', 'KANJI_REVIEW_COMPLETE', '한자 복습 {count}개 완료', 10, 5)
ON CONFLICT (code) DO NOTHING;
