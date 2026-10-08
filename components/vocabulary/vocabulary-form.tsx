"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";

import { achievementToast } from "@/components/game/achievement-toast";
import { PixelPlus } from "@/components/icons/pixel-icons";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ChipButton } from "@/components/ui/chip-button";
import { toast } from "@/components/ui/toast";
import { DuplicateReviewModal } from "@/components/vocabulary/duplicate-review-modal";
import type {
  DuplicateResolution,
  DuplicateReviewItem,
} from "@/components/vocabulary/duplicate-review-modal";
import { createExtraWordEntry, ExtraWordCard } from "@/components/vocabulary/extra-word-card";
import type { ExtraWordEntry } from "@/components/vocabulary/extra-word-card";
import {
  clearStoredNewWordDraft,
  describeNewWordDraft,
  getInitialStoredNewWordDraft,
  nextExtraKeyIndex,
  parseNewWordDraft,
  resetInitialStoredNewWordDraft,
  saveStoredNewWordDraft,
  subscribeNever,
} from "@/components/vocabulary/new-word-draft-storage";
import {
  draftFromAnalysis,
  draftFromDetail,
  emptyDraft,
  toFormValues,
} from "@/components/vocabulary/word-draft";
import type { FieldErrorKey, FieldErrors, WordDraft } from "@/components/vocabulary/word-draft";
import { WordFields } from "@/components/vocabulary/word-fields";
import type { WordAnalysisResult } from "@/lib/ai/word-analysis";
import { ApiClientError, apiFetch } from "@/lib/api/client";
import { cn } from "@/lib/utils";
import { vocabularySchema } from "@/lib/validations/vocabulary";
import type { VocabularyInput } from "@/lib/validations/vocabulary";
import type {
  BatchSaveItemResult,
  BatchSaveResponse,
  DuplicateCheckResult,
  VocabularyDetail,
} from "@/types/vocabulary";
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

type SaveMode = "stay" | "continue";

/** 검증을 통과한, 저장할 내용 전체 — 중복 확인 모달을 거쳐도 같은 내용을 그대로 저장한다. */
interface SavePlan {
  /** 메인 폼이 비어 카드만 등록하는 경우 null. */
  main: VocabularyInput | null;
  extras: {
    key: string;
    data: VocabularyInput;
    aiAnalysisId?: string;
    aiFieldsEdited: boolean;
  }[];
}

