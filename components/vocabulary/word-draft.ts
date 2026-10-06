import type { WordAnalysisResult } from "@/lib/ai/word-analysis";
import type { RelatedExpressionType, VocabularyDetail } from "@/types/vocabulary";

export interface RelatedExpressionRow {
  relationType: RelatedExpressionType;
  expression: string;
  meaning: string;
}

export interface AiHighlight {
  reading: boolean;
  partOfSpeech: boolean;
  jlptLevel: boolean;
}

export interface AiExtras {
  relatedKanji: string[];
  synonyms: string[];
  relatedExpressions: string[];
}

/**
 * 단어 하나의 입력 상태 전체. 새 단어 등록 폼의 메인 단어와 "함께 등록할 단어" 카드가 같은 모양을
 * 쓰므로, 입력 UI(`WordFields`)와 AI 분석 적용 로직을 하나로 공유한다.
 * `ai*` 필드는 "AI가 채운 값" 표시와 저장 시 분석 상태(confirmed/edited) 기록용이다.
 */
export interface WordDraft {
  word: string;
  reading: string;
  partOfSpeech: string;
  jlptLevel: string;
  meanings: string[];
  examples: { japanese: string; korean: string }[];
  relatedExpressions: RelatedExpressionRow[];
  aiAnalysisId?: string;
  aiFieldsEdited: boolean;
  aiHighlight: AiHighlight;
  aiMeaningHighlight: boolean[];
  aiExampleHighlight: boolean[];
  aiRelatedHighlight: boolean[];
  aiExtras: AiExtras | null;
}

/** "AI로 전체 자동 완성"(all)과 섹션별 "이 항목만 채우기"가 어느 섹션에 반영할지. 호출은 항상 전체 분석이다. */
export type AnalysisTarget = "all" | "basic" | "meanings" | "examples" | "related";

export type FieldErrorKey =
  | "word"
  | "reading"
  | "partOfSpeech"
  | "meanings"
  | "examples"
  | "relatedExpressions"
  | "vocabularyBookIds";
export type FieldErrors = Partial<Record<FieldErrorKey, string>>;

const NO_HIGHLIGHT: AiHighlight = { reading: false, partOfSpeech: false, jlptLevel: false };

export function emptyDraft(word = ""): WordDraft {
  return {
    word,
    reading: "",
    partOfSpeech: "",
    jlptLevel: "",
    meanings: [""],
    examples: [],
    relatedExpressions: [],
    aiAnalysisId: undefined,
    aiFieldsEdited: false,
    aiHighlight: NO_HIGHLIGHT,
    aiMeaningHighlight: [],
    aiExampleHighlight: [],
    aiRelatedHighlight: [],
    aiExtras: null,
  };
}

/** 수정 화면 — 저장된 값이라 AI 표시는 없다. */
export function draftFromDetail(detail: VocabularyDetail): WordDraft {
  return {
    ...emptyDraft(detail.word),
    reading: detail.reading,
    partOfSpeech: detail.partOfSpeech,
    jlptLevel: detail.jlptLevel ?? "",
    meanings: detail.meanings,
    examples: detail.examples,
    relatedExpressions: detail.relatedExpressions.map(({ relationType, expression, meaning }) => ({
      relationType,
      expression,
      meaning,
    })),
  };
}

/** 이미 끝난 AI 분석으로 미리 채운 상태(사진 검수·사전·자연어 검색) — 모든 값이 "AI가 채운 값"이다. */
export function draftFromAnalysis(analysis: { id: string; result: WordAnalysisResult }): WordDraft {
  const { result } = analysis;
  return {
    word: result.word,
    reading: result.reading,
    partOfSpeech: result.partOfSpeech,
    jlptLevel: result.jlptLevel ?? "",
    meanings: result.meanings,
    examples: result.examples,
    relatedExpressions: result.relatedExpressionSuggestions,
    aiAnalysisId: analysis.id,
    aiFieldsEdited: false,
    aiHighlight: {
      reading: true,
      partOfSpeech: true,
      jlptLevel: result.jlptLevel != null,
    },
    aiMeaningHighlight: result.meanings.map(() => true),
    aiExampleHighlight: result.examples.map(() => true),
    aiRelatedHighlight: result.relatedExpressionSuggestions.map(() => true),
    aiExtras: {
      relatedKanji: result.relatedKanji,
      synonyms: result.synonyms,
      relatedExpressions: result.relatedExpressions,
    },
  };
}

