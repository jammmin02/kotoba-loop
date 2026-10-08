"use client";

import Link from "next/link";

import { Button, buttonVariants } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { ImportItemStatus } from "@/lib/vocabulary-io/schema";

export interface ProblemRow {
  rowNumber: number;
  word: string;
  reason: string;
}

interface ImportResultProps {
  counts: Record<ImportItemStatus, number>;
  /** 건너뜀 사유별 개수. */
  skippedReasons: [reason: string, count: number][];
  /** 저장 중 실패했거나 중단돼서 처리하지 못한 행. */
  failedRows: ProblemRow[];
  /** 파일을 읽을 때 걸러진 오류 행 수(저장 시도 전). */
  parseErrorCount: number;
  stopped: boolean;
  onRetryFailed: () => void;
  onDownloadProblems: () => void;
  onRestart: () => void;
}

const COUNT_LABELS: [ImportItemStatus, string][] = [
  ["created", "추가"],
  ["overwritten", "덮어씀"],
  ["kept-both", "둘 다 유지"],
  ["skipped", "건너뜀"],
  ["failed", "실패"],
];

export function ImportResult({
  counts,
  skippedReasons,
  failedRows,
  parseErrorCount,
  stopped,
  onRetryFailed,
  onDownloadProblems,
  onRestart,
}: ImportResultProps) {
  const savedCount = counts.created + counts.overwritten + counts["kept-both"];
  const hasProblems = failedRows.length > 0 || parseErrorCount > 0;

  return (
    <div className="flex flex-col gap-6">
      <Card
        title={stopped ? "중단했어요" : "가져오기 완료"}
        titleColor={failedRows.length > 0 ? "pink" : "mint"}
        className="flex flex-col gap-4"
      >
        <p role="status" className="text-sm font-bold text-foreground">
          {savedCount}개를 저장했어요.
          {stopped && " 중단해서 나머지는 처리하지 않았어요."}
        </p>

        <ul className="grid grid-cols-2 gap-2 sm:grid-cols-5">
          {COUNT_LABELS.map(([status, label]) => (
            <li
              key={status}
              className="flex flex-col border-2 border-pixel-ink bg-background px-3 py-2"
            >
              <span className="text-xs text-muted">{label}</span>
              <span
                className={cn(
                  "text-lg font-extrabold",
                  status === "failed" && counts.failed > 0 ? "text-error" : "text-foreground",
                )}
              >
                {counts[status]}
              </span>
            </li>
          ))}
        </ul>

        {skippedReasons.length > 0 && (
          <ul className="flex flex-col gap-1 text-xs text-muted">
            {skippedReasons.map(([reason, count]) => (
              <li key={reason}>
                건너뜀 {count}개 — {reason}
              </li>
            ))}
          </ul>
        )}

        {parseErrorCount > 0 && (
          <p className="text-xs text-muted">
            파일을 읽을 때 오류가 있어 제외한 행이 {parseErrorCount}개 있어요.
          </p>
        )}

        <div className="flex flex-wrap gap-2">
          <Link href="/words" className={buttonVariants({ variant: "primary" })}>
            단어 목록 보기
          </Link>
          <Link href="/vocabulary" className={buttonVariants({ variant: "outline" })}>
            단어장 보기
          </Link>
          <Button type="button" variant="outline" onClick={onRestart}>
            다른 파일 가져오기
          </Button>
        </div>
      </Card>

      {hasProblems && (
        <Card title="확인이 필요한 행" titleColor="pink" className="flex flex-col gap-4">
          {failedRows.length > 0 && (
            <div className="overflow-x-auto border-2 border-pixel-ink">
              <table className="w-full min-w-[28rem] text-left text-sm">
                <thead className="bg-background text-xs text-muted">
                  <tr>
                    <th className="px-2 py-1.5">행</th>
                    <th className="px-2 py-1.5">단어</th>
                    <th className="px-2 py-1.5">사유</th>
                  </tr>
                </thead>
                <tbody>
                  {failedRows.slice(0, 100).map((row) => (
                    <tr key={row.rowNumber} className="border-t border-pixel-ink/30 align-top">
                      <td className="px-2 py-1.5 text-muted">{row.rowNumber}</td>
                      <td lang="ja" className="px-2 py-1.5 font-jp font-bold text-foreground">
                        {row.word}
                      </td>
                      <td className="px-2 py-1.5 text-xs text-error">{row.reason}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          {failedRows.length > 100 && (
            <p className="text-xs text-muted">
              앞의 100행만 보여줘요. 전체는 CSV로 내려받아 확인하세요.
            </p>
          )}
          <div className="flex flex-wrap gap-2">
            {failedRows.length > 0 && (
              <Button type="button" onClick={onRetryFailed}>
                실패한 {failedRows.length}행 다시 시도
              </Button>
            )}
            <Button type="button" variant="outline" onClick={onDownloadProblems}>
              확인이 필요한 행 CSV로 받기
            </Button>
          </div>
        </Card>
      )}
    </div>
  );
}