/** 중복 확인 모달에서 고른 항목별 처리 방식 — 저장할 항목(main?, ...extras)과 같은 순서. */
interface BatchResolution {
  resolution: DuplicateResolution;
  existingId?: string;
}

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

  const [main, setMain] = useState<WordDraft>(() =>
    initialData
      ? draftFromDetail(initialData)
      : initialAnalysis
        ? draftFromAnalysis(initialAnalysis)
        : emptyDraft(initialWord ?? ""),
  );
  // 저장 후 폼을 비울 때 WordFields를 새로 마운트해 분석 상태·모달 등 내부 상태까지 초기화한다.
  const [mainKey, setMainKey] = useState(0);
  // 카드가 있을 때 메인 단어도 카드처럼 접을 수 있다. 접어도 입력 UI는 마운트된 채 숨기기만 해서
  // 진행 중인 AI 분석 같은 내부 상태가 사라지지 않는다.
  const [mainExpanded, setMainExpanded] = useState(true);
  const [selectedBookIds, setSelectedBookIds] = useState<string[]>(
    initialData?.bookIds ?? (initialBookId ? [initialBookId] : []),
  );
  const [error, setError] = useState<string>();
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  // 오류 위치로 스크롤·포커스하라는 요청. 같은 대상을 연속으로 요청해도 다시 동작하도록 n을 올린다.
  const [scrollRequest, setScrollRequest] = useState<{ target: string; n: number } | null>(null);

  const [extraWords, setExtraWords] = useState<ExtraWordEntry[]>([]);
  const nextExtraKeyRef = useRef(0);

  const { data: books } = useQuery({
    queryKey: ["vocabulary-books"],
    queryFn: () => apiFetch<VocabularyBookSummary[]>("/api/vocabulary-books"),
  });

  const [submitting, setSubmitting] = useState(false);
  const [dupReview, setDupReview] = useState<{
    plan: SavePlan;
    mode: SaveMode;
    items: DuplicateReviewItem[];
  } | null>(null);
  // 이번 화면에서 이미 저장된 단어들 — "등록하고 계속 추가"로 폼이 비워져도 진행 상황을 보여준다.
  const [registered, setRegistered] = useState<{ id: string; word: string }[]>([]);
  const wordInputRef = useRef<HTMLInputElement>(null);

  // 새 단어 등록 페이지(onSaved 없는 create 모드)에서만 연속 등록을 지원한다. 모달·사진 검수 등
  // onSaved로 저장 후 흐름을 직접 제어하는 호출부는 기존 동작을 그대로 유지한다.
  const showContinue = !isEdit && !onSaved;
  const isDirty = showContinue && (main.word.trim() !== "" || extraWords.length > 0);

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

  // 작성 중이던 초안 복원 — 서버 렌더링에서는 항상 없는 것으로 보고, 화면에 처음 들어올 때 저장돼 있던
  // 것만 복원 대상으로 삼는다(자동 저장 중인 값과 헷갈리지 않게).
  const storedRaw = useSyncExternalStore(subscribeNever, getInitialStoredNewWordDraft, () => null);
  const [restoreHandled, setRestoreHandled] = useState(false);
  const storedDraft = useMemo(
    () => (showContinue && !restoreHandled ? parseNewWordDraft(storedRaw) : null),
    [showContinue, restoreHandled, storedRaw],
  );
  const hadDraftRef = useRef(false);

  useEffect(() => () => resetInitialStoredNewWordDraft(), []);

  useEffect(() => {
    // 복원 여부를 고르기 전에는 저장돼 있던 초안을 덮어쓰지 않는다.
    if (!showContinue || storedDraft) return;
    if (!isDirty) {
      if (hadDraftRef.current) {
        hadDraftRef.current = false;
        clearStoredNewWordDraft();
      }
      return;
    }
    hadDraftRef.current = true;
    const timer = setTimeout(
      () => saveStoredNewWordDraft({ main, extraWords, selectedBookIds }),
      400,
    );
    return () => clearTimeout(timer);
  }, [showContinue, storedDraft, isDirty, main, extraWords, selectedBookIds]);

  function restoreDraft() {
    if (!storedDraft) return;
    setMain(storedDraft.main);
    setMainKey((k) => k + 1);
    setMainExpanded(true);
    setExtraWords(storedDraft.extraWords);
    nextExtraKeyRef.current = nextExtraKeyIndex(storedDraft.extraWords);
    if (storedDraft.selectedBookIds.length > 0) setSelectedBookIds(storedDraft.selectedBookIds);
    setRestoreHandled(true);
  }

  function discardDraft() {
    clearStoredNewWordDraft();
    setRestoreHandled(true);
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

  function addBlankExtraWord() {
    const key = `extra-${nextExtraKeyRef.current++}`;
    // 새 카드에 집중할 수 있게 메인 단어와 앞선 카드는 접는다(접힌 곳에도 단어·뜻 요약과 오류 표시는 남는다).
    setMainExpanded(false);
    setExtraWords((prev) => [
      ...prev.map((entry) => ({ ...entry, expanded: false })),
      createExtraWordEntry(key, ""),
    ]);
  }

  const mainCollapsed = !mainExpanded && extraWords.length > 0;
  const allExpanded = !mainCollapsed && extraWords.every((entry) => entry.expanded);

  function toggleAll() {
    setMainExpanded(!allExpanded);
    setExtraWords((prev) => prev.map((entry) => ({ ...entry, expanded: !allExpanded })));
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

  function toggleBook(id: string) {
    clearFieldError("vocabularyBookIds");
    setSelectedBookIds((prev) =>
      prev.includes(id) ? prev.filter((b) => b !== id) : [...prev, id],
    );
  }

  function resetMainForm() {
    setMain(emptyDraft());
    setMainKey((k) => k + 1);
    setMainExpanded(true);
    setError(undefined);
    setFieldErrors({});
    // 새로 마운트된 단어 입력칸에 포커스를 준다.
    requestAnimationFrame(() => wordInputRef.current?.focus());
  }

  // 메인 폼이 완전히 비어 있고 추가 카드가 남아 있으면 카드만 등록한다 — 일부 카드가 실패해
  // 메인 단어는 이미 저장된 뒤 실패한 카드를 다시 시도하는 경우다.
  const skipMain = !isEdit && !main.word.trim() && extraWords.length > 0;
  const saveCount = (skipMain ? 0 : 1) + extraWords.length;

  async function submit(mode: SaveMode) {
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
      const parsed = vocabularySchema.safeParse(toFormValues(main, selectedBookIds));
      if (parsed.success) mainData = parsed.data;
      else {
        parsed.error.issues.forEach((issue) => addFieldError(String(issue.path[0]), issue.message));
      }
    }

    const extraInputs: { key: string; data: VocabularyInput }[] = [];
    const invalid = new Map<string, string>();
    for (const entry of extraWords) {
      const parsedExtra = vocabularySchema.safeParse(toFormValues(entry, selectedBookIds));
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
    if (!skipMain) checkDuplicate("메인 단어", main.word, main.reading);
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
      if (MAIN_FIELD_ORDER.some((key) => nextFieldErrors[key])) setMainExpanded(true);
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

    const plan: SavePlan = {
      main: mainData,
      extras: extraInputs.map(({ key, data }) => {
        const entry = extraWords.find((e) => e.key === key);
        return {
          key,
          data,
          aiAnalysisId: entry?.aiAnalysisId,
          aiFieldsEdited: entry?.aiFieldsEdited ?? false,
        };
      }),
    };

    setSubmitting(true);
    try {
      if (showContinue) {
        // 이미 가진 단어를 또 만들지 않도록 저장 전에 중복을 확인하고, 있으면 처리 방식을 고르게 한다.
        const entries = [...(plan.main ? [plan.main] : []), ...plan.extras.map((e) => e.data)];
        let checks: DuplicateCheckResult[];
        try {
          checks = await apiFetch<DuplicateCheckResult[]>("/api/vocabularies/check-duplicates", {
            method: "POST",
            body: { items: entries.map(({ word: w, reading: r }) => ({ word: w, reading: r })) },
          });
        } catch (err) {
          setError(
            err instanceof ApiClientError ? err.message : "중복 확인 중 오류가 발생했습니다.",
          );
          requestScroll("form-error");
          return;
        }
        if (checks.some((check) => check.isDuplicate)) {
          setDupReview({
            plan,
            mode,
            items: entries.map((data, index) => {
              const existing = checks[index].existing;
              // 이미 선택한 단어장에 모두 들어 있으면 할 일이 없으니 기존 유지, 아니면 단어장 연결을 기본으로 둔다.
              const alreadyInAllBooks =
                !!existing && selectedBookIds.every((id) => existing.bookIds.includes(id));
              return {
                index,
                word: data.word,
                reading: data.reading,
                meanings: data.meanings,
                isDuplicate: checks[index].isDuplicate,
                existing,
                resolution: alreadyInAllBooks ? "skip" : "link",
              };
            }),
          });
          return;
        }
      }
      await executeSave(mode, plan);
    } finally {
      setSubmitting(false);
    }
  }

  async function confirmDuplicates() {
    if (!dupReview) return;
    const { plan, mode, items } = dupReview;
    setSubmitting(true);
    try {
      await executeSave(
        mode,
        plan,
        items.map((item) => ({
          resolution: item.isDuplicate ? item.resolution : "create",
          existingId: item.existing?.id,
        })),
      );
    } finally {
      setSubmitting(false);
      setDupReview(null);
    }
  }

  async function executeSave(mode: SaveMode, plan: SavePlan, resolutions?: BatchResolution[]) {
    // 새 단어 등록 화면이 아니면(수정·모달 등) 메인 단어는 기존대로 단건 API로 저장해
    // VocabularyDetail을 돌려받는다 — onSaved 호출부가 그 값을 쓴다.
    let mainSaved: VocabularyDetail | null = null;
    if (plan.main && !showContinue) {
      try {
        mainSaved = isEdit
          ? await apiFetch<VocabularyDetail>(`/api/vocabularies/${initialData.id}`, {
              method: "PATCH",
              body: plan.main,
            })
          : await apiFetch<VocabularyDetail>("/api/vocabularies", {
              method: "POST",
              body: {
                ...plan.main,
                ...(main.aiAnalysisId
                  ? { aiAnalysisId: main.aiAnalysisId, aiFieldsEdited: main.aiFieldsEdited }
                  : {}),
              },
            });
      } catch (err) {
        setError(err instanceof ApiClientError ? err.message : "저장 중 오류가 발생했습니다.");
        requestScroll("form-error");
        return;
      }
    }

    // 나머지(새 단어 등록 화면에서는 메인 포함)는 일괄 API 한 번으로 저장한다.
    const entries: {
      key: string | null;
      data: VocabularyInput;
      aiId?: string;
      aiEdited: boolean;
    }[] = [];
    if (plan.main && showContinue) {
      entries.push({
        key: null,
        data: plan.main,
        aiId: main.aiAnalysisId,
        aiEdited: main.aiFieldsEdited,
      });
    }
    plan.extras.forEach((e) =>
      entries.push({ key: e.key, data: e.data, aiId: e.aiAnalysisId, aiEdited: e.aiFieldsEdited }),
    );

    const items = entries.map((entry, index) => {
      const choice = resolutions?.[index];
      if (choice?.resolution === "skip") {
        return { resolution: "skip", word: entry.data.word };
      }
      if (choice?.resolution === "link" && choice.existingId) {
        return {
          resolution: "link",
          word: entry.data.word,
          reading: entry.data.reading,
          existingVocabularyId: choice.existingId,
        };
      }
      return {
        resolution: "create",
        ...entry.data,
        ...(entry.aiId ? { aiAnalysisId: entry.aiId, aiFieldsEdited: entry.aiEdited } : {}),
      };
    });

    const unlocked = [...(mainSaved?.unlockedAchievements ?? [])];
    let results: BatchSaveItemResult[] = [];
    if (entries.length > 0) {
      try {
        const response = await apiFetch<BatchSaveResponse>("/api/vocabularies/batch", {
          method: "POST",
          body: { vocabularyBookIds: selectedBookIds, items },
          timeoutMs: 30_000,
        });
        results = response.results;
        unlocked.push(...response.unlockedAchievements);
      } catch (err) {
        // 요청 자체가 실패하면 어느 것도 저장되지 않았으니 모든 항목을 같은 사유로 실패 처리한다.
        const message =
          err instanceof ApiClientError ? err.message : "저장 중 오류가 발생했습니다.";
        results = entries.map(() => ({ status: "failed", message }));
      }
    }

    const savedWords: { id: string; word: string }[] = mainSaved
      ? [{ id: mainSaved.id, word: mainSaved.word }]
      : [];
    let createdCount = mainSaved && !isEdit ? 1 : 0;
    let linkedCount = 0;
    let skippedCount = 0;
    const doneKeys = new Set<string>();
    const failures = new Map<string, string>();
    let mainFailMessage: string | undefined;

    results.forEach((result, index) => {
      const key = entries[index].key;
      if (result.status === "failed") {
        if (key === null) mainFailMessage = result.message;
        else failures.set(key, result.message);
        return;
      }
      if (key !== null) doneKeys.add(key);
      if (result.status === "skipped") {
        skippedCount += 1;
        return;
      }
      if (result.status === "created") createdCount += 1;
      else linkedCount += 1;
      savedWords.push({ id: result.vocabularyId, word: result.word });
    });

    queryClient.invalidateQueries({ queryKey: ["vocabularies"] });
    queryClient.invalidateQueries({ queryKey: ["vocabulary-books"] });

    const failedCount = failures.size + (mainFailMessage ? 1 : 0);
    if (isEdit) {
      if (mainSaved) {
        toast.success(
          createdCount > 0
            ? `단어를 수정하고 ${createdCount}개를 새로 등록했어요.`
            : "단어를 수정했습니다.",
        );
      }
    } else if (createdCount + linkedCount + skippedCount > 0) {
      const parts = [
        createdCount > 0 && `${createdCount}개 등록`,
        linkedCount > 0 && `${linkedCount}개 단어장에 연결`,
        skippedCount > 0 && `${skippedCount}개 건너뜀`,
      ].filter(Boolean);
      toast.success(
        createdCount === 1 && linkedCount === 0 && skippedCount === 0
          ? `「${savedWords[0].word}」를 등록했어요.`
          : parts.join(" · "),
      );
    }
    if (failedCount > 0) toast.error(`${failedCount}개 단어를 저장하지 못했어요.`);

    const uniqueAchievements = Array.from(new Map(unlocked.map((a) => [a.title, a])).values());
    if (uniqueAchievements.length > 0) {
      uniqueAchievements.forEach((achievement) => achievementToast.show(achievement.title));
      queryClient.invalidateQueries({ queryKey: ["game", "achievements"] });
    }

    if (!isEdit) setRegistered((prev) => [...prev, ...savedWords]);
    // 처리된 카드는 제거하고, 실패한 카드는 사유와 함께 남겨 바로 고쳐서 다시 시도할 수 있게 한다.
    setExtraWords((prev) =>
      prev
        .filter((e) => !doneKeys.has(e.key))
        .map((e) =>
          failures.has(e.key) ? { ...e, error: failures.get(e.key), expanded: true } : e,
        ),
    );

    if (mainFailMessage) {
      setError(mainFailMessage);
      requestScroll("form-error");
      return;
    }
    if (failures.size > 0) {
      // 메인 단어는 이미 처리됐으니 다시 제출되지 않도록 비운다(수정 모드는 그대로 둔다).
      if (plan.main && !isEdit) resetMainForm();
      return;
    }

    if (showContinue) clearStoredNewWordDraft();

    const target = mainSaved ?? savedWords[0];
    if (mode === "continue" || (showContinue && !target)) {
      if (showContinue) resetMainForm();
      return;
    }
    if (mainSaved && onSaved) onSaved(mainSaved);
    else if (target) router.push(`/words/${target.id}`);
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
      {storedDraft && (
        <div
          role="region"
          aria-label="임시 저장된 단어"
          className="flex flex-col gap-2 border-2 border-pixel-ink bg-accent/10 p-3"
        >
          <p className="text-sm font-bold text-foreground">작성 중이던 단어가 있어요</p>
          <p className="text-xs text-muted">
            {describeNewWordDraft(storedDraft)} 입력 내용을 이어서 작성할까요?
          </p>
          <div className="flex gap-2">
            <Button type="button" size="sm" onClick={restoreDraft}>
              이어서 작성
            </Button>
            <Button type="button" size="sm" variant="outline" onClick={discardDraft}>
              버리기
            </Button>
          </div>
        </div>
      )}

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
      {extraWords.length > 0 && (
        <Card className="flex items-center gap-2 border-accent/60">
          <button
            type="button"
            onClick={() => setMainExpanded(mainCollapsed)}
            aria-expanded={!mainCollapsed}
            aria-label={mainCollapsed ? "메인 단어 펼치기" : "메인 단어 접기"}
            className="flex min-h-11 min-w-0 flex-1 items-center gap-2 text-left"
          >
            <span className="text-xs font-bold text-muted" aria-hidden="true">
              {mainCollapsed ? "▸" : "▾"}
            </span>
            <span className="shrink-0 text-sm font-medium text-foreground">단어 1</span>
            {mainCollapsed && (
              <span className="min-w-0 flex-1 truncate text-sm text-muted">
                {main.word || "(단어 없음)"}
                {main.meanings.find((m) => m.trim())
                  ? ` — ${main.meanings.find((m) => m.trim())}`
                  : ""}
              </span>
            )}
          </button>
        </Card>
      )}

      <div className={cn(mainCollapsed ? "hidden" : "contents")}>
        <WordFields
          key={mainKey}
          draft={main}
          onChange={setMain}
          variant="main"
          errors={fieldErrors}
          onEdit={clearFieldError}
          wordInputRef={wordInputRef}
        />
      </div>

      {main.aiExtras && (
        <Card className="flex flex-col gap-3">
          <span className="text-sm font-medium text-foreground">함께 등록할 단어 후보</span>
          {main.aiExtras.relatedKanji.length > 0 && (
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs text-muted">관련 한자</span>
              {main.aiExtras.relatedKanji.map((kanji) => (
                <Link
                  key={kanji}
                  href={`/kanji/${encodeURIComponent(kanji)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="border-2 border-pixel-ink bg-surface px-2.5 py-0.5 text-xs font-bold hover:bg-background"
                >
                  {kanji}
                </Link>
              ))}
            </div>
          )}
          {main.aiExtras.synonyms.length > 0 && (
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs text-muted">유의어</span>
              {main.aiExtras.synonyms.map((synonym) => {
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
          {main.aiExtras.relatedExpressions.length > 0 && (
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs text-muted">연관 표현</span>
              {main.aiExtras.relatedExpressions.map((expr) => {
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
          <p className="text-xs text-muted">
            유의어·연관 표현을 누르면 별개의 새 단어 카드가 아래에 추가돼요. 다시 누르면 취소돼요.
            관련 한자를 누르면 한자 정보가 새 탭에서 열려요.
          </p>
        </Card>
      )}

      {extraWords.length >= 1 && (
        <button
          type="button"
          onClick={toggleAll}
          className="self-end text-xs font-bold text-primary hover:underline"
        >
          {allExpanded ? "모두 접기" : "모두 펼치기"}
        </button>
      )}

      {extraWords.map((entry, index) => (
        <div key={entry.key} data-form-target={entry.key}>
          <ExtraWordCard
            entry={entry}
            index={index}
            onChangeDraft={(updater) =>
              setExtraWords((prev) =>
                prev.map((e) =>
                  e.key === entry.key ? { ...e, ...updater(e), error: undefined } : e,
                ),
              )
            }
            onToggleExpanded={() => updateExtraWord(entry.key, { expanded: !entry.expanded })}
            onRemove={() => removeExtraWord(entry.key)}
          />
        </div>
      ))}

      {showContinue && (
        <button
          type="button"
          onClick={addBlankExtraWord}
          className="flex min-h-11 items-center justify-center gap-1 border-2 border-dashed border-pixel-ink/60 text-sm font-bold text-muted transition hover:bg-surface"
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
          <p className="text-xs text-muted">
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
            ? "sticky bottom-[calc(4rem+env(safe-area-inset-bottom))] z-30 -mx-4 flex flex-col gap-2 border-t-2 border-pixel-ink bg-background px-4 py-3 sm:-mx-6 sm:flex-row sm:justify-end sm:px-6 lg:bottom-0 lg:-mx-8 lg:px-8"
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
      <DuplicateReviewModal
        open={dupReview !== null}
        items={dupReview?.items ?? []}
        saving={submitting}
        onChangeResolution={(index, resolution) =>
          setDupReview((prev) =>
            prev
              ? {
                  ...prev,
                  items: prev.items.map((item) =>
                    item.index === index ? { ...item, resolution } : item,
                  ),
                }
              : prev,
          )
        }
        onCancel={() => setDupReview(null)}
        onConfirm={() => void confirmDuplicates()}
      />
    </form>
  );
}