/** 단어 글자가 바뀌면 이전 분석은 더 이상 이 단어의 것이 아니므로 AI 상태를 모두 지운다. */
export function resetAiState(draft: WordDraft): WordDraft {
  return {
    ...draft,
    aiAnalysisId: undefined,
    aiFieldsEdited: false,
    aiHighlight: NO_HIGHLIGHT,
    aiMeaningHighlight: [],
    aiExampleHighlight: [],
    aiRelatedHighlight: [],
    aiExtras: null,
  };
}

/** AI 분석이 붙은 단어를 사용자가 고치면 "수정됨"으로 기록한다. */
export function markEdited(draft: WordDraft): WordDraft {
  return draft.aiAnalysisId ? { ...draft, aiFieldsEdited: true } : draft;
}

/** 분석 결과를 target이 가리키는 섹션에만 반영한다. */
export function applyAnalysis(
  draft: WordDraft,
  id: string,
  result: WordAnalysisResult,
  target: AnalysisTarget,
): WordDraft {
  const all = target === "all";
  const next: WordDraft = { ...draft, aiAnalysisId: id };

  if (all || target === "basic") {
    next.reading = result.reading;
    next.partOfSpeech = result.partOfSpeech;
    next.jlptLevel = result.jlptLevel ?? "";
    next.aiHighlight = {
      reading: true,
      partOfSpeech: true,
      jlptLevel: result.jlptLevel != null,
    };
  }
  if (all || target === "meanings") {
    next.meanings = result.meanings;
    next.aiMeaningHighlight = result.meanings.map(() => true);
  }
  if (all || target === "examples") {
    next.examples = result.examples;
    next.aiExampleHighlight = result.examples.map(() => true);
  }
  if (all || target === "related") {
    next.relatedExpressions = result.relatedExpressionSuggestions;
    next.aiRelatedHighlight = result.relatedExpressionSuggestions.map(() => true);
  }
  // 전체 분석은 완전히 새 상태라 "AI 그대로"로 보고, 섹션별 재생성은 다른 섹션에 남아 있을 수 있는
  // 사용자 수정 여부를 그대로 유지한다.
  if (all) next.aiFieldsEdited = false;
  next.aiExtras = {
    relatedKanji: result.relatedKanji,
    synonyms: result.synonyms,
    relatedExpressions: result.relatedExpressions,
  };
  return next;
}

/**
 * target 섹션 중 사용자가 직접 입력해 둔(= AI가 채운 값으로 표시되지 않은) 값이 있는 섹션 이름들.
 * 비어 있지 않다면 AI 결과를 적용하기 전에 덮어써도 되는지 물어야 한다.
 */
export function userEnteredSections(draft: WordDraft, target: AnalysisTarget): string[] {
  const all = target === "all";
  const sections: string[] = [];

  if (all || target === "basic") {
    if (
      (draft.reading.trim() && !draft.aiHighlight.reading) ||
      (draft.partOfSpeech && !draft.aiHighlight.partOfSpeech) ||
      (draft.jlptLevel && !draft.aiHighlight.jlptLevel)
    ) {
      sections.push("기본 정보");
    }
  }
  if (all || target === "meanings") {
    if (draft.meanings.some((m, i) => m.trim() && !draft.aiMeaningHighlight[i])) {
      sections.push("뜻");
    }
  }
  if (all || target === "examples") {
    if (
      draft.examples.some(
        (ex, i) => (ex.japanese.trim() || ex.korean.trim()) && !draft.aiExampleHighlight[i],
      )
    ) {
      sections.push("예문");
    }
  }
  if (all || target === "related") {
    if (
      draft.relatedExpressions.some(
        (r, i) => (r.expression.trim() || r.meaning.trim()) && !draft.aiRelatedHighlight[i],
      )
    ) {
      sections.push("관련 표현");
    }
  }
  return sections;
}

/** `vocabularySchema`에 넣을 값 — 빈 항목을 걸러내고 공백을 다듬는다. */
export function toFormValues(draft: WordDraft, vocabularyBookIds: string[]) {
  return {
    word: draft.word,
    reading: draft.reading,
    partOfSpeech: draft.partOfSpeech,
    jlptLevel: draft.jlptLevel || null,
    meanings: draft.meanings.map((m) => m.trim()).filter(Boolean),
    examples: draft.examples
      .filter((ex) => ex.japanese.trim() || ex.korean.trim())
      .map((ex) => ({ japanese: ex.japanese.trim(), korean: ex.korean.trim() })),
    relatedExpressions: draft.relatedExpressions
      .filter((r) => r.expression.trim() || r.meaning.trim())
      .map((r) => ({
        relationType: r.relationType,
        expression: r.expression.trim(),
        meaning: r.meaning.trim(),
      })),
    vocabularyBookIds,
  };
}
