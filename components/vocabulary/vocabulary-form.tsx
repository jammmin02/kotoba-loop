"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

import { achievementToast } from "@/components/game/achievement-toast";
import { PixelPlus, PixelSparkles, PixelX } from "@/components/icons/pixel-icons";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ChipButton } from "@/components/ui/chip-button";
import { Input } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { Select } from "@/components/ui/select";
import { toast } from "@/components/ui/toast";
import { VoiceInputButton } from "@/components/ui/voice-input-button";
import { createExtraWordEntry, ExtraWordCard } from "@/components/vocabulary/extra-word-card";
import type { ExtraWordEntry } from "@/components/vocabulary/extra-word-card";
import type { AnalyzeWordResult, WordAnalysisResult } from "@/lib/ai/word-analysis";
import { ApiClientError, apiFetch } from "@/lib/api/client";
import { cn } from "@/lib/utils";
import {
  JLPT_LEVEL_OPTIONS,
  MAX_EXAMPLES,
  MAX_MEANINGS,
  MAX_RELATED_EXPRESSIONS,
  PART_OF_SPEECH_OPTIONS,
  vocabularySchema,
} from "@/lib/validations/vocabulary";
import type { VocabularyInput } from "@/lib/validations/vocabulary";
import { RELATED_EXPRESSION_TYPE_SELECT_OPTIONS } from "@/lib/vocabulary/related-expression";
import type { RelatedExpressionType, VocabularyDetail } from "@/types/vocabulary";
import type { VocabularyBookSummary } from "@/types/vocabulary-book";

import type { FormEvent } from "react";

interface VocabularyFormProps {
  /** When provided, the form edits this word instead of creating a new one. */
  initialData?: VocabularyDetail;
  /** Preselects a book when arriving from that book's detail page (create mode only). */
  initialBookId?: string;
  /**
   * Pre-fills from an already-completed AI analysis without re-running/re-fetching it — same
   * `{id, result}` shape `POST /api/ai/analyze-word` returns. Used by the PROMPT 31 photo-review
   * screen so editing one of its already-analyzed word candidates reuses this form as-is instead
   * of building a second one.
   */
  initialAnalysis?: { id: string; result: WordAnalysisResult };
  /** Pre-fills just the word text (e.g. a candidate whose AI analysis failed, so only the OCR
   * guess is known). Ignored when `initialAnalysis` is set. */
  initialWord?: string;
  /** When set, a successful save calls this instead of navigating to the word's detail page —
   * lets an embedding screen (e.g. inside a `Modal`) keep control of what happens next. */
  onSaved?: (saved: VocabularyDetail) => void;
  /** When set, replaces the default `router.back()` behavior of the 취소 button. */
  onCancel?: () => void;
}

type FieldErrorKey =
  | "word"
  | "reading"
  | "partOfSpeech"
  | "meanings"
  | "examples"
  | "relatedExpressions"
  | "vocabularyBookIds";
type FieldErrors = Partial<Record<FieldErrorKey, string>>;

/** 화면에서 위에서 아래로 놓인 순서 — 여러 오류가 한꺼번에 있을 때 가장 위의 것으로 이동한다. */
const MAIN_FIELD_ORDER: FieldErrorKey[] = [
  "word",
  "reading",
  "partOfSpeech",
  "meanings",
  "examples",
  "relatedExpressions",
];
const FIELD_ERROR_KEYS: string[] = [...MAIN_FIELD_ORDER, "vocabularyBookIds"];

interface RelatedExpressionRow {
  relationType: RelatedExpressionType;
  expression: string;
  meaning: string;
}

/** "AI로 전체 자동 완성"(전체) 대비 섹션별 "이 항목만 채우기" 버튼이 어디에만 적용할지 고른다 —
 * 둘 다 같은 `/api/ai/analyze-word` 응답을 재사용하고, 이 값에 따라 그중 일부만 폼에 반영한다. */
type AnalysisTarget = "all" | "basic" | "meanings" | "examples" | "related";

function isWordNotFound(err: unknown): err is ApiClientError {
  return err instanceof ApiClientError && err.code === "WORD_NOT_FOUND";
}

const JLPT_SELECT_OPTIONS = [
  { value: "", label: "선택 안 함" },
  ...JLPT_LEVEL_OPTIONS.map((level) => ({ value: level, label: level })),
];

const PART_OF_SPEECH_SELECT_OPTIONS = [
  { value: "", label: "선택해주세요" },
  ...PART_OF_SPEECH_OPTIONS.map((pos) => ({ value: pos, label: pos })),
];

