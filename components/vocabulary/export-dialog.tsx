"use client";

import { useQuery } from "@tanstack/react-query";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { ChipButton } from "@/components/ui/chip-button";
import { Modal } from "@/components/ui/modal";
import { Select } from "@/components/ui/select";
import { toast } from "@/components/ui/toast";
import { apiFetch } from "@/lib/api/client";
import { downloadBlob, filenameFromDisposition } from "@/lib/vocabulary-io/download";
import type { VocabularyBookSummary } from "@/types/vocabulary-book";

type ExportFormat = "json" | "csv";

const FORMAT_INFO: Record<ExportFormat, { label: string; description: string }> = {
  json: {
    label: "JSON (전체 백업)",
    description:
      "뜻·예문·태그·즐겨찾기·단어장 구성과 학습 기록까지 모두 담아요. 나중에 그대로 복원할 수 있어요.",
  },
  csv: {
    label: "CSV (스프레드시트)",
    description:
      "엑셀·구글 시트에서 편집하기 쉬운 표예요. 예문은 첫 번째 한 쌍만 담기고, 학습 기록과 즐겨찾기는 담기지 않아요.",
  },
};

interface ExportDialogProps {
  open: boolean;
  onClose: () => void;
  /** 처음 선택해 둘 단어장(없으면 "내 모든 단어"). */
  initialBookId?: string;
}

export function ExportDialog({ open, onClose, initialBookId = "" }: ExportDialogProps) {
  const [bookId, setBookId] = useState(initialBookId);
  const [format, setFormat] = useState<ExportFormat>("json");
  const [downloading, setDownloading] = useState(false);

  const { data: books } = useQuery({
    queryKey: ["vocabulary-books"],
    queryFn: () => apiFetch<VocabularyBookSummary[]>("/api/vocabulary-books"),
    enabled: open,
  });

  // 파일 응답은 JSON 봉투가 아니라서 `apiFetch`를 못 쓴다 — 실패하면 봉투의 오류 메시지를 읽어 알려준다.
  async function handleDownload() {
    setDownloading(true);
    try {
      const params = new URLSearchParams({ format });
      if (bookId) params.set("bookId", bookId);
      const response = await fetch(`/api/vocabularies/export?${params}`);

      if (!response.ok) {
        const body = (await response.json().catch(() => null)) as {
          error?: { message?: string };
        } | null;
        throw new Error(body?.error?.message ?? "내보내지 못했어요.");
      }

      downloadBlob(
        await response.blob(),
        filenameFromDisposition(
          response.headers.get("Content-Disposition"),
          `kotoba-loop-words.${format}`,
        ),
      );
      toast.success("파일을 내려받았어요.");
      onClose();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "내보내지 못했어요.");
    } finally {
      setDownloading(false);
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="단어 내보내기">
      <div className="flex flex-col gap-4">
        <Select
          label="내보낼 범위"
          value={bookId}
          onChange={(e) => setBookId(e.target.value)}
          options={[
            { value: "", label: "내 모든 단어" },
            ...(books ?? []).map((book) => ({
              value: book.id,
              label: `${book.name} (${book.wordCount}개)`,
            })),
          ]}
        />

        <fieldset className="flex flex-col gap-2">
          <legend className="mb-1 text-sm font-bold text-foreground">파일 형식</legend>
          <div className="flex flex-wrap gap-2">
            {(Object.keys(FORMAT_INFO) as ExportFormat[]).map((option) => (
              <ChipButton
                key={option}
                selected={format === option}
                onClick={() => setFormat(option)}
              >
                {FORMAT_INFO[option].label}
              </ChipButton>
            ))}
          </div>
          <p className="text-xs text-muted">{FORMAT_INFO[format].description}</p>
        </fieldset>

        <div className="flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={onClose}>
            닫기
          </Button>
          <Button type="button" onClick={handleDownload} loading={downloading}>
            내려받기
          </Button>
        </div>
      </div>
    </Modal>
  );
}
