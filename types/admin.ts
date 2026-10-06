export type AdminUserStatus = "PENDING" | "APPROVED" | "REJECTED" | "SUSPENDED";
export type AdminAuditAction =
  | "APPROVE"
  | "REJECT"
  | "SUSPEND"
  | "RESTORE"
  | "HIDE_CONTENT"
  | "RESTORE_CONTENT"
  | "DELETE_CONTENT"
  | "WARN"
  | "RESTRICT_WRITE"
  | "RESOLVE_REPORT"
  | "DISMISS_REPORT";
/** 회원 상태를 바꾸는 액션(승인·거절·정지·복구) */
export type AdminMemberAction = "APPROVE" | "REJECT" | "SUSPEND" | "RESTORE";
export type AdminAuditGroup = "all" | "member" | "content" | "sanction" | "report";
export type ReportReason = "SPAM" | "ABUSE" | "INAPPROPRIATE" | "OTHER";
export type ReportStatus = "OPEN" | "RESOLVED" | "DISMISSED";

export interface AdminSummary {
  counts: Record<AdminUserStatus, number>;
  signupsToday: number;
  /** 처리 대기 중인 신고(대상 단위) 수 */
  openReportGroups: number;
}

export interface AdminMemberRow {
  id: string;
  email: string;
  nickname: string;
  status: AdminUserStatus;
  role: "USER" | "ADMIN";
  signupMethod: "GOOGLE" | "EMAIL";
  createdAt: string;
  lastActiveAt: string | null;
}

export interface AdminMemberList {
  members: AdminMemberRow[];
  total: number;
  page: number;
  pageSize: number;
}

export interface AdminMemberDetail extends AdminMemberRow {
  jlptLevel: string | null;
  targetJlpt: string | null;
  dailyWordTarget: number | null;
  purpose: string[];
  vocabularyBookCount: number;
  reviewedAt: string | null;
  reviewedBy: string | null;
  rejectReason: string | null;
  warningCount: number;
  writeRestrictedUntil: string | null;
  /** 이 회원의 콘텐츠에 접수된 신고(최근 순, 최대 10건) */
  relatedReports: {
    id: string;
    targetLabel: string;
    reason: ReportReason;
    status: ReportStatus;
    createdAt: string;
  }[];
  /** 이 회원에게 적용된 제재 기록(최근 순, 최대 10건) */
  sanctionHistory: {
    id: string;
    action: AdminAuditAction;
    reason: string | null;
    createdAt: string;
  }[];
}

export interface AdminReviewResult {
  updated: number;
  skipped: number;
}

export interface AdminAuditRow {
  id: string;
  action: AdminAuditAction;
  reason: string | null;
  targetUserEmail: string;
  targetLabel: string | null;
  adminNickname: string | null;
  createdAt: string;
}

export interface AdminAuditList {
  logs: AdminAuditRow[];
  total: number;
  page: number;
  pageSize: number;
}

export interface AdminReportGroup {
  targetType: "BOOK";
  targetId: string;
  status: ReportStatus;
  reportCount: number;
  lastReportedAt: string;
  reasons: { reason: ReportReason; count: number }[];
  details: string[];
  handledAt: string | null;
  resolutionNote: string | null;
  /** 대상이 삭제됐으면 null */
  target: {
    title: string;
    description: string | null;
    wordCount: number;
    hidden: boolean;
    hideReason: string | null;
    owner: {
      id: string;
      nickname: string;
      email: string;
      status: AdminUserStatus;
      warningCount: number;
      writeRestrictedUntil: string | null;
    };
  } | null;
}

export interface AdminReportList {
  groups: AdminReportGroup[];
  total: number;
  page: number;
  pageSize: number;
}

export interface AdminContentRow {
  id: string;
  name: string;
  description: string | null;
  isPublic: boolean;
  wordCount: number;
  importCount: number;
  hidden: boolean;
  hideReason: string | null;
  openReportCount: number;
  owner: { id: string; nickname: string; email: string };
  createdAt: string;
}

export interface AdminContentList {
  books: AdminContentRow[];
  total: number;
  page: number;
  pageSize: number;
}
