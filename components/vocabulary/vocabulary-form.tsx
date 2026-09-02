"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";

import { achievementToast } from "@/components/game/achievement-toast";
import { PixelPlus, PixelSparkles, PixelX } from "@/components/icons/pixel-icons";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ChipButton } from "@/components/ui/chip-button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { toast } from "@/components/ui/toast";
import { VoiceInputButton } from "@/components/ui/voice-input-button";
import type { AnalyzeWordResult, WordAnalysisResult } from "@/lib/ai/word-analysis";
import { ApiClientError, apiFetch } from "@/lib/api/client";
import { cn } from "@/lib/utils";
import {
  JLPT_LEVEL_OPTIONS,
  MAX_EXAMPLES,
  MAX_MEANINGS,
  PART_OF_SPEECH_OPTIONS,
  vocabularySchema,
} from "@/lib/validations/vocabulary";
import type { VocabularyCreateInput, VocabularyInput } from "@/lib/validations/vocabulary";
import type { VocabularyDetail } from "@/types/vocabulary";
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

interface ExtraWordEntry {
  key: string;
  /** The synonym/related-expression chip text that spawned this entry — used to detect toggle-off. */
  sourceText: string;
  word: string;
  reading: string;
  partOfSpeech: string;
  jlptLevel: string;
  meanings: string[];
  examples: { japanese: string; korean: string }[];
  aiAnalysisId?: string;
  aiFieldsEdited: boolean;
  aiHighlight: { reading: boolean; partOfSpeech: boolean; jlptLevel: boolean };
  aiMeaningHighlight: boolean[];
  aiExampleHighlight: boolean[];
  analyzing: boolean;
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
  const [selectedBookIds, setSelectedBookIds] = useState<string[]>(
    initialData?.bookIds ?? (initialBookId ? [initialBookId] : []),
  );
  const [error, setError] = useState<string>();

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
  const [extraSubmitting, setExtraSubmitting] = useState(false);
  const nextExtraKeyRef = useRef(0);

  const { data: books } = useQuery({
    queryKey: ["vocabulary-books"],
    queryFn: () => apiFetch<VocabularyBookSummary[]>("/api/vocabulary-books"),
  });

  const mutation = useMutation({
    mutationFn: (payload: VocabularyCreateInput) =>
      isEdit
        ? apiFetch<VocabularyDetail>(`/api/vocabularies/${initialData.id}`, {
            method: "PATCH",
            body: payload,
          })
        : apiFetch<VocabularyDetail>("/api/vocabularies", { method: "POST", body: payload }),
    onSuccess: (saved) => {
      queryClient.invalidateQueries({ queryKey: ["vocabularies"] });
      queryClient.invalidateQueries({ queryKey: ["vocabulary-books"] });
      toast.success(isEdit ? "단어를 수정했습니다." : "단어를 등록했습니다.");
      if (saved.unlockedAchievements && saved.unlockedAchievements.length > 0) {
        saved.unlockedAchievements.forEach((achievement) =>
          achievementToast.show(achievement.title),
        );
        queryClient.invalidateQueries({ queryKey: ["game", "achievements"] });
      }
      if (onSaved) onSaved(saved);
      else router.push(`/words/${saved.id}`);
    },
    onError: (err) => {
      setError(err instanceof ApiClientError ? err.message : "저장 중 오류가 발생했습니다.");
    },
  });

  const analyzeMutation = useMutation({
    mutationFn: () =>
      apiFetch<AnalyzeWordResult>("/api/ai/analyze-word", {
        method: "POST",
        body: { word },
        timeoutMs: 45_000,
      }),
    onSuccess: ({ id, result }) => {
      setReading(result.reading);
      setPartOfSpeech(result.partOfSpeech);
      setJlptLevel(result.jlptLevel ?? "");
      setMeanings(result.meanings);
      setExamples(result.examples);
      setAiAnalysisId(id);
      setAiFieldsEdited(false);
      setAiHighlight({
        reading: true,
        partOfSpeech: true,
        jlptLevel: result.jlptLevel != null,
      });
      setAiMeaningHighlight(result.meanings.map(() => true));
      setAiExampleHighlight(result.examples.map(() => true));
      setAiExtras({
        relatedKanji: result.relatedKanji,
        synonyms: result.synonyms,
        relatedExpressions: result.relatedExpressions,
      });
      setError(undefined);
    },
    onError: (err) => {
      toast.error(err instanceof ApiClientError ? err.message : "AI 분석에 실패했습니다.");
    },
  });

