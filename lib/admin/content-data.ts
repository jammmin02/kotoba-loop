import "server-only";

import { describeChanges } from "@/lib/admin/diff";
import { ApiError } from "@/lib/api/error";
import { db } from "@/lib/db";
import type { AdminKanjiUpdate, AdminVocabularyUpdate } from "@/lib/validations/admin-data";

/**
 * 단어 수정 — 단어 행은 모든 사용자가 공유하는 사전 항목이라 수정이 전체에 반영된다. 뜻은 위치 기준으로
 * 기존 행을 갱신하고, 늘어난 만큼 추가·줄어든 만큼 삭제한다(행 id를 최대한 보존). 변경 전후 값은
 * 같은 트랜잭션에서 감사 로그에 남긴다.
 */
export async function updateVocabulary(
  adminId: string,
  id: string,
  input: AdminVocabularyUpdate,
): Promise<void> {
  await db.$transaction(async (tx) => {
    const before = await tx.vocabulary.findUnique({
      where: { id },
      include: { meanings: { orderBy: { id: "asc" } } },
    });
    if (!before) throw new ApiError("NOT_FOUND", "단어를 찾을 수 없습니다.");

    await tx.vocabulary.update({
      where: { id },
      data: {
        word: input.word,
        reading: input.reading,
        part_of_speech: input.partOfSpeech,
        jlpt_level: input.jlptLevel,
      },
    });

    const existing = before.meanings;
    for (let i = 0; i < Math.min(existing.length, input.meanings.length); i++) {
      if (existing[i].meaning !== input.meanings[i]) {
        await tx.vocabularyMeaning.update({
          where: { id: existing[i].id },
          data: { meaning: input.meanings[i] },
        });
      }
    }
    if (input.meanings.length > existing.length) {
      await tx.vocabularyMeaning.createMany({
        data: input.meanings
          .slice(existing.length)
          .map((meaning) => ({ vocabulary_id: id, meaning })),
      });
    } else if (input.meanings.length < existing.length) {
      await tx.vocabularyMeaning.deleteMany({
        where: { id: { in: existing.slice(input.meanings.length).map((m) => m.id) } },
      });
    }

    const summary = describeChanges(
      {
        word: before.word,
        reading: before.reading,
        pos: before.part_of_speech,
        jlpt: before.jlpt_level,
        meanings: before.meanings.map((m) => m.meaning),
      },
      {
        word: input.word,
        reading: input.reading,
        pos: input.partOfSpeech,
        jlpt: input.jlptLevel,
        meanings: input.meanings,
      },
      { word: "단어", reading: "읽기", pos: "품사", jlpt: "JLPT", meanings: "뜻" },
    );
    if (!summary) return;

    await tx.adminAuditLog.create({
      data: {
        admin_id: adminId,
        target_user_email: "(시스템)",
        action: "UPDATE_CONTENT",
        target_id: id,
        target_label: `단어 ${before.word}`,
        reason: summary,
      },
    });
  });
}

/** 한자 수정 — 글자(character) 자체는 식별자라 바꿀 수 없다. */
export async function updateKanji(
  adminId: string,
  id: string,
  input: AdminKanjiUpdate,
): Promise<void> {
  await db.$transaction(async (tx) => {
    const before = await tx.kanji.findUnique({ where: { id } });
    if (!before) throw new ApiError("NOT_FOUND", "한자를 찾을 수 없습니다.");

    await tx.kanji.update({
      where: { id },
      data: {
        onyomi: input.onyomi,
        kunyomi: input.kunyomi,
        korean_reading: input.koreanReading,
        meaning: input.meaning,
        stroke_count: input.strokeCount,
        radical: input.radical,
        school_grade: input.schoolGrade,
        jlpt_level_ref: input.jlptLevelRef,
      },
    });

    const summary = describeChanges(
      {
        onyomi: before.onyomi,
        kunyomi: before.kunyomi,
        korean: before.korean_reading,
        meaning: before.meaning,
        strokes: before.stroke_count,
        radical: before.radical,
        grade: before.school_grade,
        jlpt: before.jlpt_level_ref,
      },
      {
        onyomi: input.onyomi,
        kunyomi: input.kunyomi,
        korean: input.koreanReading,
        meaning: input.meaning,
        strokes: input.strokeCount,
        radical: input.radical,
        grade: input.schoolGrade,
        jlpt: input.jlptLevelRef,
      },
      {
        onyomi: "음독",
        kunyomi: "훈독",
        korean: "한국어 음",
        meaning: "뜻",
        strokes: "획수",
        radical: "부수",
        grade: "학년",
        jlpt: "JLPT",
      },
    );
    if (!summary) return;

    await tx.adminAuditLog.create({
      data: {
        admin_id: adminId,
        target_user_email: "(시스템)",
        action: "UPDATE_CONTENT",
        target_id: id,
        target_label: `한자 ${before.character}`,
        reason: summary,
      },
    });
  });
}
