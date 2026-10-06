export type AdminUserStatus = "PENDING" | "APPROVED" | "REJECTED" | "SUSPENDED";
export type AdminAuditAction = "APPROVE" | "REJECT" | "SUSPEND" | "RESTORE";

export interface AdminSummary {
  counts: Record<AdminUserStatus, number>;
  signupsToday: number;
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
  adminNickname: string | null;
  createdAt: string;
}

export interface AdminAuditList {
  logs: AdminAuditRow[];
  total: number;
  page: number;
  pageSize: number;
}
