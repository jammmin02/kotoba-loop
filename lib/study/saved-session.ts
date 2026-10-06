import type { QuizQuestion } from "@/lib/quiz/types";
import type { ReviewGrade } from "@/lib/srs/types";
import type { SessionCard } from "@/types/study";

/**
 * 학습 도중 나가거나 새로고침해도 이어서 할 수 있도록 진행 상황을 브라우저(localStorage)에
 * 저장한다. 서버에는 답을 낼 때마다 이미 채점/SRS가 반영되므로, 여기에는 "어디까지 했는지"와
 * "남은 문제"만 둔다. 퀴즈는 문제를 다시 만들면 보기 순서/예문이 달라지므로 서버가 만든 문제
 * 목록을 그대로 보관한다.
 */

export const SAVED_SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000;

const STORAGE_PREFIX = "kotoba-resume:";
const STORAGE_VERSION = 1;

export interface FlashcardSnapshot {
  kind: "flashcard";
  mode: "today" | "tag" | "custom";
  tagName?: string;
  queue: SessionCard[];
  currentIndex: number;
  tally: Record<ReviewGrade, number>;
  missedVocabularyIds: string[];
  requeueCounts: Record<string, number>;
}

export interface QuizSnapshot {
  kind: "quiz";
  questions: QuizQuestion[];
  currentIndex: number;
  correctCount: number;
  wrongCount: number;
  missedTargetIds: string[];
  requeueCounts: Record<string, number>;
}

export type SessionSnapshot = FlashcardSnapshot | QuizSnapshot;

export interface SavedSession<T extends SessionSnapshot = SessionSnapshot> {
  version: number;
  savedAt: number;
  /** 이어하기 카드에 보여줄 한 줄 설명(예: "퀴즈 · 일 → 한"). */
  label?: string;
  /** 호출한 화면이 이어하기에 필요한 설정을 되살리려고 함께 보관하는 값(커스텀 학습의 선택 등). */
  meta?: unknown;
  snapshot: T;
}

function getStorage(): Storage | null {
  try {
    return typeof localStorage === "undefined" ? null : localStorage;
  } catch {
    return null;
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isValidSnapshot(snapshot: unknown, kind: SessionSnapshot["kind"]): boolean {
  if (!isRecord(snapshot) || snapshot.kind !== kind) return false;
  const items = kind === "flashcard" ? snapshot.queue : snapshot.questions;
  if (!Array.isArray(items) || items.length === 0) return false;
  const index = snapshot.currentIndex;
  // 이미 끝난 세션(index가 끝에 닿음)은 이어할 게 없으므로 유효하지 않다.
  return typeof index === "number" && Number.isInteger(index) && index >= 0 && index < items.length;
}

export function clearSavedSession(key: string, storage: Storage | null = getStorage()): void {
  try {
    storage?.removeItem(STORAGE_PREFIX + key);
  } catch {
    // 저장소를 못 쓰는 환경(시크릿 모드 등)에서는 조용히 무시한다.
  }
}

export function saveSession(
  key: string,
  data: { snapshot: SessionSnapshot; label?: string; meta?: unknown },
  now: number = Date.now(),
  storage: Storage | null = getStorage(),
): void {
  try {
    const payload: SavedSession = { version: STORAGE_VERSION, savedAt: now, ...data };
    storage?.setItem(STORAGE_PREFIX + key, JSON.stringify(payload));
  } catch {
    // 용량 초과/저장소 차단 — 이어하기만 못 할 뿐 학습 자체에는 영향이 없다.
  }
}

/** 만료됐거나 형식이 깨진/종류가 다른 저장본은 지우고 null을 돌려준다. */
export function loadSavedSession<K extends SessionSnapshot["kind"]>(
  key: string,
  kind: K,
  now: number = Date.now(),
  storage: Storage | null = getStorage(),
): SavedSession<Extract<SessionSnapshot, { kind: K }>> | null {
  if (!storage) return null;
  try {
    const raw = storage.getItem(STORAGE_PREFIX + key);
    if (!raw) return null;
    const parsed: unknown = JSON.parse(raw);
    if (
      !isRecord(parsed) ||
      parsed.version !== STORAGE_VERSION ||
      typeof parsed.savedAt !== "number" ||
      now - parsed.savedAt > SAVED_SESSION_TTL_MS
    ) {
      clearSavedSession(key, storage);
      return null;
    }
    // 다른 종류의 저장본은 이 호출자의 것이 아니므로 지우지 않고 그냥 없는 셈 친다.
    if (isRecord(parsed.snapshot) && parsed.snapshot.kind !== kind) return null;
    if (!isValidSnapshot(parsed.snapshot, kind)) {
      clearSavedSession(key, storage);
      return null;
    }
    return parsed as unknown as SavedSession<Extract<SessionSnapshot, { kind: K }>>;
  } catch {
    clearSavedSession(key, storage);
    return null;
  }
}

/** 저장본의 종류를 가리지 않고 읽는다 — 커스텀 학습 첫 화면의 "이어서 하기" 카드용. */
export function loadAnySavedSession(
  key: string,
  now: number = Date.now(),
  storage: Storage | null = getStorage(),
): SavedSession | null {
  return (
    loadSavedSession(key, "flashcard", now, storage) ?? loadSavedSession(key, "quiz", now, storage)
  );
}

export function snapshotProgress(snapshot: SessionSnapshot): { done: number; total: number } {
  const total = snapshot.kind === "flashcard" ? snapshot.queue.length : snapshot.questions.length;
  return { done: snapshot.currentIndex, total };
}

export function formatSavedAgo(savedAt: number, now: number = Date.now()): string {
  const minutes = Math.floor((now - savedAt) / 60_000);
  if (minutes < 1) return "방금 전";
  if (minutes < 60) return `${minutes}분 전`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}시간 전`;
  return `${Math.floor(hours / 24)}일 전`;
}
