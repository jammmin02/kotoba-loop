import type { ReportReason } from "@/types/admin";

export const REPORT_REASON_LABELS: Record<ReportReason, string> = {
  SPAM: "스팸·광고",
  ABUSE: "욕설·비방",
  INAPPROPRIATE: "부적절한 내용",
  OTHER: "기타",
};