  function markEdited() {
    if (aiAnalysisId) setAiFieldsEdited(true);
  }

  function resetAiState() {
    setAiAnalysisId(undefined);
    setAiFieldsEdited(false);
    setAiHighlight({ reading: false, partOfSpeech: false, jlptLevel: false });
    setAiMeaningHighlight([]);
    setAiExampleHighlight([]);
    setAiExtras(null);
  }

  function handleWordChange(value: string) {
    setWord(value);
    if (aiAnalysisId) resetAiState();
  }

  function handleReadingChange(value: string) {
    setReading(value);
    setAiHighlight((prev) => ({ ...prev, reading: false }));
    markEdited();
  }

  function handlePartOfSpeechChange(value: string) {
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
    setMeanings((prev) => prev.map((m, i) => (i === index ? value : m)));
    setAiMeaningHighlight((prev) => prev.map((h, i) => (i === index ? false : h)));
    markEdited();
  }
  function addMeaning() {
    setMeanings((prev) => (prev.length >= MAX_MEANINGS ? prev : [...prev, ""]));
    setAiMeaningHighlight((prev) => [...prev, false]);
    markEdited();
  }
  function removeMeaning(index: number) {
    setMeanings((prev) => (prev.length <= 1 ? prev : prev.filter((_, i) => i !== index)));
    setAiMeaningHighlight((prev) => prev.filter((_, i) => i !== index));
    markEdited();
  }

  function updateExample(index: number, field: "japanese" | "korean", value: string) {
    setExamples((prev) => prev.map((e, i) => (i === index ? { ...e, [field]: value } : e)));
    setAiExampleHighlight((prev) => prev.map((h, i) => (i === index ? false : h)));
    markEdited();
  }
  function addExample() {
    setExamples((prev) =>
      prev.length >= MAX_EXAMPLES ? prev : [...prev, { japanese: "", korean: "" }],
    );
    setAiExampleHighlight((prev) => [...prev, false]);
    markEdited();
  }
  function removeExample(index: number) {
    setExamples((prev) => prev.filter((_, i) => i !== index));
    setAiExampleHighlight((prev) => prev.filter((_, i) => i !== index));
    markEdited();
  }

