import { normalizeSearchQuery } from "@/lib/search";

function escapeRegExp(input: string): string {
  return input.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export interface HighlightTextProps {
  text: string;
  /** When provided (and non-empty after normalization), matches are wrapped in <mark>. */
  query?: string;
}

export function HighlightText({ text, query }: HighlightTextProps) {
  const normalizedQuery = query ? normalizeSearchQuery(query) : "";
  if (!normalizedQuery) return <>{text}</>;

  const pattern = new RegExp(`(${escapeRegExp(normalizedQuery)})`, "gi");
  const parts = text.split(pattern);
  if (parts.length === 1) return <>{text}</>;

  return (
    <>
      {parts.map((part, i) =>
        // text.split() with one capturing group alternates non-match/match parts.
        i % 2 === 1 ? (
          <mark key={i} className="bg-warning text-warning-foreground">
            {part}
          </mark>
        ) : (
          part
        ),
      )}
    </>
  );
}
