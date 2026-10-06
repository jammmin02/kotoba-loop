import type { ExtraWordEntry } from "@/components/vocabulary/extra-word-card";
import { emptyDraft } from "@/components/vocabulary/word-draft";
import type { WordDraft } from "@/components/vocabulary/word-draft";

/** 새 단어 등록 화면의 작성 중인 내용을 새로고침·탭 이동에도 살려두는 임시 저장(sessionStorage). */
export const NEW_WORD_DRAFT_KEY = "kotoba-loop:new-word-draft:v1";

export interface StoredNewWordDraft {
  main: WordDraft;
  extraWords: ExtraWordEntry[];
  selectedBookIds: string[];
}

interface StoredPayload extends StoredNewWordDraft {
  version: 1;
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/** 저장된 초안이 최소한 이 화면이 읽을 수 있는 모양인지 확인하고, 빠진 필드는 기본값으로 채운다. */
function sanitizeDraft(value: unknown): WordDraft | null {
  if (!isObject(value) || typeof value.word !== "string") return null;
  const draft = { ...emptyDraft(), ...value } as WordDraft;
  if (
    !Array.isArray(draft.meanings) ||
    !Array.isArray(draft.examples) ||
    !Array.isArray(draft.relatedExpressions)
  ) {
    return null;
  }
  return draft;
}

export function serializeNewWordDraft(draft: StoredNewWordDraft): string {
  const payload: StoredPayload = { version: 1, ...draft };
  return JSON.stringify(payload);
}

/** 저장된 문자열을 초안으로 되돌린다. 내용이 비었거나 형식이 맞지 않으면 null. */
export function parseNewWordDraft(raw: string | null): StoredNewWordDraft | null {
  if (!raw) return null;
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return null;
  }
  if (!isObject(parsed) || parsed.version !== 1) return null;

  const main = sanitizeDraft(parsed.main);
  if (!main || !Array.isArray(parsed.extraWords)) return null;

  const extraWords: ExtraWordEntry[] = [];
  for (const item of parsed.extraWords) {
    const draft = sanitizeDraft(item);
    if (!draft || !isObject(item) || typeof item.key !== "string") return null;
    extraWords.push({
      ...draft,
      key: item.key,
      sourceText: typeof item.sourceText === "string" ? item.sourceText : "",
      error: undefined,
      expanded: typeof item.expanded === "boolean" ? item.expanded : true,
    });
  }

  if (!main.word.trim() && extraWords.length === 0) return null;

  const selectedBookIds = Array.isArray(parsed.selectedBookIds)
    ? parsed.selectedBookIds.filter((id): id is string => typeof id === "string")
    : [];
  return { main, extraWords, selectedBookIds };
}

/** 복원 안내에 보여줄 한 줄 요약 — 예: 「食べる」 외 2개. */
export function describeNewWordDraft(draft: StoredNewWordDraft): string {
  const words = [draft.main.word, ...draft.extraWords.map((e) => e.word)]
    .map((w) => w.trim())
    .filter(Boolean);
  if (words.length === 0) return "단어 카드";
  return words.length === 1 ? `「${words[0]}」` : `「${words[0]}」 외 ${words.length - 1}개`;
}

/** 복원한 카드 뒤에 새로 만들 카드 키가 겹치지 않도록 다음 번호를 구한다(키 형식: `extra-N`). */
export function nextExtraKeyIndex(extraWords: ExtraWordEntry[]): number {
  return extraWords.reduce((max, entry) => {
    const match = /^extra-(\d+)$/.exec(entry.key);
    return match ? Math.max(max, Number(match[1]) + 1) : max;
  }, 0);
}

// sessionStorage는 사생활 보호 모드·차단 설정에서 접근만 해도 예외가 날 수 있어 모두 감싼다.
export function readStoredNewWordDraft(): string | null {
  try {
    return window.sessionStorage.getItem(NEW_WORD_DRAFT_KEY);
  } catch {
    return null;
  }
}

export function saveStoredNewWordDraft(draft: StoredNewWordDraft): void {
  try {
    window.sessionStorage.setItem(NEW_WORD_DRAFT_KEY, serializeNewWordDraft(draft));
  } catch {
    // 저장 공간이 없거나 막힌 경우 — 임시 저장은 편의 기능이라 조용히 넘어간다.
  }
}

export function clearStoredNewWordDraft(): void {
  try {
    window.sessionStorage.removeItem(NEW_WORD_DRAFT_KEY);
  } catch {
    // 위와 같다.
  }
}

// 화면에 처음 들어왔을 때 저장돼 있던 값만 복원 대상으로 본다. 자동 저장이 같은 키를 계속 덮어쓰므로
// 매번 새로 읽으면 방금 입력한 내용을 "복원할 초안"으로 착각한다. 화면을 떠나면 캐시를 비운다.
let initialSnapshot: string | null | undefined;

export function getInitialStoredNewWordDraft(): string | null {
  if (initialSnapshot === undefined) initialSnapshot = readStoredNewWordDraft();
  return initialSnapshot;
}

export function resetInitialStoredNewWordDraft(): void {
  initialSnapshot = undefined;
}

/** `useSyncExternalStore`용 — 초기 스냅샷은 바뀌지 않으므로 구독할 일이 없다. */
export function subscribeNever(): () => void {
  return () => {};
}