  function toggleExtraWord(text: string) {
    setExtraWords((prev) => {
      const existingIndex = prev.findIndex((entry) => entry.sourceText === text);
      if (existingIndex !== -1) {
        return prev.filter((_, i) => i !== existingIndex);
      }
      const key = `extra-${nextExtraKeyRef.current++}`;
      return [
        ...prev,
        {
          key,
          sourceText: text,
          word: text,
          reading: "",
          partOfSpeech: "",
          jlptLevel: "",
          meanings: [""],
          examples: [],
          aiAnalysisId: undefined,
          aiFieldsEdited: false,
          aiHighlight: { reading: false, partOfSpeech: false, jlptLevel: false },
          aiMeaningHighlight: [],
          aiExampleHighlight: [],
          analyzing: false,
        },
      ];
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

  function markExtraEdited(key: string) {
    setExtraWords((prev) =>
      prev.map((entry) =>
        entry.key === key && entry.aiAnalysisId ? { ...entry, aiFieldsEdited: true } : entry,
      ),
    );
  }

  function updateExtraMeaning(key: string, index: number, value: string) {
    setExtraWords((prev) =>
      prev.map((entry) =>
        entry.key !== key
          ? entry
          : {
              ...entry,
              meanings: entry.meanings.map((m, i) => (i === index ? value : m)),
              aiMeaningHighlight: entry.aiMeaningHighlight.map((h, i) => (i === index ? false : h)),
              aiFieldsEdited: entry.aiAnalysisId ? true : entry.aiFieldsEdited,
            },
      ),
    );
  }

  function addExtraMeaning(key: string) {
    setExtraWords((prev) =>
      prev.map((entry) =>
        entry.key !== key || entry.meanings.length >= MAX_MEANINGS
          ? entry
          : {
              ...entry,
              meanings: [...entry.meanings, ""],
              aiMeaningHighlight: [...entry.aiMeaningHighlight, false],
            },
      ),
    );
  }

  function removeExtraMeaning(key: string, index: number) {
    setExtraWords((prev) =>
      prev.map((entry) =>
        entry.key !== key || entry.meanings.length <= 1
          ? entry
          : {
              ...entry,
              meanings: entry.meanings.filter((_, i) => i !== index),
              aiMeaningHighlight: entry.aiMeaningHighlight.filter((_, i) => i !== index),
            },
      ),
    );
  }

  function updateExtraExample(
    key: string,
    index: number,
    field: "japanese" | "korean",
    value: string,
  ) {
    setExtraWords((prev) =>
      prev.map((entry) =>
        entry.key !== key
          ? entry
          : {
              ...entry,
              examples: entry.examples.map((ex, i) =>
                i === index ? { ...ex, [field]: value } : ex,
              ),
              aiExampleHighlight: entry.aiExampleHighlight.map((h, i) => (i === index ? false : h)),
              aiFieldsEdited: entry.aiAnalysisId ? true : entry.aiFieldsEdited,
            },
      ),
    );
  }

  function addExtraExample(key: string) {
    setExtraWords((prev) =>
      prev.map((entry) =>
        entry.key !== key || entry.examples.length >= MAX_EXAMPLES
          ? entry
          : {
              ...entry,
              examples: [...entry.examples, { japanese: "", korean: "" }],
              aiExampleHighlight: [...entry.aiExampleHighlight, false],
            },
      ),
    );
  }

  function removeExtraExample(key: string, index: number) {
    setExtraWords((prev) =>
      prev.map((entry) =>
        entry.key !== key
          ? entry
          : {
              ...entry,
              examples: entry.examples.filter((_, i) => i !== index),
              aiExampleHighlight: entry.aiExampleHighlight.filter((_, i) => i !== index),
            },
      ),
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
      });
    } catch (err) {
      toast.error(err instanceof ApiClientError ? err.message : "AI 분석에 실패했습니다.");
      updateExtraWord(key, { analyzing: false });
    }
  }

  function toggleBook(id: string) {
    setSelectedBookIds((prev) =>
      prev.includes(id) ? prev.filter((b) => b !== id) : [...prev, id],
    );
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(undefined);

    const parsed = vocabularySchema.safeParse({
      word,
      reading,
      partOfSpeech,
      jlptLevel: jlptLevel || null,
      meanings: meanings.map((m) => m.trim()).filter(Boolean),
      examples: examples
        .filter((ex) => ex.japanese.trim() || ex.korean.trim())
        .map((ex) => ({ japanese: ex.japanese.trim(), korean: ex.korean.trim() })),
      vocabularyBookIds: selectedBookIds,
    });

    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message);
      return;
    }

