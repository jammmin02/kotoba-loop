"use client";

import { useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { ChipButton } from "@/components/ui/chip-button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { VOCABULARY_BOOK_NAME_MAX } from "@/lib/validations/vocabulary-book";
import type { ParsedFile } from "@/lib/vocabulary-io/parse";
import type { DuplicatePolicy } from "@/lib/vocabulary-io/schema";
import type { VocabularyBookSummary } from "@/types/vocabulary-book";

export interface ImportOptions {
  policy: DuplicatePolicy;
  includeProgress: boolean;
  /** restore: 파일에 적힌 단어장 구성대로 / single: 한 단어장에 모두. */
  bookMode: "restore" | "single";
  targetKind: "existing" | "new";
  targetBookId: string;
  newBookName: string;
}

const POLICY_INFO: Record<DuplicatePolicy, { label: string; description: string }> = {
  skip: {
    label: "건너뛰기 (추천)",
    description: "이미 있는 단어는 그대로 두고, 새 단어만 추가해요.",
  },
  overwrite: {
    label: "덮어쓰기",
    description:
      "이미 있는 단어의 뜻을 파일 값으로 바꾸고(예문은 파일에 있을 때만), 태그는 합쳐요. 다른 사용자와 공유하는 단어는 건드리지 않아요.",
  },
  "keep-both": {
    label: "둘 다 유지",
    description: "이미 있어도 새 단어로 따로 추가해요. 같은 단어가 두 개가 될 수 있어요.",
  },
};

const PREVIEW_PAGE = 100;

interface ImportReviewProps {
  fileName: string;
  encoding: "utf-8" | "euc-kr";
  parsed: ParsedFile;
  /** 파일 안에서 앞 행과 중복되는 행(행 번호 → 첫 등장 행 번호). */
  fileDuplicates: Map<number, number>;
  /** 이미 내 단어장에 있는 단어의 행 번호. null이면 아직 비교하지 못했다. */
  existingRows: Set<number> | null;
  comparing: { done: number; total: number } | null;
  options: ImportOptions;
  onOptionsChange: (patch: Partial<ImportOptions>) => void;
  books: VocabularyBookSummary[] | undefined;
  importableCount: number;
  hasProgress: boolean;
  hasBookNames: boolean;
  onStart: () => void;
  onBack: () => void;
}

export function ImportReview({
  fileName,
  encoding,
  parsed,
  fileDuplicates,
  existingRows,
  comparing,
  options,
  onOptionsChange,
  books,
  importableCount,
  hasProgress,
  hasBookNames,
  onStart,
  onBack,
}: ImportReviewProps) {
  const [onlyErrors, setOnlyErrors] = useState(false);
  const [shown, setShown] = useState(PREVIEW_PAGE);

  const errorCount = parsed.rows.filter((row) => row.errors.length > 0).length;
  const visibleRows = useMemo(
    () => (onlyErrors ? parsed.rows.filter((row) => row.errors.length > 0) : parsed.rows),
    [parsed.rows, onlyErrors],
  );

  const newBookNameError =
    options.targetKind === "new" && options.bookMode === "single"
      ? !options.newBookName.trim()
        ? "새 단어장 이름을 입력해주세요."
        : options.newBookName.trim().length > VOCABULARY_BOOK_NAME_MAX
          ? `이름은 ${VOCABULARY_BOOK_NAME_MAX}자 이하여야 해요.`
          : undefined
      : undefined;
  const needsExistingBook =
    options.bookMode === "single" && options.targetKind === "existing" && !options.targetBookId;
  const canStart = importableCount > 0 && !comparing && !newBookNameError && !needsExistingBook;

  return (
    <div className="flex flex-col gap-6">
      <Card title="미리보기" className="flex flex-col gap-4">
        <p className="text-sm text-muted">
          <span className="font-bold text-foreground">{fileName}</span> ·{" "}
          {parsed.format === "json" ? "JSON" : "CSV"}
          {encoding === "euc-kr" && " · EUC-KR(한글 엑셀 CSV)로 읽었어요"}
        </p>

        <ul className="grid grid-cols-2 gap-2 text-sm sm:grid-cols-4">
          <SummaryItem label="전체" value={parsed.rows.length} />
          <SummaryItem label="가져올 수 있음" value={importableCount} tone="ok" />
          <SummaryItem
            label="오류"
            value={errorCount}
            tone={errorCount > 0 ? "error" : undefined}
          />
          <SummaryItem label="파일 안 중복" value={fileDuplicates.size} />
        </ul>

        <p role="status" className="text-xs text-muted">
          {comparing
            ? `이미 있는 단어와 비교하는 중… (${comparing.done}/${comparing.total})`
            : existingRows
              ? `이미 있는 단어: ${existingRows.size}개`
              : "이미 있는 단어와는 비교하지 못했어요. 가져올 때 아래 중복 처리 규칙이 적용돼요."}
        </p>

        {parsed.warnings.map((warning) => (
          <p
            key={warning}
            className="text-xs font-bold text-warning-foreground bg-warning px-2 py-1"
          >
            {warning}
          </p>
        ))}

        {errorCount > 0 && (
          <Checkbox
            label="오류가 있는 행만 보기"
            checked={onlyErrors}
            onChange={(e) => {
              setOnlyErrors(e.target.checked);
              setShown(PREVIEW_PAGE);
            }}
          />
        )}

        <div className="overflow-x-auto border-2 border-pixel-ink">
          <table className="w-full min-w-[34rem] text-left text-sm">
            <thead className="bg-background text-xs text-muted">
              <tr>
                <th className="px-2 py-1.5">행</th>
                <th className="px-2 py-1.5">단어</th>
                <th className="px-2 py-1.5">읽기</th>
                <th className="px-2 py-1.5">뜻</th>
                <th className="px-2 py-1.5">상태</th>
              </tr>
            </thead>
            <tbody>
              {visibleRows.slice(0, shown).map((row) => {
                const duplicateOf = fileDuplicates.get(row.rowNumber);
                const isExisting = existingRows?.has(row.rowNumber) ?? false;
                return (
                  <tr key={row.rowNumber} className="border-t border-pixel-ink/30 align-top">
                    <td className="px-2 py-1.5 text-muted">{row.rowNumber}</td>
                    <td lang="ja" className="px-2 py-1.5 font-jp font-bold text-foreground">
                      {row.preview.word}
                    </td>
                    <td lang="ja" className="px-2 py-1.5 font-jp text-muted">
                      {row.preview.reading}
                    </td>
                    <td className="px-2 py-1.5 text-foreground">{row.preview.meanings}</td>
                    <td className="px-2 py-1.5 text-xs">
                      {row.errors.length > 0 ? (
                        <span className="font-bold text-error">오류: {row.errors.join(" / ")}</span>
                      ) : duplicateOf !== undefined ? (
                        <span className="text-muted">파일 안 중복(행 {duplicateOf}과 같음)</span>
                      ) : isExisting ? (
                        <span className="text-muted">이미 있는 단어</span>
                      ) : (
                        <span className="font-bold text-success">새 단어</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {visibleRows.length > shown && (
          <div className="flex justify-center">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setShown((count) => count + PREVIEW_PAGE)}
            >
              더 보기 ({visibleRows.length - shown}행 남음)
            </Button>
          </div>
        )}
      </Card>

      <Card title="가져오기 설정" titleColor="mint" className="flex flex-col gap-5">
        <fieldset className="flex flex-col gap-2">
          <legend className="mb-1 text-sm font-bold text-foreground">이미 있는 단어는?</legend>
          <div className="flex flex-wrap gap-2">
            {(Object.keys(POLICY_INFO) as DuplicatePolicy[]).map((policy) => (
              <ChipButton
                key={policy}
                selected={options.policy === policy}
                onClick={() => onOptionsChange({ policy })}
              >
                {POLICY_INFO[policy].label}
              </ChipButton>
            ))}
          </div>
          <p className="text-xs text-muted">{POLICY_INFO[options.policy].description}</p>
        </fieldset>

        {hasProgress && (
          <div className="flex flex-col gap-1">
            <Checkbox
              label="학습 기록도 가져오기"
              checked={options.includeProgress}
              onChange={(e) => onOptionsChange({ includeProgress: e.target.checked })}
            />
            <p className="text-xs text-muted">
              켜면 학습 단계와 복습 일정까지 그대로 가져와요. 끄면 새 단어로 시작해요.
            </p>
          </div>
        )}

        <fieldset className="flex flex-col gap-3">
          <legend className="mb-1 text-sm font-bold text-foreground">
            어느 단어장에 넣을까요?
          </legend>
          {hasBookNames && (
            <div className="flex flex-wrap gap-2">
              <ChipButton
                selected={options.bookMode === "restore"}
                onClick={() => onOptionsChange({ bookMode: "restore" })}
              >
                파일의 단어장 구성대로
              </ChipButton>
              <ChipButton
                selected={options.bookMode === "single"}
                onClick={() => onOptionsChange({ bookMode: "single" })}
              >
                한 단어장에 모두
              </ChipButton>
            </div>
          )}
          {options.bookMode === "restore" ? (
            <p className="text-xs text-muted">
              같은 이름의 단어장이 있으면 거기에 넣고, 없으면 새로 만들어요. 가져오는 단어장은
              비공개로 시작해요.
            </p>
          ) : (
            <div className="flex flex-col gap-3">
              <div className="flex flex-wrap gap-2">
                <ChipButton
                  selected={options.targetKind === "existing"}
                  disabled={!books?.length}
                  onClick={() => onOptionsChange({ targetKind: "existing" })}
                >
                  기존 단어장
                </ChipButton>
                <ChipButton
                  selected={options.targetKind === "new"}
                  onClick={() => onOptionsChange({ targetKind: "new" })}
                >
                  새 단어장 만들기
                </ChipButton>
              </div>
              {options.targetKind === "existing" ? (
                <Select
                  label="단어장"
                  value={options.targetBookId}
                  onChange={(e) => onOptionsChange({ targetBookId: e.target.value })}
                  options={[
                    { value: "", label: "단어장을 선택하세요" },
                    ...(books ?? []).map((book) => ({ value: book.id, label: book.name })),
                  ]}
                />
              ) : (
                <Input
                  label="새 단어장 이름"
                  value={options.newBookName}
                  onChange={(e) => onOptionsChange({ newBookName: e.target.value })}
                  error={newBookNameError}
                />
              )}
            </div>
          )}
        </fieldset>

        <div className="flex flex-wrap justify-end gap-2">
          <Button type="button" variant="outline" onClick={onBack}>
            다른 파일 선택
          </Button>
          <Button type="button" onClick={onStart} disabled={!canStart}>
            {importableCount}개 가져오기
          </Button>
        </div>
      </Card>
    </div>
  );
}

function SummaryItem({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone?: "ok" | "error";
}) {
  return (
    <li className="flex flex-col border-2 border-pixel-ink bg-background px-3 py-2">
      <span className="text-xs text-muted">{label}</span>
      <span
        className={
          tone === "error"
            ? "text-lg font-extrabold text-error"
            : tone === "ok"
              ? "text-lg font-extrabold text-success"
              : "text-lg font-extrabold text-foreground"
        }
      >
        {value}
      </span>
    </li>
  );
}