export function VocabularyForm({
  initialData,
  initialBookId,
  initialAnalysis,
  initialWord,
  onSaved,
  onCancel,
}: VocabularyFormProps) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const isEdit = !!initialData;

  const [word, setWord] = useState(
    initialData?.word ?? initialAnalysis?.result.word ?? initialWord ?? "",
  );
  const [reading, setReading] = useState(
    initialData?.reading ?? initialAnalysis?.result.reading ?? "",
  );
  const [partOfSpeech, setPartOfSpeech] = useState(
    initialData?.partOfSpeech ?? initialAnalysis?.result.partOfSpeech ?? "",
  );
  const [jlptLevel, setJlptLevel] = useState<string>(
    initialData?.jlptLevel ?? initialAnalysis?.result.jlptLevel ?? "",
  );
  const [meanings, setMeanings] = useState<string[]>(
    initialData?.meanings ?? initialAnalysis?.result.meanings ?? [""],
  );
  const [examples, setExamples] = useState(
    initialData?.examples ?? initialAnalysis?.result.examples ?? [],
  );
  const [relatedExpressions, setRelatedExpressions] = useState<RelatedExpressionRow[]>(
    initialData?.relatedExpressions.map(({ relationType, expression, meaning }) => ({
      relationType,
      expression,
      meaning,
    })) ??
      initialAnalysis?.result.relatedExpressionSuggestions ??
      [],
  );
  const [selectedBookIds, setSelectedBookIds] = useState<string[]>(
    initialData?.bookIds ?? (initialBookId ? [initialBookId] : []),
  );
  const [error, setError] = useState<string>();
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  // 오류 위치로 스크롤·포커스하라는 요청. 같은 대상을 연속으로 요청해도 다시 동작하도록 n을 올린다.
  const [scrollRequest, setScrollRequest] = useState<{ target: string; n: number } | null>(null);

  const [aiAnalysisId, setAiAnalysisId] = useState<string | undefined>(initialAnalysis?.id);
  const [aiFieldsEdited, setAiFieldsEdited] = useState(false);
  const [aiHighlight, setAiHighlight] = useState({
    reading: !!initialAnalysis,
    partOfSpeech: !!initialAnalysis,
    jlptLevel: !!initialAnalysis && initialAnalysis.result.jlptLevel != null,
  });
  const [aiMeaningHighlight, setAiMeaningHighlight] = useState<boolean[]>(
    initialAnalysis?.result.meanings.map(() => true) ?? [],
  );
  const [aiExampleHighlight, setAiExampleHighlight] = useState<boolean[]>(
    initialAnalysis?.result.examples.map(() => true) ?? [],
  );
  const [aiRelatedHighlight, setAiRelatedHighlight] = useState<boolean[]>(
    initialData ? [] : (initialAnalysis?.result.relatedExpressionSuggestions.map(() => true) ?? []),
  );
  const [aiExtras, setAiExtras] = useState<{
    relatedKanji: string[];
    synonyms: string[];
    relatedExpressions: string[];
  } | null>(
    initialAnalysis
      ? {
          relatedKanji: initialAnalysis.result.relatedKanji,
          synonyms: initialAnalysis.result.synonyms,
          relatedExpressions: initialAnalysis.result.relatedExpressions,
        }
      : null,
  );

  const [extraWords, setExtraWords] = useState<ExtraWordEntry[]>([]);
  const nextExtraKeyRef = useRef(0);

  const { data: books } = useQuery({
    queryKey: ["vocabulary-books"],
    queryFn: () => apiFetch<VocabularyBookSummary[]>("/api/vocabulary-books"),
  });

  // AI가 "존재하지 않는 단어"로 판정하면 폼을 채우지 않고 이 메시지를 모달로 알린다.
  const [notFoundMessage, setNotFoundMessage] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  // 이번 화면에서 이미 저장된 단어들 — "등록하고 계속 추가"로 폼이 비워져도 진행 상황을 보여준다.
  const [registered, setRegistered] = useState<{ id: string; word: string }[]>([]);
  const wordInputRef = useRef<HTMLInputElement>(null);

  // 새 단어 등록 페이지(onSaved 없는 create 모드)에서만 연속 등록을 지원한다. 모달·사진 검수 등
  // onSaved로 저장 후 흐름을 직접 제어하는 호출부는 기존 동작을 그대로 유지한다.
  const showContinue = !isEdit && !onSaved;
  const isDirty = showContinue && (word.trim() !== "" || extraWords.length > 0);

  useEffect(() => {
    if (!isDirty) return;
    const handler = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [isDirty]);

  useEffect(() => {
    if (!scrollRequest) return;
    const el = document.querySelector<HTMLElement>(
      `[data-form-target="${CSS.escape(scrollRequest.target)}"]`,
    );
    if (!el) return;
    el.scrollIntoView({ behavior: "smooth", block: "center" });
    // 헤더의 "이 항목만 채우기" 같은 버튼보다 입력칸을 우선하고, 입력칸이 없으면(단어장 칩) 버튼에 둔다.
    const focusable =
      el.querySelector<HTMLElement>("input, select") ?? el.querySelector<HTMLElement>("button");
    focusable?.focus({ preventScroll: true });
  }, [scrollRequest]);
  // 상단 "AI로 전체 자동 완성" 배너와 섹션별 "이 항목만 채우기" 버튼은 같은 분석 응답을
  // 재사용한다 — target이 어느 섹션에만 반영할지를 고를 뿐, 호출 자체는 항상 전체 분석이다.
  const analyzeMutation = useMutation<AnalyzeWordResult, Error, AnalysisTarget>({
    mutationFn: () =>
      apiFetch<AnalyzeWordResult>("/api/ai/analyze-word", {
        method: "POST",
        body: { word },
        timeoutMs: 45_000,
      }),
    onSuccess: ({ id, result }, target) => {
      const applyBasic = target === "all" || target === "basic";
      const applyMeanings = target === "all" || target === "meanings";
      const applyExamples = target === "all" || target === "examples";
      const applyRelated = target === "all" || target === "related";

      if (applyBasic) {
        setReading(result.reading);
        setPartOfSpeech(result.partOfSpeech);
        setJlptLevel(result.jlptLevel ?? "");
        setAiHighlight({
          reading: true,
          partOfSpeech: true,
          jlptLevel: result.jlptLevel != null,
        });
      }
      if (applyMeanings) {
        setMeanings(result.meanings);
        setAiMeaningHighlight(result.meanings.map(() => true));
      }
      if (applyExamples) {
        setExamples(result.examples);
        setAiExampleHighlight(result.examples.map(() => true));
      }
      if (applyRelated) {
        setRelatedExpressions(result.relatedExpressionSuggestions);
        setAiRelatedHighlight(result.relatedExpressionSuggestions.map(() => true));
      }
      setAiAnalysisId(id);
      // 전체 분석은 완전히 새 상태라 "AI 그대로" 취급하고, 섹션별 재생성은 다른 섹션에 이미
      // 남아있을 수 있는 사용자 수정 여부를 그대로 유지한다(둘 다 덮어쓰면 잘못된 신호가 된다).
      if (target === "all") setAiFieldsEdited(false);
      setAiExtras({
        relatedKanji: result.relatedKanji,
        synonyms: result.synonyms,
        relatedExpressions: result.relatedExpressions,
      });
      setError(undefined);
    },
    onError: (err) => {
      if (isWordNotFound(err)) {
        setNotFoundMessage(err.message);
        return;
      }
      toast.error(err instanceof ApiClientError ? err.message : "AI 분석에 실패했습니다.");
    },
  });

  function isAnalyzing(target: AnalysisTarget) {
    return analyzeMutation.isPending && analyzeMutation.variables === target;
  }

  function markEdited() {
    if (aiAnalysisId) setAiFieldsEdited(true);
  }

  function resetAiState() {
    setAiAnalysisId(undefined);
    setAiFieldsEdited(false);
    setAiHighlight({ reading: false, partOfSpeech: false, jlptLevel: false });
    setAiMeaningHighlight([]);
    setAiExampleHighlight([]);
    setAiRelatedHighlight([]);
    setAiExtras(null);
  }

  function clearFieldError(field: FieldErrorKey) {
    setFieldErrors((prev) => {
      if (!prev[field]) return prev;
      const next = { ...prev };
      delete next[field];
      return next;
    });
  }

  function requestScroll(target: string) {
    setScrollRequest({ target, n: Date.now() });
  }

  function handleWordChange(value: string) {
    clearFieldError("word");
    setWord(value);
    if (aiAnalysisId) resetAiState();
  }

  function handleReadingChange(value: string) {
    clearFieldError("reading");
    setReading(value);
    setAiHighlight((prev) => ({ ...prev, reading: false }));
    markEdited();
  }

  function handlePartOfSpeechChange(value: string) {
    clearFieldError("partOfSpeech");
    setPartOfSpeech(value);
    setAiHighlight((prev) => ({ ...prev, partOfSpeech: false }));
    markEdited();
  }

  function handleJlptLevelChange(value: string) {
    setJlptLevel(value);
    setAiHighlight((prev) => ({ ...prev, jlptLevel: false }));
    markEdited();
  }

  function updateMeaning(index: number, value: string) {
    clearFieldError("meanings");
    setMeanings((prev) => prev.map((m, i) => (i === index ? value : m)));
    setAiMeaningHighlight((prev) => prev.map((h, i) => (i === index ? false : h)));
    markEdited();
  }
  function addMeaning() {
    clearFieldError("meanings");
    setMeanings((prev) => (prev.length >= MAX_MEANINGS ? prev : [...prev, ""]));
    setAiMeaningHighlight((prev) => [...prev, false]);
    markEdited();
  }
  function removeMeaning(index: number) {
    clearFieldError("meanings");
    setMeanings((prev) => (prev.length <= 1 ? prev : prev.filter((_, i) => i !== index)));
    setAiMeaningHighlight((prev) => prev.filter((_, i) => i !== index));
    markEdited();
  }

  function updateExample(index: number, field: "japanese" | "korean", value: string) {
    clearFieldError("examples");
    setExamples((prev) => prev.map((e, i) => (i === index ? { ...e, [field]: value } : e)));
    setAiExampleHighlight((prev) => prev.map((h, i) => (i === index ? false : h)));
    markEdited();
  }
  function addExample() {
    clearFieldError("examples");
    setExamples((prev) =>
      prev.length >= MAX_EXAMPLES ? prev : [...prev, { japanese: "", korean: "" }],
    );
    setAiExampleHighlight((prev) => [...prev, false]);
    markEdited();
  }
  function removeExample(index: number) {
    clearFieldError("examples");
    setExamples((prev) => prev.filter((_, i) => i !== index));
    setAiExampleHighlight((prev) => prev.filter((_, i) => i !== index));
    markEdited();
  }

  function updateRelatedExpression(index: number, patch: Partial<RelatedExpressionRow>) {
    clearFieldError("relatedExpressions");
    setRelatedExpressions((prev) => prev.map((r, i) => (i === index ? { ...r, ...patch } : r)));
    setAiRelatedHighlight((prev) => prev.map((h, i) => (i === index ? false : h)));
    markEdited();
  }
  function addRelatedExpression() {
    clearFieldError("relatedExpressions");
    setRelatedExpressions((prev) =>
      prev.length >= MAX_RELATED_EXPRESSIONS
        ? prev
        : [...prev, { relationType: "SIMILAR", expression: "", meaning: "" }],
    );
    setAiRelatedHighlight((prev) => [...prev, false]);
    markEdited();
  }
  function removeRelatedExpression(index: number) {
    clearFieldError("relatedExpressions");
    setRelatedExpressions((prev) => prev.filter((_, i) => i !== index));
    setAiRelatedHighlight((prev) => prev.filter((_, i) => i !== index));
    markEdited();
  }

  function addBlankExtraWord() {
    const key = `extra-${nextExtraKeyRef.current++}`;
    setExtraWords((prev) => [...prev, createExtraWordEntry(key, "")]);
  }

  function toggleExtraWord(text: string) {
    setExtraWords((prev) => {
      const existingIndex = prev.findIndex((entry) => entry.sourceText === text);
      if (existingIndex !== -1) {
        return prev.filter((_, i) => i !== existingIndex);
      }
      const key = `extra-${nextExtraKeyRef.current++}`;
      return [...prev, createExtraWordEntry(key, text)];
    });
  }

  function removeExtraWord(key: string) {
    setExtraWords((prev) => prev.filter((entry) => entry.key !== key));
  }

  function updateExtraWord(key: string, patch: Partial<ExtraWordEntry>) {
    setExtraWords((prev) =>
      prev.map((entry) => (entry.key === key ? { ...entry, ...patch } : entry)),
    );
  }

  async function analyzeExtraWord(key: string) {
    const entry = extraWords.find((e) => e.key === key);
    if (!entry || !entry.word.trim()) return;
    updateExtraWord(key, { analyzing: true });
    try {
      const { id, result } = await apiFetch<AnalyzeWordResult>("/api/ai/analyze-word", {
        method: "POST",
        body: { word: entry.word },
        timeoutMs: 45_000,
      });
      updateExtraWord(key, {
        reading: result.reading,
        partOfSpeech: result.partOfSpeech,
        jlptLevel: result.jlptLevel ?? "",
        meanings: result.meanings,
        examples: result.examples,
        aiAnalysisId: id,
        aiFieldsEdited: false,
        aiHighlight: { reading: true, partOfSpeech: true, jlptLevel: result.jlptLevel != null },
        aiMeaningHighlight: result.meanings.map(() => true),
        aiExampleHighlight: result.examples.map(() => true),
        analyzing: false,
        error: undefined,
      });
    } catch (err) {
      if (isWordNotFound(err)) setNotFoundMessage(err.message);
      else toast.error(err instanceof ApiClientError ? err.message : "AI 분석에 실패했습니다.");
      updateExtraWord(key, { analyzing: false });
    }
  }

  function toggleBook(id: string) {
    clearFieldError("vocabularyBookIds");
    setSelectedBookIds((prev) =>
      prev.includes(id) ? prev.filter((b) => b !== id) : [...prev, id],
    );
  }

  function resetMainForm() {
    setWord("");
    setReading("");
    setPartOfSpeech("");
    setJlptLevel("");
    setMeanings([""]);
    setExamples([]);
    setRelatedExpressions([]);
    resetAiState();
    analyzeMutation.reset();
    setError(undefined);
    setFieldErrors({});
    wordInputRef.current?.focus();
  }

  // 메인 폼이 완전히 비어 있고 추가 카드가 남아 있으면 카드만 등록한다 — 일부 카드가 실패해
  // 메인 단어는 이미 저장된 뒤 실패한 카드를 다시 시도하는 경우다.
  const skipMain = !isEdit && !word.trim() && extraWords.length > 0;
  const saveCount = (skipMain ? 0 : 1) + extraWords.length;

  async function submit(mode: "stay" | "continue") {
    if (submitting) return;
    setError(undefined);

    setFieldErrors({});

    const nextFieldErrors: FieldErrors = {};
    let otherError: string | undefined;
    const addFieldError = (key: string, message: string) => {
      if (FIELD_ERROR_KEYS.includes(key)) {
        const field = key as FieldErrorKey;
        nextFieldErrors[field] ??= message;
      } else {
        otherError ??= message;
      }
    };

    let mainData: VocabularyInput | null = null;
    if (!skipMain) {
      const parsed = vocabularySchema.safeParse({
        word,
        reading,
        partOfSpeech,
        jlptLevel: jlptLevel || null,
        meanings: meanings.map((m) => m.trim()).filter(Boolean),
        examples: examples
          .filter((ex) => ex.japanese.trim() || ex.korean.trim())
          .map((ex) => ({ japanese: ex.japanese.trim(), korean: ex.korean.trim() })),
        relatedExpressions: relatedExpressions
          .filter((r) => r.expression.trim() || r.meaning.trim())
          .map((r) => ({
            relationType: r.relationType,
            expression: r.expression.trim(),
            meaning: r.meaning.trim(),
          })),
        vocabularyBookIds: selectedBookIds,
      });
      if (parsed.success) mainData = parsed.data;
      else {
        parsed.error.issues.forEach((issue) => addFieldError(String(issue.path[0]), issue.message));
      }
    }

    const extraInputs: { key: string; data: VocabularyInput }[] = [];
    const invalid = new Map<string, string>();
    for (const entry of extraWords) {
      const parsedExtra = vocabularySchema.safeParse({
        word: entry.word,
        reading: entry.reading,
        partOfSpeech: entry.partOfSpeech,
        jlptLevel: entry.jlptLevel || null,
        meanings: entry.meanings.map((m) => m.trim()).filter(Boolean),
        examples: entry.examples
          .filter((ex) => ex.japanese.trim() || ex.korean.trim())
          .map((ex) => ({ japanese: ex.japanese.trim(), korean: ex.korean.trim() })),
        vocabularyBookIds: selectedBookIds,
      });
      if (parsedExtra.success) {
        extraInputs.push({ key: entry.key, data: parsedExtra.data });
        continue;
      }
      // 단어장 선택은 모든 카드가 공유하므로 카드마다 같은 오류를 반복하지 않고 단어장 영역에만 표시한다.
      const cardIssues = parsedExtra.error.issues.filter(
        (issue) => issue.path[0] !== "vocabularyBookIds",
      );
      if (cardIssues.length === 0) {
        addFieldError("vocabularyBookIds", parsedExtra.error.issues[0].message);
      } else {
        invalid.set(entry.key, cardIssues[0].message);
      }
    }

    // 같은 단어(읽기가 같거나 한쪽이 비어 있는 경우)를 한 번에 두 번 등록하지 않도록 뒤쪽 항목에 표시한다.
    const seen: { label: string; word: string; reading: string }[] = [];
    const normalize = (value: string) => value.trim().normalize("NFKC");
    const checkDuplicate = (label: string, rawWord: string, rawReading: string) => {
      const item = { label, word: normalize(rawWord), reading: normalize(rawReading) };
      if (!item.word) return undefined;
      const earlier = seen.find(
        (other) =>
          other.word === item.word &&
          (!other.reading || !item.reading || other.reading === item.reading),
      );
      seen.push(item);
      return earlier;
    };
    if (!skipMain) checkDuplicate("메인 단어", word, reading);
    extraWords.forEach((entry, index) => {
      const earlier = checkDuplicate(`단어 ${index + 2}`, entry.word, entry.reading);
      if (earlier && !invalid.has(entry.key)) {
        invalid.set(
          entry.key,
          `「${entry.word.trim()}」은(는) ${earlier.label}과(와) 같은 단어예요. 하나만 남겨주세요.`,
        );
      }
    });

    const fieldErrorCount = Object.keys(nextFieldErrors).length;
    if (fieldErrorCount > 0 || invalid.size > 0 || otherError) {
      setFieldErrors(nextFieldErrors);
      setExtraWords((prev) =>
        prev.map((e) =>
          invalid.has(e.key)
            ? { ...e, error: invalid.get(e.key), expanded: true }
            : { ...e, error: undefined },
        ),
      );
      setError(otherError);
      const firstExtra = extraWords.find((e) => invalid.has(e.key));
      requestScroll(
        MAIN_FIELD_ORDER.find((key) => nextFieldErrors[key]) ??
          firstExtra?.key ??
          (nextFieldErrors.vocabularyBookIds ? "vocabularyBookIds" : "form-error"),
      );
      toast.error(
        `입력을 확인해주세요 (${fieldErrorCount + invalid.size + (otherError ? 1 : 0)}곳)`,
      );
      return;
    }

    setSubmitting(true);
    try {
      let mainSaved: VocabularyDetail | null = null;
      if (mainData) {
        try {
          mainSaved = isEdit
            ? await apiFetch<VocabularyDetail>(`/api/vocabularies/${initialData.id}`, {
                method: "PATCH",
                body: mainData,
              })
            : await apiFetch<VocabularyDetail>("/api/vocabularies", {
                method: "POST",
                body: { ...mainData, ...(aiAnalysisId ? { aiAnalysisId, aiFieldsEdited } : {}) },
              });
        } catch (err) {
          setError(err instanceof ApiClientError ? err.message : "저장 중 오류가 발생했습니다.");
          requestScroll("form-error");
          return;
        }
      }

      const savedWords: VocabularyDetail[] = mainSaved ? [mainSaved] : [];
      const unlocked = [...(mainSaved?.unlockedAchievements ?? [])];
      const savedKeys = new Set<string>();
      const failures = new Map<string, string>();

      for (const { key, data } of extraInputs) {
        try {
          const savedExtra = await apiFetch<VocabularyDetail>("/api/vocabularies", {
            method: "POST",
            body: data,
          });
          savedWords.push(savedExtra);
          savedKeys.add(key);
          if (savedExtra.unlockedAchievements) unlocked.push(...savedExtra.unlockedAchievements);
        } catch (err) {
          const message = err instanceof ApiClientError ? err.message : "오류가 발생했습니다.";
          failures.set(key, message);
          toast.error(`"${data.word}" 등록에 실패했어요: ${message}`);
        }
      }

      queryClient.invalidateQueries({ queryKey: ["vocabularies"] });
      queryClient.invalidateQueries({ queryKey: ["vocabulary-books"] });
      if (savedWords.length > 0) {
        toast.success(
          savedWords.length > 1
            ? `단어 ${savedWords.length}개를 ${isEdit ? "저장" : "등록"}했습니다.`
            : isEdit
              ? "단어를 수정했습니다."
              : `「${savedWords[0].word}」를 등록했어요.`,
        );
      }

      const uniqueAchievements = Array.from(new Map(unlocked.map((a) => [a.title, a])).values());
      if (uniqueAchievements.length > 0) {
        uniqueAchievements.forEach((achievement) => achievementToast.show(achievement.title));
        queryClient.invalidateQueries({ queryKey: ["game", "achievements"] });
      }

      if (!isEdit) {
        setRegistered((prev) => [
          ...prev,
          ...savedWords.map((saved) => ({ id: saved.id, word: saved.word })),
        ]);
      }
      // 저장된 카드는 제거하고, 실패한 카드는 사유와 함께 남겨 바로 고쳐서 다시 시도할 수 있게 한다.
      setExtraWords((prev) =>
        prev
          .filter((e) => !savedKeys.has(e.key))
          .map((e) =>
            failures.has(e.key) ? { ...e, error: failures.get(e.key), expanded: true } : e,
          ),
      );

      if (failures.size > 0) {
        // 메인 단어는 이미 저장됐으니 다시 제출되지 않도록 비운다(수정 모드는 그대로 둔다).
        if (mainSaved && !isEdit) resetMainForm();
        return;
      }

      if (mode === "continue" && showContinue) {
        resetMainForm();
        return;
      }

      const target = mainSaved ?? savedWords[0];
      if (mainSaved && onSaved) onSaved(mainSaved);
      else if (target) router.push(`/words/${target.id}`);
    } finally {
      setSubmitting(false);
    }
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    void submit("stay");
  }

  return (
    <form
      onSubmit={handleSubmit}
      onKeyDown={(e) => {
        if (showContinue && (e.ctrlKey || e.metaKey) && e.key === "Enter") {
          e.preventDefault();
          void submit("continue");
        }
      }}
      className="flex flex-col gap-6"
      noValidate
    >
      {registered.length > 0 && (
        <div
          role="status"
          className="flex flex-col gap-2 border-2 border-success bg-success/10 p-3"
        >
          <p className="text-xs font-bold text-success">✓ 이번에 {registered.length}개 등록</p>
          <div className="flex gap-2 overflow-x-auto pb-1">
            {registered.map((item) => (
              <Link
                key={item.id}
                href={`/words/${item.id}`}
                className="shrink-0 border-2 border-pixel-ink bg-surface px-2.5 py-1 text-sm font-bold hover:bg-background"
              >
                {item.word}
              </Link>
            ))}
          </div>
        </div>
      )}
      <Card className="flex flex-col gap-4">
        <div className="flex items-end gap-2" data-form-target="word">
          <div className="min-w-0 flex-1">
            <Input
              ref={wordInputRef}
              label="단어"
              value={word}
              onChange={(e) => handleWordChange(e.target.value)}
              error={fieldErrors.word}
              required
            />
          </div>
          <VoiceInputButton onResult={handleWordChange} />
        </div>

        <div className="flex flex-col gap-2 border-2 border-pixel-ink bg-accent/10 p-3 ring-2 ring-accent/40">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <p className="text-sm font-bold text-foreground">✨ AI로 전체 자동 완성</p>
              <p className="text-xs text-foreground/70">
                단어만 입력하면 읽기 · 품사 · JLPT · 뜻 · 예문 · 관련 표현까지 한 번에 채워드려요
              </p>
            </div>
            <Button
              type="button"
              variant="quest"
              size="sm"
              loading={isAnalyzing("all")}
              disabled={!word.trim() || analyzeMutation.isPending}
              onClick={() => analyzeMutation.mutate("all")}
            >
              <PixelSparkles className="size-3.5" aria-hidden="true" />
              전체 자동분석
            </Button>
          </div>
          {isAnalyzing("all") && (
            <p className="text-xs text-foreground/50">
              AI가 분석하고 있어요. 최대 30초 정도 걸릴 수 있어요.
            </p>
          )}
          {analyzeMutation.isError && !isWordNotFound(analyzeMutation.error) && (
            <p className="text-xs text-error">
              AI 분석에 실패했어요. 직접 입력해도 괜찮아요.{" "}
              <button
                type="button"
                onClick={() => analyzeMutation.mutate("all")}
                className="font-bold text-primary hover:underline"
              >
                다시 시도
              </button>
            </p>
          )}
        </div>

        <div className="flex items-center justify-between border-t-2 border-dashed border-pixel-ink/35 pt-3">
          <span className="text-sm font-medium text-foreground">기본 정보</span>
          <button
            type="button"
            onClick={() => analyzeMutation.mutate("basic")}
            disabled={!word.trim() || analyzeMutation.isPending}
            className="flex items-center gap-1 text-xs font-bold text-primary hover:underline disabled:pointer-events-none disabled:opacity-40"
          >
            <PixelSparkles className="size-3" aria-hidden="true" />
            {isAnalyzing("basic") ? "채우는 중..." : "이 항목만 채우기"}
          </button>
        </div>

        <div className="flex flex-col gap-1" data-form-target="reading">
          <Input
            label="후리가나"
            value={reading}
            onChange={(e) => handleReadingChange(e.target.value)}
            className={cn(aiHighlight.reading && "ring-2 ring-accent/60 bg-accent/5")}
            error={fieldErrors.reading}
            required
          />
          {aiHighlight.reading && (
            <span className="text-[11px] font-bold text-accent">✨ AI가 채운 값</span>
          )}
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="flex flex-col gap-1" data-form-target="partOfSpeech">
            <Select
              label="품사"
              value={partOfSpeech}
              onChange={(e) => handlePartOfSpeechChange(e.target.value)}
              options={PART_OF_SPEECH_SELECT_OPTIONS}
              className={cn(aiHighlight.partOfSpeech && "ring-2 ring-accent/60 bg-accent/5")}
              error={fieldErrors.partOfSpeech}
              required
            />
            {aiHighlight.partOfSpeech && (
              <span className="text-[11px] font-bold text-accent">✨ AI가 채운 값</span>
            )}
          </div>
          <div className="flex flex-col gap-1">
            <Select
              label="JLPT 난이도"
              value={jlptLevel}
              onChange={(e) => handleJlptLevelChange(e.target.value)}
              options={JLPT_SELECT_OPTIONS}
              className={cn(aiHighlight.jlptLevel && "ring-2 ring-accent/60 bg-accent/5")}
            />
            {aiHighlight.jlptLevel && (
              <span className="text-[11px] font-bold text-accent">✨ AI가 채운 값</span>
            )}
          </div>
        </div>
      </Card>

      <Card className="flex flex-col gap-3" data-form-target="meanings">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-foreground">
            뜻<span className="text-error"> *</span>
          </span>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => analyzeMutation.mutate("meanings")}
              disabled={!word.trim() || analyzeMutation.isPending}
              className="flex items-center gap-1 text-xs font-bold text-primary hover:underline disabled:pointer-events-none disabled:opacity-40"
            >
              <PixelSparkles className="size-3" aria-hidden="true" />
              {isAnalyzing("meanings") ? "채우는 중..." : "이 항목만 채우기"}
            </button>
            <button
              type="button"
              onClick={addMeaning}
              className="flex items-center gap-1 text-xs font-bold text-primary hover:underline"
            >
              <PixelPlus className="size-3" aria-hidden="true" />뜻 추가
            </button>
          </div>
        </div>
        {meanings.map((meaning, index) => (
          <div key={index} className="flex flex-col gap-1">
            <div className="flex items-center gap-2">
              <Input
                value={meaning}
                onChange={(e) => updateMeaning(index, e.target.value)}
                placeholder={`뜻 ${index + 1}`}
                className={cn(
                  "flex-1",
                  aiMeaningHighlight[index] && "ring-2 ring-accent/60 bg-accent/5",
                )}
              />
              <button
                type="button"
                onClick={() => removeMeaning(index)}
                disabled={meanings.length <= 1}
                aria-label="뜻 삭제"
                className="flex size-9 shrink-0 items-center justify-center border-2 border-pixel-ink bg-surface text-foreground/60 shadow-bevel-raised transition hover:bg-background disabled:pointer-events-none disabled:opacity-40"
              >
                <PixelX className="size-3.5" aria-hidden="true" />
              </button>
            </div>
            {aiMeaningHighlight[index] && (
              <span className="text-[11px] font-bold text-accent">✨ AI가 채운 값</span>
            )}
          </div>
        ))}
        {fieldErrors.meanings && (
          <p role="alert" className="text-xs text-error">
            {fieldErrors.meanings}
          </p>
        )}
      </Card>

      <Card className="flex flex-col gap-3" data-form-target="examples">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-foreground">예문</span>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => analyzeMutation.mutate("examples")}
              disabled={!word.trim() || analyzeMutation.isPending}
              className="flex items-center gap-1 text-xs font-bold text-primary hover:underline disabled:pointer-events-none disabled:opacity-40"
            >
              <PixelSparkles className="size-3" aria-hidden="true" />
              {isAnalyzing("examples") ? "채우는 중..." : "이 항목만 채우기"}
            </button>
            <button
              type="button"
              onClick={addExample}
              className="flex items-center gap-1 text-xs font-bold text-primary hover:underline"
            >
              <PixelPlus className="size-3" aria-hidden="true" />
              예문 추가
            </button>
          </div>
        </div>
        {examples.length === 0 && (
          <p className="text-xs text-foreground/50">선택 사항이에요. 필요하면 추가해보세요.</p>
        )}
        {examples.map((example, index) => (
          <div key={index} className="flex flex-col gap-1">
            <div
              className={cn(
                "flex items-start gap-2 border-2 border-pixel-ink bg-background p-3",
                aiExampleHighlight[index] && "ring-2 ring-accent/60 bg-accent/5",
              )}
            >
              <div className="flex flex-1 flex-col gap-2">
                <Input
                  value={example.japanese}
                  onChange={(e) => updateExample(index, "japanese", e.target.value)}
                  placeholder="일본어 예문"
                />
                <Input
                  value={example.korean}
                  onChange={(e) => updateExample(index, "korean", e.target.value)}
                  placeholder="한국어 해석"
                />
              </div>
              <button
                type="button"
                onClick={() => removeExample(index)}
                aria-label="예문 삭제"
                className="flex size-9 shrink-0 items-center justify-center border-2 border-pixel-ink bg-surface text-foreground/60 shadow-bevel-raised transition hover:bg-background"
              >
                <PixelX className="size-3.5" aria-hidden="true" />
              </button>
            </div>
            {aiExampleHighlight[index] && (
              <span className="text-[11px] font-bold text-accent">✨ AI가 채운 값</span>
            )}
          </div>
        ))}
        {fieldErrors.examples && (
          <p role="alert" className="text-xs text-error">
            {fieldErrors.examples}
          </p>
        )}
      </Card>

      <Card className="flex flex-col gap-3" data-form-target="relatedExpressions">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-foreground">관련 표현</span>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => analyzeMutation.mutate("related")}
              disabled={!word.trim() || analyzeMutation.isPending}
              className="flex items-center gap-1 text-xs font-bold text-primary hover:underline disabled:pointer-events-none disabled:opacity-40"
            >
              <PixelSparkles className="size-3" aria-hidden="true" />
              {isAnalyzing("related") ? "채우는 중..." : "이 항목만 채우기"}
            </button>
            <button
              type="button"
              onClick={addRelatedExpression}
              className="flex items-center gap-1 text-xs font-bold text-primary hover:underline"
            >
              <PixelPlus className="size-3" aria-hidden="true" />
              표현 추가
            </button>
          </div>
        </div>
        {relatedExpressions.length === 0 && (
          <p className="text-xs text-foreground/50">
            선택 사항이에요. 유사어·반대말·파생어처럼 이 단어와 관계된 표현을 추가해보세요.
          </p>
        )}
        {relatedExpressions.map((related, index) => (
          <div key={index} className="flex flex-col gap-1">
            <div
              className={cn(
                "flex items-start gap-2 border-2 border-pixel-ink bg-background p-3",
                aiRelatedHighlight[index] && "ring-2 ring-accent/60 bg-accent/5",
              )}
            >
              <Select
                value={related.relationType}
                onChange={(e) =>
                  updateRelatedExpression(index, {
                    relationType: e.target.value as RelatedExpressionType,
                  })
                }
                options={RELATED_EXPRESSION_TYPE_SELECT_OPTIONS}
                className="w-28 shrink-0"
              />
              <div className="flex flex-1 flex-col gap-2">
                <Input
                  value={related.expression}
                  onChange={(e) => updateRelatedExpression(index, { expression: e.target.value })}
                  placeholder="일본어 표현"
                />
                <Input
                  value={related.meaning}
                  onChange={(e) => updateRelatedExpression(index, { meaning: e.target.value })}
                  placeholder="뜻"
                />
              </div>
              <button
                type="button"
                onClick={() => removeRelatedExpression(index)}
                aria-label="관련 표현 삭제"
                className="flex size-9 shrink-0 items-center justify-center border-2 border-pixel-ink bg-surface text-foreground/60 shadow-bevel-raised transition hover:bg-background"
              >
                <PixelX className="size-3.5" aria-hidden="true" />
              </button>
            </div>
            {aiRelatedHighlight[index] && (
              <span className="text-[11px] font-bold text-accent">✨ AI가 채운 값</span>
            )}
          </div>
        ))}
        {fieldErrors.relatedExpressions && (
          <p role="alert" className="text-xs text-error">
            {fieldErrors.relatedExpressions}
          </p>
        )}
      </Card>

      {aiExtras && (
        <Card className="flex flex-col gap-3">
          <span className="text-sm font-medium text-foreground">함께 등록할 단어 후보</span>
          {aiExtras.relatedKanji.length > 0 && (
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs text-foreground/60">관련 한자</span>
              {aiExtras.relatedKanji.map((kanji) => (
                <span
                  key={kanji}
                  className="border-2 border-pixel-ink bg-surface px-2.5 py-0.5 text-xs font-bold"
                >
                  {kanji}
                </span>
              ))}
            </div>
          )}
          {aiExtras.synonyms.length > 0 && (
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs text-foreground/60">유의어</span>
              {aiExtras.synonyms.map((synonym) => {
                const added = extraWords.some((entry) => entry.sourceText === synonym);
                return (
                  <button
                    key={synonym}
                    type="button"
                    onClick={() => toggleExtraWord(synonym)}
                    className={cn(
                      "border-2 border-pixel-ink px-2.5 py-0.5 text-xs font-bold transition",
                      added
                        ? "bg-primary text-primary-foreground"
                        : "bg-surface hover:bg-background",
                    )}
                  >
                    {added ? "✓ " : "+ "}
                    {synonym}
                  </button>
                );
              })}
            </div>
          )}
          {aiExtras.relatedExpressions.length > 0 && (
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs text-foreground/60">연관 표현</span>
              {aiExtras.relatedExpressions.map((expr) => {
                const added = extraWords.some((entry) => entry.sourceText === expr);
                return (
                  <button
                    key={expr}
                    type="button"
                    onClick={() => toggleExtraWord(expr)}
                    className={cn(
                      "border-2 border-pixel-ink px-2.5 py-0.5 text-xs font-bold transition",
                      added
                        ? "bg-primary text-primary-foreground"
                        : "bg-surface hover:bg-background",
                    )}
                  >
                    {added ? "✓ " : "+ "}
                    {expr}
                  </button>
                );
              })}
            </div>
          )}
          <p className="text-xs text-foreground/50">
            유의어·연관 표현을 클릭하면 이 단어와는 별개로 새로 등록할 단어 폼이 아래에 추가돼요 (위
            &ldquo;관련 표현&rdquo; 섹션과 달리 새 단어를 만들어요). 다시 누르면 취소돼요. 관련
            한자는 추후 한자 학습 기능(Phase 9)과 연결될 예정이라 지금은 참고용 텍스트로만 표시돼요.
          </p>
        </Card>
      )}

      {extraWords.map((entry, index) => (
        <div key={entry.key} data-form-target={entry.key}>
          <ExtraWordCard
            entry={entry}
            index={index}
            onChange={(patch) => updateExtraWord(entry.key, patch)}
            onRemove={() => removeExtraWord(entry.key)}
            onAnalyze={() => analyzeExtraWord(entry.key)}
          />
        </div>
      ))}

      {showContinue && (
        <button
          type="button"
          onClick={addBlankExtraWord}
          className="flex min-h-11 items-center justify-center gap-1 border-2 border-dashed border-pixel-ink/60 text-sm font-bold text-foreground/70 transition hover:bg-surface"
        >
          <PixelPlus className="size-3.5" aria-hidden="true" />
          단어 카드 추가
        </button>
      )}

      <Card className="flex flex-col gap-3" data-form-target="vocabularyBookIds">
        <span className="text-sm font-medium text-foreground">
          단어장<span className="text-error"> *</span>
        </span>
        {books && books.length === 0 && (
          <p className="text-xs text-foreground/60">
            먼저 단어장을 만들어주세요.{" "}
            <Link href="/vocabulary" className="font-bold text-primary hover:underline">
              단어장 만들러 가기
            </Link>
          </p>
        )}
        <div className="flex flex-wrap gap-2">
          {books?.map((book) => (
            <ChipButton
              key={book.id}
              selected={selectedBookIds.includes(book.id)}
              onClick={() => toggleBook(book.id)}
            >
              {book.name}
            </ChipButton>
          ))}
        </div>
        {fieldErrors.vocabularyBookIds && (
          <p role="alert" className="text-xs text-error">
            {fieldErrors.vocabularyBookIds}
          </p>
        )}
      </Card>

      {error && (
        <p role="alert" data-form-target="form-error" className="text-sm text-error">
          {error}
        </p>
      )}

      <div
        className={cn(
          showContinue
            ? "sticky bottom-16 z-30 -mx-4 flex flex-col gap-2 border-t-2 border-pixel-ink bg-background px-4 py-3 sm:-mx-6 sm:flex-row sm:justify-end sm:px-6 lg:bottom-0 lg:-mx-8 lg:px-8"
            : "flex justify-end gap-2",
        )}
      >
        <Button
          type="button"
          variant="outline"
          className={cn(showContinue && "order-3 h-11 sm:order-1 sm:h-10")}
          onClick={() => (onCancel ? onCancel() : router.back())}
        >
          취소
        </Button>
        <Button
          type="submit"
          variant={showContinue ? "outline" : "primary"}
          className={cn(showContinue && "order-2 h-11 sm:h-10")}
          loading={submitting}
        >
          {isEdit ? "저장" : saveCount > 1 ? `등록 (${saveCount}개)` : "등록"}
        </Button>
        {showContinue && (
          <Button
            type="button"
            variant="quest"
            className="order-1 h-11 sm:order-3 sm:h-10"
            loading={submitting}
            onClick={() => void submit("continue")}
            title="Ctrl+Enter"
          >
            {saveCount > 1 ? `등록하고 계속 추가 (${saveCount}개)` : "등록하고 계속 추가"}
          </Button>
        )}
      </div>
      <Modal
        open={notFoundMessage !== null}
        onClose={() => setNotFoundMessage(null)}
        title="존재하지 않는 단어예요"
      >
        <div className="flex flex-col gap-4">
          <p className="text-sm text-foreground">{notFoundMessage}</p>
          <p className="text-xs text-foreground/60">
            단어를 고쳐 다시 분석하거나, 그대로 직접 입력해 등록할 수도 있어요.
          </p>
          <Button type="button" className="self-end" onClick={() => setNotFoundMessage(null)}>
            확인
          </Button>
        </div>
      </Modal>
    </form>
  );
}
