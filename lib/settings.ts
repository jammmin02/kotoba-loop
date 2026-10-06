import "server-only";

import { db } from "@/lib/db";

/** DB에 값이 없을 때 쓰는 기본값. 가입 도메인은 기존 임시 정책(2026-09)과 같다. */
export const DEFAULT_ALLOWED_EMAIL_DOMAINS = ["@g.yju.ac.kr"];
export const DEFAULT_MAINTENANCE_MESSAGE =
  "더 나은 서비스를 위해 점검 중입니다. 잠시 후 다시 접속해주세요.";

const KEY_MAINTENANCE_ENABLED = "maintenance_enabled";
const KEY_MAINTENANCE_MESSAGE = "maintenance_message";
const KEY_ALLOWED_EMAIL_DOMAINS = "allowed_email_domains";

export interface SystemSettings {
  maintenanceEnabled: boolean;
  maintenanceMessage: string;
  allowedEmailDomains: string[];
}

// proxy.ts가 요청마다 점검 여부를 확인하므로 짧게 캐시한다. 프로세스(또는 번들)마다 캐시가 따로라
// 설정을 바꿔도 다른 인스턴스에는 최대 이 시간만큼 늦게 반영된다.
const CACHE_TTL_MS = 5_000;
let cache: { at: number; value: SystemSettings } | null = null;

function parseDomains(raw: string | undefined): string[] {
  if (!raw) return DEFAULT_ALLOWED_EMAIL_DOMAINS;
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return DEFAULT_ALLOWED_EMAIL_DOMAINS;
    const domains = parsed.filter((d): d is string => typeof d === "string");
    return domains.length > 0 ? domains : DEFAULT_ALLOWED_EMAIL_DOMAINS;
  } catch {
    return DEFAULT_ALLOWED_EMAIL_DOMAINS;
  }
}

function toSettings(rows: { key: string; value: string }[]): SystemSettings {
  const byKey = new Map(rows.map((r) => [r.key, r.value]));
  return {
    maintenanceEnabled: byKey.get(KEY_MAINTENANCE_ENABLED) === "true",
    maintenanceMessage: byKey.get(KEY_MAINTENANCE_MESSAGE) || DEFAULT_MAINTENANCE_MESSAGE,
    allowedEmailDomains: parseDomains(byKey.get(KEY_ALLOWED_EMAIL_DOMAINS)),
  };
}

export async function getSettings(): Promise<SystemSettings> {
  if (cache && Date.now() - cache.at < CACHE_TTL_MS) return cache.value;
  const rows = await db.systemSetting.findMany();
  const value = toSettings(rows);
  cache = { at: Date.now(), value };
  return value;
}

/**
 * 점검 상태 조회. 조회가 실패하면 서비스를 막지 않도록(fail-open) 점검 중이 아닌 것으로 본다 —
 * DB 장애 때문에 관리자까지 포함해 모든 사용자가 잠기는 일을 피하기 위해서다.
 */
export async function getMaintenanceState(): Promise<{ enabled: boolean; message: string }> {
  try {
    const { maintenanceEnabled, maintenanceMessage } = await getSettings();
    return { enabled: maintenanceEnabled, message: maintenanceMessage };
  } catch (err) {
    console.error("[settings] maintenance lookup failed, failing open", err);
    return { enabled: false, message: DEFAULT_MAINTENANCE_MESSAGE };
  }
}

/** 가입 허용 도메인 조회. 조회가 실패하면 기본 도메인으로 대체한다. */
export async function getAllowedEmailDomains(): Promise<string[]> {
  try {
    return (await getSettings()).allowedEmailDomains;
  } catch (err) {
    console.error("[settings] domain lookup failed, using default", err);
    return DEFAULT_ALLOWED_EMAIL_DOMAINS;
  }
}

export interface SettingsUpdate {
  maintenanceEnabled?: boolean;
  maintenanceMessage?: string;
  allowedEmailDomains?: string[];
}

/**
 * 설정을 바꾸고 바뀐 항목마다 이전 값과 새 값을 감사 로그에 남긴다(한 트랜잭션).
 * 값이 같은 항목은 건너뛴다.
 */
export async function updateSettings(adminId: string, update: SettingsUpdate): Promise<void> {
  const current = toSettings(await db.systemSetting.findMany());
  const changes: { key: string; value: string; label: string; before: string; after: string }[] =
    [];

  if (
    update.maintenanceEnabled !== undefined &&
    update.maintenanceEnabled !== current.maintenanceEnabled
  ) {
    changes.push({
      key: KEY_MAINTENANCE_ENABLED,
      value: String(update.maintenanceEnabled),
      label: "점검 모드",
      before: current.maintenanceEnabled ? "켜짐" : "꺼짐",
      after: update.maintenanceEnabled ? "켜짐" : "꺼짐",
    });
  }
  if (
    update.maintenanceMessage !== undefined &&
    update.maintenanceMessage !== current.maintenanceMessage
  ) {
    changes.push({
      key: KEY_MAINTENANCE_MESSAGE,
      value: update.maintenanceMessage,
      label: "점검 안내 문구",
      before: current.maintenanceMessage,
      after: update.maintenanceMessage,
    });
  }
  if (update.allowedEmailDomains !== undefined) {
    const next = [...new Set(update.allowedEmailDomains)];
    if (next.join(",") !== current.allowedEmailDomains.join(",")) {
      changes.push({
        key: KEY_ALLOWED_EMAIL_DOMAINS,
        value: JSON.stringify(next),
        label: "허용 이메일 도메인",
        before: current.allowedEmailDomains.join(", "),
        after: next.join(", "),
      });
    }
  }

  if (changes.length === 0) return;

  await db.$transaction(async (tx) => {
    for (const change of changes) {
      await tx.systemSetting.upsert({
        where: { key: change.key },
        create: { key: change.key, value: change.value },
        update: { value: change.value },
      });
      await tx.adminAuditLog.create({
        data: {
          admin_id: adminId,
          target_user_email: "(시스템)",
          action: "UPDATE_SETTING",
          target_label: change.label,
          reason: `${change.before} → ${change.after}`,
        },
      });
    }
  });
  cache = null;
}
