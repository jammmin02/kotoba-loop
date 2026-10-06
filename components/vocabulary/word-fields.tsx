"use client";

import { useMutation } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";

import { PixelPlus, PixelSparkles, PixelX } from "@/components/icons/pixel-icons";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { Select } from "@/components/ui/select";
import { toast } from "@/components/ui/toast";
import { VoiceInputButton } from "@/components/ui/voice-input-button";
import {
  applyAnalysis,
  markEdited,
  resetAiState,
  userEnteredSections,
} from "@/components/vocabulary/word-draft";
import type {
  AnalysisTarget,
  FieldErrorKey,
  FieldErrors,
  RelatedExpressionRow,
  WordDraft,
} from "@/components/vocabulary/word-draft";
import type { AnalyzeWordResult } from "@/lib/ai/word-analysis";
import { ApiClientError, apiFetch } from "@/lib/api/client";
import { cn } from "@/lib/utils";
import {
  JLPT_LEVEL_OPTIONS,
  MAX_EXAMPLES,
  MAX_MEANINGS,
  MAX_RELATED_EXPRESSIONS,
  PART_OF_SPEECH_OPTIONS,
} from "@/lib/validations/vocabulary";
import { RELATED_EXPRESSION_TYPE_SELECT_OPTIONS } from "@/lib/vocabulary/related-expression";
import type { RelatedExpressionType } from "@/types/vocabulary";

import type { ReactNode, Ref } from "react";

const JLPT_SELECT_OPTIONS = [
  { value: "", label: "선택 안 함" },
  ...JLPT_LEVEL_OPTIONS.map((level) => ({ value: level, label: level })),
];

const PART_OF_SPEECH_SELECT_OPTIONS = [
  { value: "", label: "선택해주세요" },
  ...PART_OF_SPEECH_OPTIONS.map((pos) => ({ value: pos, label: pos })),
];

const AI_HIGHLIGHT_CLASS = "ring-2 ring-accent/60 bg-accent/5";
const AI_BADGE = <span className="text-[11px] font-bold text-accent">✨ AI가 채운 값</span>;

const FILL_BUTTON_CLASS =
  "flex items-center gap-1 text-xs font-bold text-primary hover:underline disabled:pointer-events-none disabled:opacity-40";
const ADD_BUTTON_CLASS = "flex items-center gap-1 text-xs font-bold text-primary hover:underline";
const REMOVE_BUTTON_CLASS =
  "flex size-9 shrink-0 items-center justify-center border-2 border-pixel-ink bg-surface text-foreground/60 shadow-bevel-raised transition hover:bg-background";

export function isWordNotFound(err: unknown): err is ApiClientError {
  return err instanceof ApiClientError && err.code === "WORD_NOT_FOUND";
}

type DraftUpdater = (prev: WordDraft) => WordDraft;

/** main이면 섹션마다 Card(오류 이동 대상 표시 포함), nested면 점선으로 구분한 평면 영역. 컴포넌트 밖에 둬서
 * 렌더마다 다시 마운트되지 않게 한다(안에 든 입력칸의 포커스가 풀린다). */
function Section({
  isMain,
  name,
  first,
  children,
}: {
  isMain: boolean;
  /** 오류 이동 대상 이름 — 첫 섹션은 안의 입력칸들이 각자 대상이라 생략한다. */
  name?: string;
  first?: boolean;
  children: ReactNode;
}) {
  const className = cn(
    "flex flex-col",
    first ? "gap-4" : "gap-3",
    !isMain && !first && "border-t-2 border-dashed border-pixel-ink/35 pt-4",
  );
  return isMain ? (
    <Card className={className} {...(name ? { "data-form-target": name } : {})}>
      {children}
    </Card>
  ) : (
    <div className={className}>{children}</div>
  );
}

export interface WordFieldsProps {
  draft: WordDraft;
  /** 항상 이전 값을 받아 새 값을 돌려주는 함수형 갱신 — AI 분석이 끝나는 시점에 다른 입력과 겹쳐도 안전하다. */
  onChange: (updater: DraftUpdater) => void;
  /** main: 섹션마다 Card(새 단어 폼 최상위) / nested: 다른 Card 안에 들어가는 평면 레이아웃. */
  variant: "main" | "nested";
  /** 메인 단어의 필드별 검증 오류(카드는 카드 단위로 오류를 보여주므로 없다). */
  errors?: FieldErrors;
  /** 필드를 고쳤을 때 호출 — 그 필드의 검증 오류를 지우는 데 쓴다. */
  onEdit?: (field: FieldErrorKey) => void;
  wordInputRef?: Ref<HTMLInputElement>;
}

