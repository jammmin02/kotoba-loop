"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useRef, useState } from "react";

import type { ImportVocabularyResponse } from "@/app/api/vocabularies/import/route";
import { achievementToast } from "@/components/game/achievement-toast";
import { PixelDownload } from "@/components/icons/pixel-icons";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ProgressBar } from "@/components/ui/progress-bar";
import { toast } from "@/components/ui/toast";
import { ImportResult } from "@/components/vocabulary/import/import-result";
import type { ProblemRow } from "@/components/vocabulary/import/import-result";
import { ImportReview } from "@/components/vocabulary/import/import-review";
import type { ImportOptions } from "@/components/vocabulary/import/import-review";
import { toCsv } from "@/lib/admin/csv";
import { ApiClientError, apiFetch } from "@/lib/api/client";
import { downloadBlob } from "@/lib/vocabulary-io/download";
import { CSV_HEADER } from "@/lib/vocabulary-io/export";
import {
  decodeImportBytes,
  findFileDuplicates,
  parseImportFile,
  validateImportFileMeta,
} from "@/lib/vocabulary-io/parse";
import type { ParsedFile } from "@/lib/vocabulary-io/parse";
import { runImport, toImportableRows } from "@/lib/vocabulary-io/run-import";
import type { BookPlan, ImportableRow, ImportApi } from "@/lib/vocabulary-io/run-import";
import { IMPORT_MAX_ROWS } from "@/lib/vocabulary-io/schema";
import type { ImportItemResult, ImportItemStatus } from "@/lib/vocabulary-io/schema";
import type { DuplicateCheckResult } from "@/types/vocabulary";
import type { VocabularyBookSummary } from "@/types/vocabulary-book";

type Phase = "pick" | "review" | "importing" | "done";

/** 기존 단어와 비교할 때 한 번에 묻는 개수(check-duplicates API의 한도). */
const DUPLICATE_CHECK_CHUNK = 60;

const SAMPLE_ROW = [
  "食べる",
  "たべる",
  "먹다; 먹이다",
  "동사",
  "N5",
  "毎日朝ごはんを食べる。",
  "매일 아침밥을 먹는다.",
  "동사; 기초",
  "내 단어장",
];

interface RunState {
  /** 행 번호 → 저장 결과(다시 시도하면 새 결과로 갈아 끼운다). */
  results: Map<number, ImportItemResult>;
  /** 중단돼서 처리하지 못한 행 번호. */
  unprocessed: number[];
  stopped: boolean;
}

const api: ImportApi = {
  listBooks: () => apiFetch<VocabularyBookSummary[]>("/api/vocabulary-books"),
  createBook: ({ name, description, color }) =>
    apiFetch<VocabularyBookSummary>("/api/vocabulary-books", {
      method: "POST",
      body: { name, description: description ?? undefined, isPublic: false, color },
    }),
  importChunk: (body) =>
    apiFetch<ImportVocabularyResponse>("/api/vocabularies/import", {
      method: "POST",
      body,
      timeoutMs: 60_000,
    }),
};

function defaultOptions(parsed: ParsedFile, fileName: string): ImportOptions {
  return {
    policy: "skip",
    includeProgress: false,
    bookMode: parsed.rows.some((row) => row.bookNames.length > 0) ? "restore" : "single",
    targetKind: "new",
    targetBookId: "",
    newBookName: fileName.replace(/\.[^.]+$/, "").slice(0, 50),
  };
}

/** 이미 내 단어장에 있는 단어를 찾는다. 실패하면 null(비교만 건너뛰고 가져오기는 계속할 수 있다). */
async function findExistingRows(
  rows: ImportableRow[],
  onProgress: (done: number) => void,
  isStale: () => boolean,
): Promise<Set<number> | null> {
  const existing = new Set<number>();
  try {
    for (let start = 0; start < rows.length; start += DUPLICATE_CHECK_CHUNK) {
      if (isStale()) return null;
      const chunk = rows.slice(start, start + DUPLICATE_CHECK_CHUNK);
      const results = await apiFetch<DuplicateCheckResult[]>("/api/vocabularies/check-duplicates", {
        method: "POST",
        body: { items: chunk.map(({ item }) => ({ word: item.word, reading: item.reading })) },
      });
      results.forEach((result, index) => {
        if (result.isDuplicate) existing.add(chunk[index].rowNumber);
      });
      onProgress(Math.min(start + chunk.length, rows.length));
    }
    return existing;
  } catch {
    return null;
  }
}

