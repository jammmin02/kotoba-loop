import Link from "next/link";

import { PixelPenTool, PixelTrash } from "@/components/icons/pixel-icons";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { VocabularyBookSummary } from "@/types/vocabulary-book";

interface VocabularyBookCardProps {
  book: VocabularyBookSummary;
  onEdit: () => void;
  onDelete: () => void;
}

function formatDate(iso: string) {
  return iso.slice(0, 10).replaceAll("-", ".");
}

export function VocabularyBookCard({ book, onEdit, onDelete }: VocabularyBookCardProps) {
  return (
    <Card className="flex flex-col gap-3">
      <div className="flex items-start justify-between gap-2">
        <Link href={`/vocabulary/${book.id}`} className="min-w-0 flex-1">
          <p className="truncate text-base font-bold text-foreground hover:underline">{book.name}</p>
        </Link>
        <span
          className={cn(
            "shrink-0 border-2 border-pixel-ink px-2 py-0.5 text-xs font-bold",
            book.isPublic ? "bg-secondary text-secondary-foreground" : "bg-surface text-foreground/60",
          )}
        >
          {book.isPublic ? "공개" : "비공개"}
        </span>
      </div>

      {book.description && (
        <p className="line-clamp-2 text-sm font-content text-foreground/60">{book.description}</p>
      )}

      <div className="flex items-center justify-between gap-2 text-xs text-foreground/50">
        <span>
          단어 {book.wordCount}개 · 완료 {book.masteredCount}개
        </span>
        <span>{formatDate(book.createdAt)}</span>
      </div>

      <div className="flex items-center gap-2 border-t-2 border-pixel-ink pt-3">
        <button
          type="button"
          onClick={onEdit}
          className="flex items-center gap-1.5 border-2 border-pixel-ink bg-surface px-2.5 py-1 text-xs font-bold shadow-bevel-raised transition hover:bg-background active:shadow-none"
        >
          <PixelPenTool className="size-3.5" aria-hidden="true" />
          수정
        </button>
        <button
          type="button"
          onClick={onDelete}
          className="flex items-center gap-1.5 border-2 border-pixel-ink bg-surface px-2.5 py-1 text-xs font-bold text-error shadow-bevel-raised transition hover:bg-background active:shadow-none"
        >
          <PixelTrash className="size-3.5" aria-hidden="true" />
          삭제
        </button>
      </div>
    </Card>
  );
}
