"use client";

import { useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { toast } from "@/components/ui/toast";
import { ApiClientError, apiFetch } from "@/lib/api/client";
import type { ReviewGrade } from "@/lib/srs/types";

export interface SrsTestWord {
  vocabularyId: string;
  word: string;
  reading: string;
  learningStatus: string;
  intervalStage: number;
  correctCount: number;
  wrongCount: number;
  nextReviewAt: string | null;
  lastReviewedAt: string | null;
}

interface ReviewResultResponse {
  vocabularyId: string;
  learningStatus: string;
  intervalStage: number;
  correctCount: number;
  wrongCount: number;
  lastReviewedAt: string;
  nextReviewAt: string;
}

const GRADES: ReviewGrade[] = ["UNKNOWN", "HARD", "GOOD", "EASY"];

const GRADE_LABELS: Record<ReviewGrade, string> = {
  UNKNOWN: "모르겠음",
  HARD: "헷갈림",
  GOOD: "기억남",
  EASY: "쉬움",
};

interface SrsTestPanelProps {
  words: SrsTestWord[];
}

export function SrsTestPanel({ words }: SrsTestPanelProps) {
  const [vocabularyId, setVocabularyId] = useState(words[0]?.vocabularyId ?? "");
  const [useCustomId, setUseCustomId] = useState(false);
  const [customId, setCustomId] = useState("");
  const [pendingGrade, setPendingGrade] = useState<ReviewGrade | null>(null);
  const [result, setResult] = useState<ReviewResultResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  const selectedWord = useMemo(
    () => words.find((w) => w.vocabularyId === vocabularyId),
    [words, vocabularyId],
  );

  const targetId = useCustomId ? customId.trim() : vocabularyId;

  async function handleGrade(grade: ReviewGrade) {
    if (!targetId) return;
    setPendingGrade(grade);
    setError(null);
    try {
      const data = await apiFetch<ReviewResultResponse>(
        `/api/user-vocabulary/${targetId}/review-result`,
        { method: "POST", body: { grade, requestId: crypto.randomUUID() } },
      );
      setResult(data);
      toast.success(`${GRADE_LABELS[grade]} 처리 완료`);
    } catch (err) {
      const message = err instanceof ApiClientError ? `${err.code}: ${err.message}` : "요청에 실패했습니다.";
      setError(message);
      toast.error(message);
    } finally {
      setPendingGrade(null);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-3 border-2 border-pixel-ink bg-surface p-4">
        <Select
          label="테스트할 단어"
          value={vocabularyId}
          onChange={(e) => {
            setVocabularyId(e.target.value);
            setResult(null);
            setError(null);
          }}
          disabled={useCustomId}
          options={words.map((w) => ({
            value: w.vocabularyId,
            label: `${w.word} (${w.reading}) · ${w.learningStatus} · stage ${w.intervalStage}`,
          }))}
        />

        <label className="flex items-center gap-2 text-xs text-foreground/60">
          <input
            type="checkbox"
            checked={useCustomId}
            onChange={(e) => {
              setUseCustomId(e.target.checked);
              setResult(null);
              setError(null);
            }}
          />
          vocabulary id 직접 입력(잘못된 id 테스트용)
        </label>
        {useCustomId && (
          <input
            type="text"
            value={customId}
            onChange={(e) => setCustomId(e.target.value)}
            placeholder="vocabulary id"
            className="border-2 border-pixel-ink bg-background px-3 py-2 text-sm text-foreground"
          />
        )}

        {selectedWord && !useCustomId && (
          <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs text-foreground/70">
            <span>correct_count: {selectedWord.correctCount}</span>
            <span>wrong_count: {selectedWord.wrongCount}</span>
            <span>last_reviewed_at: {selectedWord.lastReviewedAt ?? "-"}</span>
            <span>next_review_at: {selectedWord.nextReviewAt ?? "-"}</span>
          </div>
        )}
      </div>

      <div className="flex flex-wrap gap-2">
        {GRADES.map((grade) => (
          <Button
            key={grade}
            type="button"
            variant={grade === "UNKNOWN" ? "danger" : grade === "EASY" ? "primary" : "outline"}
            loading={pendingGrade === grade}
            disabled={!targetId || pendingGrade !== null}
            onClick={() => handleGrade(grade)}
          >
            {GRADE_LABELS[grade]}
          </Button>
        ))}
      </div>

      {error && <div className="border-2 border-error bg-error/10 p-3 text-sm text-error">{error}</div>}

      {result && (
        <pre className="overflow-x-auto border-2 border-pixel-ink bg-background p-3 text-xs text-foreground">
          {JSON.stringify(result, null, 2)}
        </pre>
      )}
    </div>
  );
}