export function ImportWizard() {
  const queryClient = useQueryClient();
  const [phase, setPhase] = useState<Phase>("pick");
  const [fileError, setFileError] = useState<string | null>(null);
  const [reading, setReading] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [file, setFile] = useState<{ name: string; encoding: "utf-8" | "euc-kr" } | null>(null);
  const [parsed, setParsed] = useState<ParsedFile | null>(null);
  const [existingRows, setExistingRows] = useState<Set<number> | null>(null);
  const [comparing, setComparing] = useState<{ done: number; total: number } | null>(null);
  const [options, setOptions] = useState<ImportOptions | null>(null);
  const [progress, setProgress] = useState({ processed: 0, total: 0 });
  const [run, setRun] = useState<RunState | null>(null);
  const stopRef = useRef(false);
  const compareTokenRef = useRef(0);

  const { data: books } = useQuery({
    queryKey: ["vocabulary-books"],
    queryFn: () => apiFetch<VocabularyBookSummary[]>("/api/vocabulary-books"),
  });

  const fileDuplicates = useMemo(
    () => (parsed ? findFileDuplicates(parsed.rows) : new Map<number, number>()),
    [parsed],
  );
  const importableRows = useMemo(
    () => (parsed ? toImportableRows(parsed.rows, new Set(fileDuplicates.keys())) : []),
    [parsed, fileDuplicates],
  );
  const hasProgress = useMemo(
    () => importableRows.some((row) => row.item.progress !== null),
    [importableRows],
  );
  const hasBookNames = useMemo(
    () => importableRows.some((row) => row.bookNames.length > 0),
    [importableRows],
  );

  // 가져오는 동안 창을 닫으면 일부만 저장되므로 한 번 확인한다.
  useEffect(() => {
    if (phase !== "importing") return;
    const warn = (event: BeforeUnloadEvent) => event.preventDefault();
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [phase]);

  async function handleFile(selected: File) {
    setFileError(null);
    const metaError = validateImportFileMeta(selected);
    if (metaError) {
      setFileError(metaError);
      return;
    }

    setReading(true);
    try {
      const { text, encoding } = decodeImportBytes(new Uint8Array(await selected.arrayBuffer()));
      const result = parseImportFile({ name: selected.name, text });
      if (result.fileErrors.length > 0) {
        setFileError(result.fileErrors.join(" "));
        return;
      }

      setFile({ name: selected.name, encoding });
      setParsed(result);
      setOptions(defaultOptions(result, selected.name));
      setExistingRows(null);
      setPhase("review");

      // 이미 있는 단어와 비교한다(화면은 먼저 보여주고 결과는 도착하는 대로 반영).
      const token = ++compareTokenRef.current;
      const duplicates = findFileDuplicates(result.rows);
      const rows = toImportableRows(result.rows, new Set(duplicates.keys()));
      setComparing({ done: 0, total: rows.length });
      const existing = await findExistingRows(
        rows,
        (done) => compareTokenRef.current === token && setComparing({ done, total: rows.length }),
        () => compareTokenRef.current !== token,
      );
      if (compareTokenRef.current === token) {
        setExistingRows(existing);
        setComparing(null);
      }
    } catch {
      setFileError("파일을 읽지 못했어요. 다른 파일로 다시 시도해주세요.");
    } finally {
      setReading(false);
    }
  }

  function reset() {
    compareTokenRef.current++;
    setPhase("pick");
    setParsed(null);
    setFile(null);
    setOptions(null);
    setRun(null);
    setExistingRows(null);
    setComparing(null);
    setFileError(null);
  }

  function buildPlan(current: ImportOptions): BookPlan {
    if (current.bookMode === "restore") {
      return {
        mode: "restore",
        fallbackName: `가져온 단어 ${new Date().toISOString().slice(0, 10)}`,
      };
    }
    return {
      mode: "single",
      target:
        current.targetKind === "existing"
          ? { kind: "existing", id: current.targetBookId }
          : { kind: "new", name: current.newBookName.trim() },
    };
  }

  async function start(rows: ImportableRow[], previous?: Map<number, ImportItemResult>) {
    if (!parsed || !options) return;
    stopRef.current = false;
    setProgress({ processed: 0, total: rows.length });
    setPhase("importing");

    try {
      const outcome = await runImport({
        rows,
        plan: buildPlan(options),
        fileBooks: parsed.books,
        duplicatePolicy: options.policy,
        includeProgress: options.includeProgress && hasProgress,
        api,
        onProgress: setProgress,
        shouldStop: () => stopRef.current,
      });

      const merged = new Map(previous);
      outcome.results.forEach((result, rowNumber) => merged.set(rowNumber, result));
      setRun({ results: merged, unprocessed: outcome.unprocessed, stopped: outcome.stopped });
      setPhase("done");

      queryClient.invalidateQueries({ queryKey: ["vocabularies"] });
      queryClient.invalidateQueries({ queryKey: ["vocabulary-books"] });
      for (const title of outcome.unlockedAchievementTitles) achievementToast.show(title);
    } catch (error) {
      // 단어장을 만들지 못하는 등 저장을 시작하기 전의 실패 — 설정 화면으로 돌아가 다시 시도하게 한다.
      toast.error(
        error instanceof ApiClientError ? error.message : "가져오기를 시작하지 못했어요.",
      );
      setPhase(previous ? "done" : "review");
    }
  }

  // ------------------------------------------------------------------ 결과 요약
  const summary = useMemo(() => {
    const counts: Record<ImportItemStatus, number> = {
      created: 0,
      overwritten: 0,
      "kept-both": 0,
      skipped: 0,
      failed: 0,
    };
    const skipped = new Map<string, number>();
    const failedRows: ProblemRow[] = [];
    if (!run) return { counts, skippedReasons: [] as [string, number][], failedRows };

    for (const row of importableRows) {
      const result = run.results.get(row.rowNumber);
      if (!result) {
        if (run.unprocessed.includes(row.rowNumber)) {
          failedRows.push({
            rowNumber: row.rowNumber,
            word: row.item.word,
            reason: "중단되어 처리하지 못했어요.",
          });
        }
        continue;
      }
      counts[result.status] += 1;
      if (result.status === "skipped") {
        const reason = result.reason ?? "건너뛰었어요.";
        skipped.set(reason, (skipped.get(reason) ?? 0) + 1);
      }
      if (result.status === "failed") {
        failedRows.push({
          rowNumber: row.rowNumber,
          word: row.item.word,
          reason: result.reason ?? "저장하지 못했어요.",
        });
      }
    }
    return { counts, skippedReasons: [...skipped.entries()], failedRows };
  }, [run, importableRows]);

  function retryFailed() {
    if (!run) return;
    const retryNumbers = new Set(summary.failedRows.map((row) => row.rowNumber));
    void start(
      importableRows.filter((row) => retryNumbers.has(row.rowNumber)),
      run.results,
    );
  }

  function downloadProblems() {
    if (!parsed) return;
    const rows: (string | number)[][] = [
      ...parsed.rows
        .filter((row) => row.errors.length > 0)
        .map((row) => [row.rowNumber, "", "", "", row.errors.join(" / ")]),
      ...summary.failedRows.map((row) => {
        const source = importableRows.find((item) => item.rowNumber === row.rowNumber);
        return [
          row.rowNumber,
          row.word,
          source?.item.reading ?? "",
          source?.item.meanings.join("; ") ?? "",
          row.reason,
        ];
      }),
    ].sort((a, b) => Number(a[0]) - Number(b[0]));
    downloadBlob(
      new Blob([toCsv(["행", "단어", "읽기", "뜻", "사유"], rows)], {
        type: "text/csv;charset=utf-8",
      }),
      "kotoba-loop-import-problems.csv",
    );
  }

  // ------------------------------------------------------------------ 화면
  if (phase === "importing") {
    return (
      <Card title="가져오는 중" className="flex flex-col gap-4">
        <ProgressBar
          value={progress.processed}
          max={Math.max(progress.total, 1)}
          label={`${progress.processed}/${progress.total}개 처리`}
        />
        <p role="status" className="text-sm text-muted">
          창을 닫지 말고 기다려주세요. 50개씩 나눠서 저장하고 있어요.
        </p>
        <div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => (stopRef.current = true)}
          >
            중단
          </Button>
        </div>
      </Card>
    );
  }

  if (phase === "done" && run && parsed) {
    return (
      <ImportResult
        counts={summary.counts}
        skippedReasons={summary.skippedReasons}
        failedRows={summary.failedRows}
        parseErrorCount={parsed.rows.filter((row) => row.errors.length > 0).length}
        stopped={run.stopped}
        onRetryFailed={retryFailed}
        onDownloadProblems={downloadProblems}
        onRestart={reset}
      />
    );
  }

  if (phase === "review" && parsed && options && file) {
    return (
      <ImportReview
        fileName={file.name}
        encoding={file.encoding}
        parsed={parsed}
        fileDuplicates={fileDuplicates}
        existingRows={existingRows}
        comparing={comparing}
        options={options}
        onOptionsChange={(patch) =>
          setOptions((current) => (current ? { ...current, ...patch } : current))
        }
        books={books}
        importableCount={importableRows.length}
        hasProgress={hasProgress}
        hasBookNames={hasBookNames}
        onStart={() => void start(importableRows)}
        onBack={reset}
      />
    );
  }

  return (
    <Card title="파일 선택" className="flex flex-col gap-5">
      <label
        onDragOver={(event) => {
          event.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(event) => {
          event.preventDefault();
          setDragging(false);
          const dropped = event.dataTransfer.files[0];
          if (dropped) void handleFile(dropped);
        }}
        className={`flex cursor-pointer flex-col items-center gap-2 border-2 border-dashed border-pixel-ink px-4 py-10 text-center transition focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-primary ${
          dragging ? "bg-primary/10" : "bg-background hover:bg-surface"
        }`}
      >
        <PixelDownload className="size-8 text-primary" aria-hidden="true" />
        <span className="text-sm font-bold text-foreground">
          {reading ? "파일을 읽는 중…" : "CSV 또는 JSON 파일을 끌어다 놓거나 눌러서 선택하세요"}
        </span>
        <span className="text-xs text-muted">
          5MB 이하, 한 번에 {IMPORT_MAX_ROWS.toLocaleString()}개까지
        </span>
        <input
          type="file"
          accept=".csv,.json,text/csv,application/json"
          className="sr-only"
          disabled={reading}
          onChange={(event) => {
            const selected = event.target.files?.[0];
            event.target.value = "";
            if (selected) void handleFile(selected);
          }}
        />
      </label>

      {fileError && (
        <p
          role="alert"
          className="border-2 border-error bg-surface px-3 py-2 text-sm font-bold text-foreground"
        >
          {fileError}
        </p>
      )}

      <div className="flex flex-col gap-2 text-sm text-muted">
        <p className="font-bold text-foreground">어떤 파일을 가져올 수 있나요?</p>
        <ul className="list-disc pl-5">
          <li>
            <strong className="text-foreground">CSV</strong>: 첫 줄이{" "}
            <code className="text-foreground">단어, 읽기, 뜻</code>(필수)과 품사, JLPT, 예문, 태그,
            단어장 열로 된 표. 뜻과 태그는 <code className="text-foreground">;</code>로 구분해요.
          </li>
          <li>
            <strong className="text-foreground">JSON</strong>: 이 앱의 &lsquo;내보내기&rsquo;로 받은
            전체 백업 파일. 학습 기록과 단어장 구성도 복원할 수 있어요.
          </li>
          <li>엑셀에서 저장한 CSV(EUC-KR)도 자동으로 읽어요.</li>
        </ul>
        <div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() =>
              downloadBlob(
                new Blob([toCsv(CSV_HEADER, [SAMPLE_ROW])], { type: "text/csv;charset=utf-8" }),
                "kotoba-loop-import-sample.csv",
              )
            }
          >
            CSV 양식 내려받기
          </Button>
        </div>
      </div>
    </Card>
  );
}