    const parsedExtras: VocabularyInput[] = [];
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
      if (!parsedExtra.success) {
        setError(`"${entry.word || "새 단어"}": ${parsedExtra.error.issues[0]?.message}`);
        return;
      }
      parsedExtras.push(parsedExtra.data);
    }

    if (parsedExtras.length === 0) {
      mutation.mutate({
        ...parsed.data,
        ...(!isEdit && aiAnalysisId ? { aiAnalysisId, aiFieldsEdited } : {}),
      });
      return;
    }

    void submitWithExtras(parsed.data, parsedExtras);
  }

  async function submitWithExtras(mainData: VocabularyInput, extrasData: VocabularyInput[]) {
    setExtraSubmitting(true);
    setError(undefined);
    try {
      const saved = isEdit
        ? await apiFetch<VocabularyDetail>(`/api/vocabularies/${initialData!.id}`, {
            method: "PATCH",
            body: mainData,
          })
        : await apiFetch<VocabularyDetail>("/api/vocabularies", {
            method: "POST",
            body: { ...mainData, ...(aiAnalysisId ? { aiAnalysisId, aiFieldsEdited } : {}) },
          });

      let successCount = 1;
      const unlocked = [...(saved.unlockedAchievements ?? [])];

      for (const extra of extrasData) {
        try {
          const savedExtra = await apiFetch<VocabularyDetail>("/api/vocabularies", {
            method: "POST",
            body: extra,
          });
          successCount += 1;
          if (savedExtra.unlockedAchievements) unlocked.push(...savedExtra.unlockedAchievements);
        } catch (err) {
          toast.error(
            `"${extra.word}" 등록에 실패했어요: ${
              err instanceof ApiClientError ? err.message : "오류가 발생했습니다."
            }`,
          );
        }
      }

      queryClient.invalidateQueries({ queryKey: ["vocabularies"] });
      queryClient.invalidateQueries({ queryKey: ["vocabulary-books"] });
      toast.success(
        successCount > 1 ? `단어 ${successCount}개를 등록했습니다.` : "단어를 등록했습니다.",
      );

      const uniqueAchievements = Array.from(new Map(unlocked.map((a) => [a.title, a])).values());
      if (uniqueAchievements.length > 0) {
        uniqueAchievements.forEach((achievement) => achievementToast.show(achievement.title));
        queryClient.invalidateQueries({ queryKey: ["game", "achievements"] });
      }

      if (onSaved) onSaved(saved);
      else router.push(`/words/${saved.id}`);
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : "저장 중 오류가 발생했습니다.");
    } finally {
      setExtraSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-6" noValidate>
      <Card className="flex flex-col gap-4">
        <div className="flex items-end gap-2">
          <div className="min-w-0 flex-1">
            <Input
              label="단어"
              value={word}
              onChange={(e) => handleWordChange(e.target.value)}
              required
            />
          </div>
          <VoiceInputButton onResult={handleWordChange} />
        </div>

        <div className="flex flex-col gap-1.5">
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="self-start"
            loading={analyzeMutation.isPending}
            disabled={!word.trim() || analyzeMutation.isPending}
            onClick={() => analyzeMutation.mutate()}
          >
            <PixelSparkles className="size-3.5" aria-hidden="true" />
            AI로 자동 분석
          </Button>
          {analyzeMutation.isPending && (
            <p className="text-xs text-foreground/50">
              AI가 분석하고 있어요. 최대 30초 정도 걸릴 수 있어요.
            </p>
          )}
          {analyzeMutation.isError && (
            <p className="text-xs text-error">
              AI 분석에 실패했어요. 직접 입력해도 괜찮아요.{" "}
              <button
                type="button"
                onClick={() => analyzeMutation.mutate()}
                className="font-bold text-primary hover:underline"
              >
                다시 시도
              </button>
            </p>
          )}
        </div>

        <div className="flex flex-col gap-1">
          <Input
            label="후리가나"
            value={reading}
            onChange={(e) => handleReadingChange(e.target.value)}
            className={cn(aiHighlight.reading && "ring-2 ring-accent/60 bg-accent/5")}
            required
          />
          {aiHighlight.reading && (
            <span className="text-[11px] font-bold text-accent">✨ AI가 채운 값</span>
          )}
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="flex flex-col gap-1">
            <Select
              label="품사"
              value={partOfSpeech}
              onChange={(e) => handlePartOfSpeechChange(e.target.value)}
              options={PART_OF_SPEECH_SELECT_OPTIONS}
              className={cn(aiHighlight.partOfSpeech && "ring-2 ring-accent/60 bg-accent/5")}
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

      <Card className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-foreground">
            뜻<span className="text-error"> *</span>
          </span>
          <button
            type="button"
            onClick={addMeaning}
            className="flex items-center gap-1 text-xs font-bold text-primary hover:underline"
          >
            <PixelPlus className="size-3" aria-hidden="true" />뜻 추가
          </button>
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
      </Card>

      <Card className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-foreground">예문</span>
          <button
            type="button"
            onClick={addExample}
            className="flex items-center gap-1 text-xs font-bold text-primary hover:underline"
          >
            <PixelPlus className="size-3" aria-hidden="true" />
            예문 추가
          </button>
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
      </Card>

      {aiExtras && (
        <Card className="flex flex-col gap-3">
          <span className="text-sm font-medium text-foreground">AI 분석 추가 정보</span>
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
              <span className="text-xs text-foreground/60">관련 표현</span>
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
            유의어·관련 표현을 클릭하면 아래에 등록 폼이 추가돼요. 다시 누르면 취소돼요. 관련 한자는
            추후 한자 학습 기능(Phase 9)과 연결될 예정이라 지금은 참고용 텍스트로만 표시돼요.
          </p>
        </Card>
      )}

      {extraWords.map((entry) => (
        <Card key={entry.key} className="flex flex-col gap-4 border-accent/60">
          <div className="flex items-center justify-between gap-2">
            <span className="text-sm font-medium text-foreground">
              함께 등록할 단어<span className="text-error"> *</span>
            </span>
            <button
              type="button"
              onClick={() => removeExtraWord(entry.key)}
              aria-label="추가 단어 삭제"
              className="flex size-9 shrink-0 items-center justify-center border-2 border-pixel-ink bg-surface text-foreground/60 shadow-bevel-raised transition hover:bg-background"
            >
              <PixelX className="size-3.5" aria-hidden="true" />
            </button>
          </div>

          <Input
            label="단어"
            value={entry.word}
            onChange={(e) => {
              updateExtraWord(entry.key, { word: e.target.value, aiAnalysisId: undefined });
            }}
            required
          />

          <div className="flex flex-col gap-1.5">
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="self-start"
              loading={entry.analyzing}
              disabled={!entry.word.trim() || entry.analyzing}
              onClick={() => analyzeExtraWord(entry.key)}
            >
              <PixelSparkles className="size-3.5" aria-hidden="true" />
              AI로 자동 분석
            </Button>
          </div>

          <div className="flex flex-col gap-1">
            <Input
              label="후리가나"
              value={entry.reading}
              onChange={(e) => {
                updateExtraWord(entry.key, {
                  reading: e.target.value,
                  aiHighlight: { ...entry.aiHighlight, reading: false },
                });
                markExtraEdited(entry.key);
              }}
              className={cn(entry.aiHighlight.reading && "ring-2 ring-accent/60 bg-accent/5")}
              required
            />
            {entry.aiHighlight.reading && (
              <span className="text-[11px] font-bold text-accent">✨ AI가 채운 값</span>
            )}
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-1">
              <Select
                label="품사"
                value={entry.partOfSpeech}
                onChange={(e) => {
                  updateExtraWord(entry.key, {
                    partOfSpeech: e.target.value,
                    aiHighlight: { ...entry.aiHighlight, partOfSpeech: false },
                  });
                  markExtraEdited(entry.key);
                }}
                options={PART_OF_SPEECH_SELECT_OPTIONS}
                className={cn(
                  entry.aiHighlight.partOfSpeech && "ring-2 ring-accent/60 bg-accent/5",
                )}
                required
              />
              {entry.aiHighlight.partOfSpeech && (
                <span className="text-[11px] font-bold text-accent">✨ AI가 채운 값</span>
              )}
            </div>
            <div className="flex flex-col gap-1">
              <Select
                label="JLPT 난이도"
                value={entry.jlptLevel}
                onChange={(e) => {
                  updateExtraWord(entry.key, {
                    jlptLevel: e.target.value,
                    aiHighlight: { ...entry.aiHighlight, jlptLevel: false },
                  });
                  markExtraEdited(entry.key);
                }}
                options={JLPT_SELECT_OPTIONS}
                className={cn(entry.aiHighlight.jlptLevel && "ring-2 ring-accent/60 bg-accent/5")}
              />
              {entry.aiHighlight.jlptLevel && (
                <span className="text-[11px] font-bold text-accent">✨ AI가 채운 값</span>
              )}
            </div>
          </div>

          <div className="flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-foreground">
                뜻<span className="text-error"> *</span>
              </span>
              <button
                type="button"
                onClick={() => addExtraMeaning(entry.key)}
                className="flex items-center gap-1 text-xs font-bold text-primary hover:underline"
              >
                <PixelPlus className="size-3" aria-hidden="true" />뜻 추가
              </button>
            </div>
            {entry.meanings.map((meaning, index) => (
              <div key={index} className="flex flex-col gap-1">
                <div className="flex items-center gap-2">
                  <Input
                    value={meaning}
                    onChange={(e) => updateExtraMeaning(entry.key, index, e.target.value)}
                    placeholder={`뜻 ${index + 1}`}
                    className={cn(
                      "flex-1",
                      entry.aiMeaningHighlight[index] && "ring-2 ring-accent/60 bg-accent/5",
                    )}
                  />
                  <button
                    type="button"
                    onClick={() => removeExtraMeaning(entry.key, index)}
                    disabled={entry.meanings.length <= 1}
                    aria-label="뜻 삭제"
                    className="flex size-9 shrink-0 items-center justify-center border-2 border-pixel-ink bg-surface text-foreground/60 shadow-bevel-raised transition hover:bg-background disabled:pointer-events-none disabled:opacity-40"
                  >
                    <PixelX className="size-3.5" aria-hidden="true" />
                  </button>
                </div>
                {entry.aiMeaningHighlight[index] && (
                  <span className="text-[11px] font-bold text-accent">✨ AI가 채운 값</span>
                )}
              </div>
            ))}
          </div>

          <div className="flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-foreground">예문</span>
              <button
                type="button"
                onClick={() => addExtraExample(entry.key)}
                className="flex items-center gap-1 text-xs font-bold text-primary hover:underline"
              >
                <PixelPlus className="size-3" aria-hidden="true" />
                예문 추가
              </button>
            </div>
            {entry.examples.length === 0 && (
              <p className="text-xs text-foreground/50">선택 사항이에요. 필요하면 추가해보세요.</p>
            )}
            {entry.examples.map((example, index) => (
              <div key={index} className="flex flex-col gap-1">
                <div
                  className={cn(
                    "flex items-start gap-2 border-2 border-pixel-ink bg-background p-3",
                    entry.aiExampleHighlight[index] && "ring-2 ring-accent/60 bg-accent/5",
                  )}
                >
                  <div className="flex flex-1 flex-col gap-2">
                    <Input
                      value={example.japanese}
                      onChange={(e) =>
                        updateExtraExample(entry.key, index, "japanese", e.target.value)
                      }
                      placeholder="일본어 예문"
                    />
                    <Input
                      value={example.korean}
                      onChange={(e) =>
                        updateExtraExample(entry.key, index, "korean", e.target.value)
                      }
                      placeholder="한국어 해석"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => removeExtraExample(entry.key, index)}
                    aria-label="예문 삭제"
                    className="flex size-9 shrink-0 items-center justify-center border-2 border-pixel-ink bg-surface text-foreground/60 shadow-bevel-raised transition hover:bg-background"
                  >
                    <PixelX className="size-3.5" aria-hidden="true" />
                  </button>
                </div>
                {entry.aiExampleHighlight[index] && (
                  <span className="text-[11px] font-bold text-accent">✨ AI가 채운 값</span>
                )}
              </div>
            ))}
          </div>
        </Card>
      ))}

      <Card className="flex flex-col gap-3">
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
      </Card>

      {error && (
        <p role="alert" className="text-sm text-error">
          {error}
        </p>
      )}

      <div className="flex justify-end gap-2">
        <Button
          type="button"
          variant="outline"
          onClick={() => (onCancel ? onCancel() : router.back())}
        >
          취소
        </Button>
        <Button type="submit" loading={mutation.isPending || extraSubmitting}>
          {isEdit ? "저장" : extraWords.length > 0 ? `등록 (${extraWords.length + 1}개)` : "등록"}
        </Button>
      </div>
    </form>
  );
}