/**
 * 단어 입력 UI 전체(단어·AI 자동 완성·기본 정보·뜻·예문·관련 표현). 메인 단어와 추가 카드가 같은
 * 컴포넌트를 쓰므로 음성 입력, 섹션별 AI 채우기, 덮어쓰기 확인, 분석 대기 안내가 양쪽에 똑같이 적용된다.
 * AI 분석 호출과 결과 반영은 여기서 끝나고, 부모는 `draft`/`onChange`만 다룬다.
 */
export function WordFields({
  draft,
  onChange,
  variant,
  errors,
  onEdit,
  wordInputRef,
}: WordFieldsProps) {
  const isMain = variant === "main";
  const target = (name: string) => (isMain ? { "data-form-target": name } : {});

  const [overwriteTarget, setOverwriteTarget] = useState<AnalysisTarget | null>(null);
  // AI가 존재하지 않는 단어로 판정하면 폼을 채우지 않고 이 안내를 모달로 보여준다.
  const [notFound, setNotFound] = useState<{
    message: string;
    suggestion?: string;
    target: AnalysisTarget;
  } | null>(null);
  // 분석이 끝났을 때의 "지금" 단어와 비교하려고 최신 draft를 ref로 들고 있는다.
  const latestDraft = useRef(draft);
  useEffect(() => {
    latestDraft.current = draft;
  });

  const analyzeMutation = useMutation<
    AnalyzeWordResult,
    Error,
    { target: AnalysisTarget; word: string }
  >({
    mutationFn: ({ word }) =>
      apiFetch<AnalyzeWordResult>("/api/ai/analyze-word", {
        method: "POST",
        body: { word },
        timeoutMs: 45_000,
      }),
    onSuccess: ({ id, result }, { target: analyzedTarget, word }) => {
      // 분석하는 동안 단어를 고쳤다면 이전 단어의 결과이므로 적용하지 않는다.
      if (latestDraft.current.word.trim() !== word.trim()) {
        toast.info("분석하는 동안 단어가 바뀌어서 결과를 적용하지 않았어요.");
        return;
      }
      onChange((prev) => applyAnalysis(prev, id, result, analyzedTarget));
      if (analyzedTarget === "all" || analyzedTarget === "basic") {
        onEdit?.("reading");
        onEdit?.("partOfSpeech");
      }
      if (analyzedTarget === "all" || analyzedTarget === "meanings") onEdit?.("meanings");
    },
    onError: (err, { target: failedTarget }) => {
      if (isWordNotFound(err)) {
        const suggestion = err.details?.suggestion;
        setNotFound({
          message: err.message,
          suggestion: typeof suggestion === "string" ? suggestion : undefined,
          target: failedTarget,
        });
        return;
      }
      toast.error(err instanceof ApiClientError ? err.message : "AI 분석에 실패했습니다.");
    },
  });

  const analyzing = analyzeMutation.isPending;
  const hasWord = !!draft.word.trim();

  function isAnalyzing(t: AnalysisTarget) {
    return analyzing && analyzeMutation.variables?.target === t;
  }

  function startAnalysis(t: AnalysisTarget) {
    // 사용자가 직접 입력한 값이 있으면 덮어쓰기 전에 한 번 확인한다.
    if (userEnteredSections(draft, t).length > 0) {
      setOverwriteTarget(t);
      return;
    }
    analyzeMutation.mutate({ target: t, word: draft.word });
  }

  /** 추천 단어로 바꾸고, 방금 실패한 것과 같은 범위로 다시 분석한다. */
  function applySuggestion() {
    if (!notFound?.suggestion) return;
    const { suggestion, target: retryTarget } = notFound;
    setNotFound(null);
    onEdit?.("word");
    onChange((prev) => resetAiState({ ...prev, word: suggestion }));
    analyzeMutation.mutate({ target: retryTarget, word: suggestion });
  }

  function confirmOverwrite() {
    if (!overwriteTarget) return;
    analyzeMutation.mutate({ target: overwriteTarget, word: draft.word });
    setOverwriteTarget(null);
  }

  /** 사용자 수정: 필드 오류를 지우고, AI 분석이 있으면 "수정됨"으로 기록한다. */
  function edit(field: FieldErrorKey | null, fn: DraftUpdater) {
    if (field) onEdit?.(field);
    onChange((prev) => markEdited(fn(prev)));
  }

  function handleWordChange(value: string) {
    onEdit?.("word");
    onChange((prev) => {
      const next = { ...prev, word: value };
      return prev.aiAnalysisId ? resetAiState(next) : next;
    });
  }

  const updateMeaning = (index: number, value: string) =>
    edit("meanings", (d) => ({
      ...d,
      meanings: d.meanings.map((m, i) => (i === index ? value : m)),
      aiMeaningHighlight: d.aiMeaningHighlight.map((h, i) => (i === index ? false : h)),
    }));
  const addMeaning = () =>
    edit("meanings", (d) =>
      d.meanings.length >= MAX_MEANINGS
        ? d
        : {
            ...d,
            meanings: [...d.meanings, ""],
            aiMeaningHighlight: [...d.aiMeaningHighlight, false],
          },
    );
  const removeMeaning = (index: number) =>
    edit("meanings", (d) =>
      d.meanings.length <= 1
        ? d
        : {
            ...d,
            meanings: d.meanings.filter((_, i) => i !== index),
            aiMeaningHighlight: d.aiMeaningHighlight.filter((_, i) => i !== index),
          },
    );

  const updateExample = (index: number, field: "japanese" | "korean", value: string) =>
    edit("examples", (d) => ({
      ...d,
      examples: d.examples.map((e, i) => (i === index ? { ...e, [field]: value } : e)),
      aiExampleHighlight: d.aiExampleHighlight.map((h, i) => (i === index ? false : h)),
    }));
  const addExample = () =>
    edit("examples", (d) =>
      d.examples.length >= MAX_EXAMPLES
        ? d
        : {
            ...d,
            examples: [...d.examples, { japanese: "", korean: "" }],
            aiExampleHighlight: [...d.aiExampleHighlight, false],
          },
    );
  const removeExample = (index: number) =>
    edit("examples", (d) => ({
      ...d,
      examples: d.examples.filter((_, i) => i !== index),
      aiExampleHighlight: d.aiExampleHighlight.filter((_, i) => i !== index),
    }));

  const updateRelated = (index: number, patch: Partial<RelatedExpressionRow>) =>
    edit("relatedExpressions", (d) => ({
      ...d,
      relatedExpressions: d.relatedExpressions.map((r, i) =>
        i === index ? { ...r, ...patch } : r,
      ),
      aiRelatedHighlight: d.aiRelatedHighlight.map((h, i) => (i === index ? false : h)),
    }));
  const addRelated = () =>
    edit("relatedExpressions", (d) =>
      d.relatedExpressions.length >= MAX_RELATED_EXPRESSIONS
        ? d
        : {
            ...d,
            relatedExpressions: [
              ...d.relatedExpressions,
              { relationType: "SIMILAR", expression: "", meaning: "" },
            ],
            aiRelatedHighlight: [...d.aiRelatedHighlight, false],
          },
    );
  const removeRelated = (index: number) =>
    edit("relatedExpressions", (d) => ({
      ...d,
      relatedExpressions: d.relatedExpressions.filter((_, i) => i !== index),
      aiRelatedHighlight: d.aiRelatedHighlight.filter((_, i) => i !== index),
    }));

  const fillButton = (t: AnalysisTarget) => (
    <button
      type="button"
      onClick={() => startAnalysis(t)}
      disabled={!hasWord || analyzing}
      className={FILL_BUTTON_CLASS}
    >
      <PixelSparkles className="size-3" aria-hidden="true" />
      {isAnalyzing(t) ? "채우는 중..." : "이 항목만 채우기"}
    </button>
  );

  const overwriteSections = overwriteTarget ? userEnteredSections(draft, overwriteTarget) : [];

  return (
    <>
      <Section isMain={isMain} first>
        <div className="flex items-end gap-2" {...target("word")}>
          <div className="min-w-0 flex-1">
            <Input
              ref={wordInputRef}
              label="단어"
              value={draft.word}
              onChange={(e) => handleWordChange(e.target.value)}
              error={errors?.word}
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
              disabled={!hasWord || analyzing}
              onClick={() => startAnalysis("all")}
            >
              <PixelSparkles className="size-3.5" aria-hidden="true" />
              전체 자동분석
            </Button>
          </div>
          {analyzing && (
            <p role="status" className="text-xs text-foreground/50">
              AI가 분석하고 있어요. 최대 30초 정도 걸릴 수 있어요.
            </p>
          )}
          {analyzeMutation.isError && !isWordNotFound(analyzeMutation.error) && (
            <p className="text-xs text-error">
              AI 분석에 실패했어요. 직접 입력해도 괜찮아요.{" "}
              <button
                type="button"
                onClick={() =>
                  analyzeMutation.variables && analyzeMutation.mutate(analyzeMutation.variables)
                }
                className="font-bold text-primary hover:underline"
              >
                다시 시도
              </button>
            </p>
          )}
        </div>

        <div className="flex items-center justify-between border-t-2 border-dashed border-pixel-ink/35 pt-3">
          <span className="text-sm font-medium text-foreground">기본 정보</span>
          {fillButton("basic")}
        </div>

        <div className="flex flex-col gap-1" {...target("reading")}>
          <Input
            label="후리가나"
            value={draft.reading}
            onChange={(e) =>
              edit("reading", (d) => ({
                ...d,
                reading: e.target.value,
                aiHighlight: { ...d.aiHighlight, reading: false },
              }))
            }
            className={cn(draft.aiHighlight.reading && AI_HIGHLIGHT_CLASS)}
            error={errors?.reading}
            required
          />
          {draft.aiHighlight.reading && AI_BADGE}
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="flex flex-col gap-1" {...target("partOfSpeech")}>
            <Select
              label="품사"
              value={draft.partOfSpeech}
              onChange={(e) =>
                edit("partOfSpeech", (d) => ({
                  ...d,
                  partOfSpeech: e.target.value,
                  aiHighlight: { ...d.aiHighlight, partOfSpeech: false },
                }))
              }
              options={PART_OF_SPEECH_SELECT_OPTIONS}
              className={cn(draft.aiHighlight.partOfSpeech && AI_HIGHLIGHT_CLASS)}
              error={errors?.partOfSpeech}
              required
            />
            {draft.aiHighlight.partOfSpeech && AI_BADGE}
          </div>
          <div className="flex flex-col gap-1">
            <Select
              label="JLPT 난이도"
              value={draft.jlptLevel}
              onChange={(e) =>
                edit(null, (d) => ({
                  ...d,
                  jlptLevel: e.target.value,
                  aiHighlight: { ...d.aiHighlight, jlptLevel: false },
                }))
              }
              options={JLPT_SELECT_OPTIONS}
              className={cn(draft.aiHighlight.jlptLevel && AI_HIGHLIGHT_CLASS)}
            />
            {draft.aiHighlight.jlptLevel && AI_BADGE}
          </div>
        </div>
      </Section>

      <Section isMain={isMain} name="meanings">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-foreground">
            뜻<span className="text-error"> *</span>
          </span>
          <div className="flex items-center gap-3">
            {fillButton("meanings")}
            <button type="button" onClick={addMeaning} className={ADD_BUTTON_CLASS}>
              <PixelPlus className="size-3" aria-hidden="true" />뜻 추가
            </button>
          </div>
        </div>
        {draft.meanings.map((meaning, index) => (
          <div key={index} className="flex flex-col gap-1">
            <div className="flex items-center gap-2">
              <Input
                value={meaning}
                onChange={(e) => updateMeaning(index, e.target.value)}
                placeholder={`뜻 ${index + 1}`}
                className={cn("flex-1", draft.aiMeaningHighlight[index] && AI_HIGHLIGHT_CLASS)}
              />
              <button
                type="button"
                onClick={() => removeMeaning(index)}
                disabled={draft.meanings.length <= 1}
                aria-label="뜻 삭제"
                className={cn(
                  REMOVE_BUTTON_CLASS,
                  "disabled:pointer-events-none disabled:opacity-40",
                )}
              >
                <PixelX className="size-3.5" aria-hidden="true" />
              </button>
            </div>
            {draft.aiMeaningHighlight[index] && AI_BADGE}
          </div>
        ))}
        {errors?.meanings && (
          <p role="alert" className="text-xs text-error">
            {errors.meanings}
          </p>
        )}
      </Section>

      <Section isMain={isMain} name="examples">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-foreground">예문</span>
          <div className="flex items-center gap-3">
            {fillButton("examples")}
            <button type="button" onClick={addExample} className={ADD_BUTTON_CLASS}>
              <PixelPlus className="size-3" aria-hidden="true" />
              예문 추가
            </button>
          </div>
        </div>
        {draft.examples.length === 0 && (
          <p className="text-xs text-foreground/50">선택 사항이에요. 필요하면 추가해보세요.</p>
        )}
        {draft.examples.map((example, index) => (
          <div key={index} className="flex flex-col gap-1">
            <div
              className={cn(
                "flex items-start gap-2 border-2 border-pixel-ink bg-background p-3",
                draft.aiExampleHighlight[index] && AI_HIGHLIGHT_CLASS,
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
                className={REMOVE_BUTTON_CLASS}
              >
                <PixelX className="size-3.5" aria-hidden="true" />
              </button>
            </div>
            {draft.aiExampleHighlight[index] && AI_BADGE}
          </div>
        ))}
        {errors?.examples && (
          <p role="alert" className="text-xs text-error">
            {errors.examples}
          </p>
        )}
      </Section>

      <Section isMain={isMain} name="relatedExpressions">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-foreground">관련 표현</span>
          <div className="flex items-center gap-3">
            {fillButton("related")}
            <button type="button" onClick={addRelated} className={ADD_BUTTON_CLASS}>
              <PixelPlus className="size-3" aria-hidden="true" />
              표현 추가
            </button>
          </div>
        </div>
        {draft.relatedExpressions.length === 0 && (
          <p className="text-xs text-foreground/50">
            선택 사항이에요. 유사어·반대말·파생어처럼 이 단어와 관계된 표현을 추가해보세요.
          </p>
        )}
        {draft.relatedExpressions.map((related, index) => (
          <div key={index} className="flex flex-col gap-1">
            <div
              className={cn(
                "flex items-start gap-2 border-2 border-pixel-ink bg-background p-3",
                draft.aiRelatedHighlight[index] && AI_HIGHLIGHT_CLASS,
              )}
            >
              <Select
                value={related.relationType}
                onChange={(e) =>
                  updateRelated(index, { relationType: e.target.value as RelatedExpressionType })
                }
                options={RELATED_EXPRESSION_TYPE_SELECT_OPTIONS}
                className="w-28 shrink-0"
              />
              <div className="flex flex-1 flex-col gap-2">
                <Input
                  value={related.expression}
                  onChange={(e) => updateRelated(index, { expression: e.target.value })}
                  placeholder="일본어 표현"
                />
                <Input
                  value={related.meaning}
                  onChange={(e) => updateRelated(index, { meaning: e.target.value })}
                  placeholder="뜻"
                />
              </div>
              <button
                type="button"
                onClick={() => removeRelated(index)}
                aria-label="관련 표현 삭제"
                className={REMOVE_BUTTON_CLASS}
              >
                <PixelX className="size-3.5" aria-hidden="true" />
              </button>
            </div>
            {draft.aiRelatedHighlight[index] && AI_BADGE}
          </div>
        ))}
        {errors?.relatedExpressions && (
          <p role="alert" className="text-xs text-error">
            {errors.relatedExpressions}
          </p>
        )}
      </Section>

      <Modal
        open={notFound !== null}
        onClose={() => setNotFound(null)}
        title="존재하지 않는 단어예요"
      >
        <div className="flex flex-col gap-4">
          <p className="text-sm text-foreground">{notFound?.message}</p>
          <p className="text-xs text-foreground/60">
            단어를 고쳐 다시 분석하거나, 그대로 직접 입력해 등록할 수도 있어요.
          </p>
          <div className="flex flex-wrap justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => setNotFound(null)}>
              확인
            </Button>
            {notFound?.suggestion && (
              <Button type="button" onClick={applySuggestion}>
                「{notFound.suggestion}」로 바꾸고 다시 분석
              </Button>
            )}
          </div>
        </div>
      </Modal>

      <Modal
        open={overwriteTarget !== null}
        onClose={() => setOverwriteTarget(null)}
        title="입력한 내용을 바꿀까요?"
      >
        <div className="flex flex-col gap-4">
          <p className="text-sm text-foreground">
            직접 입력한 <b>{overwriteSections.join(", ")}</b>이(가) AI 결과로 바뀌어요.
          </p>
          <p className="text-xs text-foreground/60">
            바꾸지 않으려면 취소하고, 비어 있는 항목만 직접 채워도 돼요.
          </p>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => setOverwriteTarget(null)}>
              취소
            </Button>
            <Button type="button" onClick={confirmOverwrite}>
              AI 결과로 채우기
            </Button>
          </div>
        </div>
      </Modal>
    </>
  );
}
