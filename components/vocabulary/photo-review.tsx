"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { achievementToast } from "@/components/game/achievement-toast";
import {
  PixelCheck,
  PixelPenTool,
  PixelSparkles,
  PixelSpinner,
  PixelTrash,
  PixelX,
} from "@/components/icons/pixel-icons";
import { JlptBadge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { ChipButton } from "@/components/ui/chip-button";
import { Modal } from "@/components/ui/modal";
import { ProgressBar } from "@/components/ui/progress-bar";
import { toast } from "@/components/ui/toast";
import { DuplicateReviewModal } from "@/components/vocabulary/duplicate-review-modal";
import type {
  DuplicateResolution,
  DuplicateReviewItem,
} from "@/components/vocabulary/duplicate-review-modal";
import { VocabularyForm } from "@/components/vocabulary/vocabulary-form";
import { ApiClientError, apiFetch } from "@/lib/api/client";
import { cn } from "@/lib/utils";
import type { UnlockedAchievementView } from "@/types/achievement";
import type { OcrWordBatchJobView, OcrWordCandidateView } from "@/types/ocr-word-batch";
import type { PhotoUploadDetail } from "@/types/photo-upload";
import type { BulkSaveSummary, DuplicateCheckResult, VocabularyDetail } from "@/types/vocabulary";
import type { VocabularyBookSummary } from "@/types/vocabulary-book";

interface PhotoReviewProps {
  photoId: string;
}

interface ItemOverride {
  selected?: boolean;
  removed?: boolean;
  savedId?: string;
}

/** While the (synchronous) analyze POST is in flight, a separate GET on this interval shows live
 * progress — the Next.js server handles both requests concurrently, so this observes the same
 * `AIAnalysis` row's progress fields as the POST mutates them (lib/ocr/word-batch.ts). */
const POLL_INTERVAL_MS = 1500;

export function PhotoReview({ photoId }: PhotoReviewProps) {
  const router = useRouter();
  const queryClient = useQueryClient();

  const [job, setJob] = useState<OcrWordBatchJobView | null>(null);
  const [extracting, setExtracting] = useState(true);
  const [extractError, setExtractError] = useState<string>();
  const [analyzing, setAnalyzing] = useState(false);
  const [analyzeError, setAnalyzeError] = useState<string>();

  const [itemState, setItemState] = useState<Record<number, ItemOverride>>({});
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [selectedBookIds, setSelectedBookIds] = useState<string[]>([]);
  const [bulkSaving, setBulkSaving] = useState(false);
  const [checkingDuplicates, setCheckingDuplicates] = useState(false);
  const [duplicateReview, setDuplicateReview] = useState<DuplicateReviewItem[] | null>(null);

  const photoQuery = useQuery({
    queryKey: ["vocabulary-photo", photoId],
    queryFn: () => apiFetch<PhotoUploadDetail>(`/api/vocabulary-photos/${photoId}`),
  });

  const { data: books } = useQuery({
    queryKey: ["vocabulary-books"],
    queryFn: () => apiFetch<VocabularyBookSummary[]>("/api/vocabulary-books"),
  });

  // Runs the OCR-correction + word-split AI call once per photo — idempotent (returns the
  // existing job if one was already created), so this is safe to fire on every mount.
  useEffect(() => {
    let cancelled = false;

    apiFetch<OcrWordBatchJobView>(`/api/vocabulary-photos/${photoId}/words`, {
      method: "POST",
      timeoutMs: 45_000,
    })
      .then((result) => {
        if (!cancelled) setJob(result);
      })
      .catch((err) => {
        if (!cancelled) {
          setExtractError(err instanceof ApiClientError ? err.message : "단어 추출에 실패했어요.");
        }
      })
      .finally(() => {
        if (!cancelled) setExtracting(false);
      });

    return () => {
      cancelled = true;
    };
  }, [photoId]);

  // Live progress polling while a batch analysis is running (see POLL_INTERVAL_MS above).
  useEffect(() => {
    if (!analyzing) return;
    const interval = setInterval(() => {
      apiFetch<OcrWordBatchJobView>(`/api/vocabulary-photos/${photoId}/words`)
        .then((result) => setJob(result))
        .catch(() => {
          /* best-effort — runAnalyze's own catch surfaces real failures */
        });
    }, POLL_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [analyzing, photoId]);

  async function runAnalyze() {
    setAnalyzing(true);
    setAnalyzeError(undefined);
    try {
      const result = await apiFetch<OcrWordBatchJobView>(
        `/api/vocabulary-photos/${photoId}/words/analyze`,
        { method: "POST", timeoutMs: 65_000 },
      );
      setJob(result);
    } catch (err) {
      setAnalyzeError(err instanceof ApiClientError ? err.message : "단어 분석에 실패했어요.");
    } finally {
      setAnalyzing(false);
    }
  }

  function isSelected(index: number, candidate: OcrWordCandidateView): boolean {
    const override = itemState[index]?.selected;
    if (override !== undefined) return override;
    return candidate.status === "done";
  }
  function isRemoved(index: number): boolean {
    return !!itemState[index]?.removed;
  }
  function savedIdOf(index: number): string | undefined {
    return itemState[index]?.savedId;
  }
  function toggleSelected(index: number, candidate: OcrWordCandidateView) {
    setItemState((prev) => ({
      ...prev,
      [index]: { ...prev[index], selected: !isSelected(index, candidate) },
    }));
  }
  function removeItem(index: number) {
    setItemState((prev) => ({
      ...prev,
      [index]: { ...prev[index], removed: true, selected: false },
    }));
  }
  function toggleBook(id: string) {
    setSelectedBookIds((prev) =>
      prev.includes(id) ? prev.filter((b) => b !== id) : [...prev, id],
    );
  }

  function handleIndividualSaved(index: number, saved: VocabularyDetail) {
    setItemState((prev) => ({
      ...prev,
      [index]: { ...prev[index], savedId: saved.id, selected: false },
    }));
    setEditingIndex(null);
  }

  const notStarted = job ? job.words.every((word) => word.status === "pending") : false;
  const isSettled = job ? job.completed === job.total : false;

  const eligibleIndices = job
    ? job.words
        .map((_, index) => index)
        .filter(
          (index) =>
            job.words[index].status === "done" &&
            job.words[index].result &&
            !isRemoved(index) &&
            !savedIdOf(index),
        )
    : [];
  const selectedEligibleIndices = job
    ? eligibleIndices.filter((index) => isSelected(index, job.words[index]))
    : [];

  function selectAll() {
    setItemState((prev) => {
      const next = { ...prev };
      eligibleIndices.forEach((index) => {
        next[index] = { ...next[index], selected: true };
      });
      return next;
    });
  }
  function deselectAll() {
    setItemState((prev) => {
      const next = { ...prev };
      eligibleIndices.forEach((index) => {
        next[index] = { ...next[index], selected: false };
      });
      return next;
    });
  }

  function showUnlockedAchievements(unlocked: UnlockedAchievementView[]) {
    if (unlocked.length === 0) return;
    const uniqueAchievements = Array.from(new Map(unlocked.map((a) => [a.title, a])).values());
    uniqueAchievements.forEach((achievement) => achievementToast.show(achievement.title));
    queryClient.invalidateQueries({ queryKey: ["game", "achievements"] });
  }

  /** 저장 직전 중복 확인(계획서 27장) — 선택한 단어들을 사용자가 이미 보유한 단어와 비교한다. */
  async function handleBulkAdd() {
    if (!job || selectedBookIds.length === 0 || selectedEligibleIndices.length === 0) return;

    setCheckingDuplicates(true);
    try {
      const candidates = selectedEligibleIndices.map((index) => ({
        index,
        result: job.words[index].result!,
      }));
      const checks = await apiFetch<DuplicateCheckResult[]>("/api/vocabularies/check-duplicates", {
        method: "POST",
        body: {
          items: candidates.map(({ result }) => ({ word: result.word, reading: result.reading })),
        },
      });

      const reviewItems: DuplicateReviewItem[] = candidates.map(({ index, result }, i) => {
        const check = checks[i];
        return {
          index,
          word: result.word,
          reading: result.reading,
          meanings: result.meanings,
          isDuplicate: check.isDuplicate,
          existing: check.existing,
          resolution: check.isDuplicate ? "skip" : "create",
        };
      });

      if (reviewItems.some((item) => item.isDuplicate)) {
        setDuplicateReview(reviewItems);
      } else {
        await finalizeSave(reviewItems);
      }
    } catch (err) {
      toast.error(err instanceof ApiClientError ? err.message : "중복 확인에 실패했어요.");
    } finally {
      setCheckingDuplicates(false);
    }
  }

  function changeDuplicateResolution(index: number, resolution: DuplicateResolution) {
    setDuplicateReview((prev) =>
      prev ? prev.map((item) => (item.index === index ? { ...item, resolution } : item)) : prev,
    );
  }

  /** 사용자가 고른 처리 방식(create/skip/link)대로 대량 저장을 실행한다. */
  async function finalizeSave(reviewItems: DuplicateReviewItem[]) {
    if (!job) return;

    setBulkSaving(true);
    try {
      const items = reviewItems.map((item) => {
        if (item.resolution === "skip") {
          return { resolution: "skip" as const, word: item.word, reading: item.reading };
        }
        if (item.resolution === "link") {
          return {
            resolution: "link" as const,
            word: item.word,
            reading: item.reading,
            existingVocabularyId: item.existing!.id,
          };
        }
        const candidate = job.words[item.index];
        const result = candidate.result!;
        return {
          resolution: "create" as const,
          word: result.word,
          reading: result.reading,
          partOfSpeech: result.partOfSpeech,
          jlptLevel: result.jlptLevel,
          meanings: result.meanings,
          examples: result.examples,
          aiAnalysisId: candidate.vocabularyAnalysisId,
          aiFieldsEdited: false,
        };
      });

      const summary = await apiFetch<BulkSaveSummary>("/api/vocabularies/bulk", {
        method: "POST",
        body: { vocabularyBookIds: selectedBookIds, items },
      });

      setItemState((prev) => {
        const next = { ...prev };
        reviewItems.forEach((item, i) => {
          const outcome = summary.results[i];
          next[item.index] = outcome?.vocabularyId
            ? { ...next[item.index], savedId: outcome.vocabularyId }
            : { ...next[item.index], selected: false };
        });
        return next;
      });
      setDuplicateReview(null);

      const savedCount = summary.addedCount + summary.linkedCount;
      if (savedCount > 0) {
        queryClient.invalidateQueries({ queryKey: ["vocabularies"] });
        queryClient.invalidateQueries({ queryKey: ["vocabulary-books"] });
        toast.success(
          `단어 ${savedCount}개가 추가되었습니다.` +
            (summary.skippedCount > 0 ? ` (${summary.skippedCount}개는 건너뛰었어요)` : ""),
        );
      } else if (summary.skippedCount > 0) {
        toast.success("선택한 단어를 모두 건너뛰었어요.");
      }

      showUnlockedAchievements(summary.unlockedAchievements);

      if (savedCount > 0) {
        router.push(
          selectedBookIds.length === 1 ? `/vocabulary/${selectedBookIds[0]}` : "/vocabulary",
        );
      }
    } catch (err) {
      toast.error(err instanceof ApiClientError ? err.message : "저장 중 오류가 발생했습니다.");
    } finally {
      setBulkSaving(false);
    }
  }

  const editingCandidate = editingIndex !== null && job ? job.words[editingIndex] : null;

  return (
    <div className="flex flex-col gap-6">
      {photoQuery.isLoading && (
        <Card className="flex items-center justify-center py-10">
          <PixelSpinner className="size-6 animate-spin text-primary" aria-hidden="true" />
        </Card>
      )}
      {photoQuery.isError && (
        <p role="alert" className="text-sm text-error">
          {photoQuery.error instanceof ApiClientError
            ? photoQuery.error.message
            : "사진을 불러오지 못했어요."}
        </p>
      )}
      {photoQuery.data && (
        <Card className="flex flex-col gap-2">
          {/* eslint-disable-next-line @next/next/no-img-element -- short-lived presigned URL, not a remote/optimizable asset */}
          <img
            src={photoQuery.data.previewUrl}
            alt="원본 사진"
            className="max-h-80 w-full border-2 border-pixel-ink object-contain"
          />
        </Card>
      )}

      {job && (
        <details className="text-xs text-foreground/60">
          <summary className="cursor-pointer font-bold">OCR 원본 텍스트 보기</summary>
          <pre className="mt-2 max-h-40 overflow-y-auto whitespace-pre-wrap break-words border-2 border-pixel-ink bg-surface p-3 font-content text-foreground">
            {job.rawText}
          </pre>
        </details>
      )}

      {extracting && (
        <Card className="flex items-center gap-3 py-6">
          <PixelSpinner className="size-5 shrink-0 animate-spin text-primary" aria-hidden="true" />
          <p className="text-sm font-bold text-foreground">사진에서 학습할 단어를 찾고 있어요...</p>
        </Card>
      )}
      {extractError && (
        <div className="flex flex-col gap-2">
          <p role="alert" className="text-sm text-error">
            {extractError}
          </p>
        </div>
      )}

      {job && job.total === 0 && (
        <Card className="flex flex-col items-center gap-3 py-8 text-center">
          <p className="text-base font-bold text-foreground">
            이 사진에서는 학습할 단어를 찾지 못했어요.
          </p>
          <p className="text-sm text-foreground/60">더 선명한 사진으로 다시 시도해보세요.</p>
          <div className="flex gap-2">
            <Link href="/vocabulary/photos/new">
              <Button variant="outline">사진 다시 올리기</Button>
            </Link>
            <Link href="/vocabulary">
              <Button>단어장으로 이동</Button>
            </Link>
          </div>
        </Card>
      )}

      {job && job.total > 0 && notStarted && (
        <Card className="flex flex-col items-center gap-3 py-8 text-center">
          <p className="text-lg font-bold text-foreground">
            사진에서 {job.total}개의 단어를 발견했습니다
          </p>
          <p className="text-sm text-foreground/60">
            AI가 각 단어의 후리가나·뜻·예문을 분석해요. 단어 수가 많으면 시간이 걸릴 수 있어요.
          </p>
          <Button onClick={runAnalyze} loading={analyzing}>
            <PixelSparkles className="size-4" aria-hidden="true" />
            AI 분석 시작
          </Button>
          {analyzeError && <p className="text-sm text-error">{analyzeError}</p>}
        </Card>
      )}

      {job && job.total > 0 && !notStarted && !isSettled && (
        <Card className="flex flex-col gap-3">
          <ProgressBar value={job.completed} max={job.total} label="분석 진행률" />
          {job.failed > 0 && (
            <p className="text-xs text-error">
              {job.failed}개 단어 분석에 실패했어요. 아래 목록에서 확인할 수 있어요.
            </p>
          )}
          {!analyzing && (
            <Button variant="outline" size="sm" className="self-start" onClick={runAnalyze}>
              이어서 분석
            </Button>
          )}
          {analyzeError && <p className="text-sm text-error">{analyzeError}</p>}
        </Card>
      )}

      {job && job.total > 0 && !notStarted && (
        <>
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-foreground">
              단어 목록 ({job.words.filter((_, i) => !isRemoved(i)).length}개)
            </span>
            <div className="flex gap-3 text-xs font-bold">
              <button type="button" onClick={selectAll} className="text-primary hover:underline">
                전체 선택
              </button>
              <button
                type="button"
                onClick={deselectAll}
                className="text-foreground/60 hover:underline"
              >
                선택 해제
              </button>
            </div>
          </div>

          <div className="flex flex-col gap-3">
            {job.words.map((candidate, index) => {
              if (isRemoved(index)) return null;
              const saved = savedIdOf(index);
              const selected = isSelected(index, candidate);
              const isDiffering = candidate.original !== candidate.corrected;

              return (
                <Card key={index} className={cn("flex flex-col gap-2", saved && "opacity-60")}>
                  <div className="flex items-start gap-3">
                    {candidate.status === "done" && candidate.result ? (
                      <Checkbox
                        checked={selected}
                        disabled={!!saved}
                        onChange={() => toggleSelected(index, candidate)}
                        aria-label={`${candidate.corrected} 선택`}
                      />
                    ) : (
                      <div className="flex size-6 shrink-0 items-center justify-center">
                        {candidate.status === "pending" ? (
                          <PixelSpinner
                            className="size-4 animate-spin text-foreground/40"
                            aria-hidden="true"
                          />
                        ) : (
                          <PixelX className="size-4 text-error" aria-hidden="true" />
                        )}
                      </div>
                    )}

                    <div className="flex flex-1 flex-col gap-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-base font-bold text-foreground">
                          {candidate.result?.word ?? candidate.corrected}
                        </span>
                        {candidate.result?.reading && (
                          <span className="text-sm text-foreground/60">
                            ({candidate.result.reading})
                          </span>
                        )}
                        {candidate.result?.jlptLevel && (
                          <JlptBadge level={candidate.result.jlptLevel} />
                        )}
                        {saved && (
                          <span className="inline-flex items-center gap-1 border-2 border-pixel-ink bg-success px-2 py-0.5 text-[11px] font-bold text-success-foreground">
                            <PixelCheck className="size-2.5" aria-hidden="true" />
                            저장됨
                          </span>
                        )}
                      </div>

                      {isDiffering && (
                        <p className="text-xs text-foreground/50">
                          OCR 원본: <span className="line-through">{candidate.original}</span> →{" "}
                          {candidate.corrected}
                        </p>
                      )}

                      {candidate.status === "done" && candidate.result && (
                        <p className="text-sm text-foreground/80">{candidate.result.meanings[0]}</p>
                      )}
                      {candidate.status === "pending" && (
                        <p className="text-xs text-foreground/50">분석 중이에요...</p>
                      )}
                      {candidate.status === "failed" && (
                        <p className="text-xs text-error">
                          {candidate.error ?? "분석에 실패했어요."}
                        </p>
                      )}
                    </div>

                    <div className="flex shrink-0 gap-1">
                      <button
                        type="button"
                        onClick={() => setEditingIndex(index)}
                        disabled={!!saved || candidate.status === "pending"}
                        aria-label="수정"
                        className="flex size-8 items-center justify-center border-2 border-pixel-ink bg-surface text-foreground/60 shadow-bevel-raised transition hover:bg-background disabled:pointer-events-none disabled:opacity-40"
                      >
                        <PixelPenTool className="size-3.5" aria-hidden="true" />
                      </button>
                      <button
                        type="button"
                        onClick={() => removeItem(index)}
                        aria-label="삭제"
                        className="flex size-8 items-center justify-center border-2 border-pixel-ink bg-surface text-foreground/60 shadow-bevel-raised transition hover:bg-background"
                      >
                        <PixelTrash className="size-3.5" aria-hidden="true" />
                      </button>
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>

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

          <div className="flex justify-end">
            <Button
              size="lg"
              loading={checkingDuplicates || bulkSaving}
              disabled={selectedBookIds.length === 0 || selectedEligibleIndices.length === 0}
              onClick={handleBulkAdd}
            >
              단어장에 추가 ({selectedEligibleIndices.length}개)
            </Button>
          </div>
        </>
      )}

      <Modal
        open={editingIndex !== null}
        onClose={() => setEditingIndex(null)}
        title={`"${editingCandidate?.corrected ?? ""}" 수정`}
      >
        {editingCandidate && (
          <VocabularyForm
            key={editingIndex}
            initialAnalysis={
              editingCandidate.result && editingCandidate.vocabularyAnalysisId
                ? { id: editingCandidate.vocabularyAnalysisId, result: editingCandidate.result }
                : undefined
            }
            initialWord={editingCandidate.corrected}
            initialBookId={selectedBookIds[0]}
            onSaved={(saved) => handleIndividualSaved(editingIndex as number, saved)}
            onCancel={() => setEditingIndex(null)}
          />
        )}
      </Modal>

      <DuplicateReviewModal
        open={duplicateReview !== null}
        items={duplicateReview ?? []}
        saving={bulkSaving}
        onChangeResolution={changeDuplicateResolution}
        onCancel={() => setDuplicateReview(null)}
        onConfirm={() => duplicateReview && finalizeSave(duplicateReview)}
      />
    </div>
  );
}
