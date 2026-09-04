import { RELATED_EXPRESSION_TYPE_OPTIONS } from "@/lib/validations/vocabulary";
import type { RelatedExpressionType } from "@/types/vocabulary";

export const RELATED_EXPRESSION_TYPE_LABELS: Record<RelatedExpressionType, string> = {
  SIMILAR: "유사어",
  OPPOSITE: "반대말",
  DERIVED: "파생어",
};

export const RELATED_EXPRESSION_TYPE_SELECT_OPTIONS = RELATED_EXPRESSION_TYPE_OPTIONS.map(
  (value) => ({ value, label: RELATED_EXPRESSION_TYPE_LABELS[value] }),
);
