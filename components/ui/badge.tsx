import { PixelX } from "@/components/icons/pixel-icons";
import { cn } from "@/lib/utils";

const badgeBaseClassName =
  "inline-flex items-center gap-1 rounded-none border-2 border-pixel-ink px-2.5 py-0.5 text-xs font-bold";

export type WordStatus = "NEW" | "LEARNING" | "REVIEW" | "WEAK" | "MASTERED";

const statusStyles: Record<WordStatus, string> = {
  NEW: "bg-secondary text-secondary-foreground",
  LEARNING: "bg-primary text-primary-foreground",
  REVIEW: "bg-warning text-warning-foreground",
  WEAK: "bg-error text-error-foreground",
  MASTERED: "bg-success text-success-foreground",
};

const statusLabels: Record<WordStatus, string> = {
  NEW: "NEW",
  LEARNING: "학습중",
  REVIEW: "복습",
  WEAK: "취약",
  MASTERED: "마스터",
};

export interface StatusBadgeProps {
  status: WordStatus;
  className?: string;
}

export function StatusBadge({ status, className }: StatusBadgeProps) {
  return (
    <span className={cn(badgeBaseClassName, statusStyles[status], className)}>
      {statusLabels[status]}
    </span>
  );
}

export type JlptLevel = "N5" | "N4" | "N3" | "N2" | "N1";

export interface JlptBadgeProps {
  level: JlptLevel;
  className?: string;
}

export function JlptBadge({ level, className }: JlptBadgeProps) {
  return (
    <span className={cn(badgeBaseClassName, "bg-surface text-foreground", className)}>
      JLPT {level}
    </span>
  );
}

export interface TagBadgeProps {
  name: string;
  className?: string;
  /** When provided, renders a remove (x) control for detaching the tag. */
  onRemove?: () => void;
}

export function TagBadge({ name, className, onRemove }: TagBadgeProps) {
  return (
    <span className={cn(badgeBaseClassName, "bg-surface text-foreground/80", className)}>
      #{name}
      {onRemove && (
        <button
          type="button"
          onClick={onRemove}
          aria-label={`${name} 태그 삭제`}
          className="flex items-center justify-center hover:text-error"
        >
          <PixelX className="size-2.5" aria-hidden="true" />
        </button>
      )}
    </span>
  );
}
