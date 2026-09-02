import Link from "next/link";

import { PixelPenTool, PixelTrash } from "@/components/icons/pixel-icons";
import { buttonVariants } from "@/components/ui/button";
import { cardVariants } from "@/components/ui/card";
import {
  BookEmblem,
  BookProgressGauge,
  BookSlotTitleBar,
  VisibilityChip,
  getMasteryLevel,
  slotColorForIndex,
} from "@/components/vocabulary/book-slot";
import { cn } from "@/lib/utils";
import type { VocabularyBookSummary } from "@/types/vocabulary-book";

interface VocabularyBookCardProps {
  book: VocabularyBookSummary;
  /** Rotates the title-bar/emblem color so adjacent cards in the grid read as distinct slots. */
  index: number;
  onEdit: () => void;
  onDelete: () => void;
}

function formatDate(iso: string) {
  return iso.slice(0, 10).replaceAll("-", ".");
}

export function VocabularyBookCard({ book, index, onEdit, onDelete }: VocabularyBookCardProps) {
  const ratio = book.wordCount > 0 ? book.masteredCount / book.wordCount : 0;
  const isMaster = getMasteryLevel(ratio) === "MASTER";
  const remaining = book.wordCount - book.masteredCount;
  const color = slotColorForIndex(index);

  return (
    <div className={cn(cardVariants(), "flex flex-col", isMaster && "border-accent shadow-glow")}>
      <BookSlotTitleBar color={color}>
        <VisibilityChip isPublic={book.isPublic} />
      </BookSlotTitleBar>

      <div className="flex flex-1 flex-col gap-3 p-4">
        <div className="flex items-start gap-3">
          <BookEmblem color={color} />
          <div className="min-w-0 flex-1">
            <Link
              href={`/vocabulary/${book.id}`}
              className="block truncate text-base font-bold text-foreground hover:underline"
            >
              {book.name}
            </Link>
            {book.description && (
              <p className="line-clamp-2 text-sm font-content text-foreground/60">
                {book.description}
              </p>
            )}
          </div>
        </div>

        <BookProgressGauge masteredCount={book.masteredCount} wordCount={book.wordCount} />

        <div className="flex items-center justify-between gap-2 text-xs text-foreground/50">
          <span>
            {isMaster
              ? "전부 마스터했어요 🎉"
              : `완료 ${book.masteredCount}개 · ${remaining}개 남음`}
          </span>
          <span>{formatDate(book.createdAt)}</span>
        </div>

        <div className="mt-auto flex items-center gap-2 border-t-2 border-pixel-ink pt-3">
          <Link
            href={`/vocabulary/${book.id}`}
            className={cn(
              buttonVariants({ variant: isMaster ? "quest" : "primary", size: "sm" }),
              "flex-1",
            )}
          >
            {isMaster ? "★ 복습하기" : "▶ 이어하기"}
          </Link>
          <button
            type="button"
            onClick={onEdit}
            aria-label="수정"
            className="flex size-8 shrink-0 items-center justify-center border-2 border-pixel-ink bg-surface shadow-bevel-raised transition hover:bg-background active:shadow-none"
          >
            <PixelPenTool className="size-3.5" aria-hidden="true" />
          </button>
          <button
            type="button"
            onClick={onDelete}
            aria-label="삭제"
            className="flex size-8 shrink-0 items-center justify-center border-2 border-pixel-ink bg-surface text-error shadow-bevel-raised transition hover:bg-background active:shadow-none"
          >
            <PixelTrash className="size-3.5" aria-hidden="true" />
          </button>
        </div>
      </div>
    </div>
  );
}
