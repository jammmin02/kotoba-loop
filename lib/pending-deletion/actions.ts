"use client";

import { toast } from "@/components/ui/toast";
import { ApiClientError, apiFetch } from "@/lib/api/client";

import { createDeletionScheduler } from "./scheduler";
import { usePendingDeletionStore } from "./store";

import type { HiddenSpec } from "./hidden";
import type { DeletionRequest } from "./scheduler";
import type { QueryClient } from "@tanstack/react-query";

/** 삭제를 누른 뒤 되돌릴 수 있는 시간. 이 시간이 지나야 서버에 삭제 요청을 보낸다. */
export const UNDO_WINDOW_MS = 10_000;

/** keepalive 요청 본문은 브라우저가 약 64KB까지만 허용한다 — 넘기면 요청 자체가 거부된다. */
const KEEPALIVE_MAX_BODY_CHARS = 60_000;

const scheduler = createDeletionScheduler({
  delayMs: UNDO_WINDOW_MS,
  send: (request, { keepalive }) => {
    // 수천 개를 한꺼번에 빼는 요청은 본문이 커서 keepalive를 쓸 수 없다. 그때는 일반 요청으로
    // 보내 최선을 다한다(탭이 이미 닫히면 전송되지 않고, 데이터는 그대로 남는다).
    const bodySize = request.body === undefined ? 0 : JSON.stringify(request.body).length;
    return apiFetch(request.path, {
      method: request.method,
      body: request.body,
      keepalive: keepalive && bodySize <= KEEPALIVE_MAX_BODY_CHARS,
    });
  },
});

let pagehideListenerInstalled = false;

/**
 * 탭을 닫거나 다른 사이트로 이동하는 순간 대기 중인 삭제를 바로 보낸다. 그때는 되돌리기 토스트도
 * 함께 사라지므로, 사용자가 이미 확정한 삭제를 유실하지 않고 그대로 반영하는 편이 의도에 맞다.
 * (같은 앱 안에서의 화면 이동은 pagehide가 아니므로 대기 중인 삭제는 그대로 유지된다.)
 */
function ensurePagehideFlush() {
  if (pagehideListenerInstalled || typeof window === "undefined") return;
  pagehideListenerInstalled = true;
  window.addEventListener("pagehide", () => scheduler.flushAll());
}

interface ScheduleArgs {
  /** 같은 key의 삭제가 이미 대기 중이면 무시한다(중복 클릭). */
  key: string;
  spec: HiddenSpec;
  request: DeletionRequest;
  /** 토스트에 보여줄 한 줄 설명(예: "단어를 삭제했어요"). */
  message: string;
  queryClient: QueryClient;
}

function scheduleDeletion({ key, spec, request, message, queryClient }: ScheduleArgs) {
  ensurePagehideFlush();
  const store = usePendingDeletionStore.getState();
  if (store.hidden.some((entry) => entry.key === key)) return;

  store.add(key, spec);
  let toastId = "";

  const { undo } = scheduler.schedule(
    { id: key, request },
    {
      onCommitted: () => {
        toast.dismiss(toastId);
        queryClient.invalidateQueries({ queryKey: ["vocabularies"] });
        queryClient.invalidateQueries({ queryKey: ["vocabulary-books"] });
      },
      onFailed: (error) => {
        // 서버가 삭제하지 못했으니 숨겼던 항목을 다시 보여준다.
        usePendingDeletionStore.getState().remove(key);
        toast.dismiss(toastId);
        toast.error(
          error instanceof ApiClientError
            ? error.message
            : "삭제하지 못했어요. 항목을 다시 표시했어요.",
        );
      },
    },
  );

  toastId = toast.success(`${message} ${UNDO_WINDOW_MS / 1000}초 안에 되돌릴 수 있어요.`, {
    durationMs: UNDO_WINDOW_MS,
    action: {
      label: "실행 취소",
      onClick: () => {
        if (undo()) usePendingDeletionStore.getState().remove(key);
        else toast.info("이미 삭제가 끝나 되돌릴 수 없어요.");
      },
    },
  });
}

/**
 * 단어 삭제. `bookId`가 있으면 그 단어장에서만 빼고(다른 단어장에도 없게 될 때만 단어 자체가
 * 삭제된다 — 서버 규칙 그대로), 없으면 단어 자체를 삭제한다.
 */
export function scheduleWordDeletion(args: {
  wordId: string;
  word: string;
  bookId?: string;
  queryClient: QueryClient;
}) {
  const { wordId, word, bookId, queryClient } = args;
  if (bookId) {
    scheduleDeletion({
      key: `book-words:${bookId}:${wordId}`,
      spec: { kind: "book-words", bookId, wordIds: [wordId] },
      request: {
        path: `/api/vocabulary-books/${bookId}/remove-words`,
        method: "POST",
        body: { ids: [wordId] },
      },
      message: `"${word}"을(를) 이 단어장에서 삭제했어요.`,
      queryClient,
    });
    return;
  }
  scheduleDeletion({
    key: `word:${wordId}`,
    spec: { kind: "word", wordId },
    request: { path: `/api/vocabularies/${wordId}`, method: "DELETE" },
    message: `"${word}" 단어를 삭제했어요.`,
    queryClient,
  });
}

/** 단어장에서 여러 단어를 한 번에 삭제(일괄 선택 삭제). */
export function scheduleBookWordsRemoval(args: {
  bookId: string;
  wordIds: string[];
  queryClient: QueryClient;
}) {
  const { bookId, wordIds, queryClient } = args;
  scheduleDeletion({
    key: `book-words:${bookId}:${crypto.randomUUID()}`,
    spec: { kind: "book-words", bookId, wordIds },
    request: {
      path: `/api/vocabulary-books/${bookId}/remove-words`,
      method: "POST",
      body: { ids: wordIds },
    },
    message: `단어 ${wordIds.length}개를 삭제했어요.`,
    queryClient,
  });
}

/** 단어장 삭제. 단어 자체는 지워지지 않고 소속만 해제된다(서버 규칙 그대로). */
export function scheduleBookDeletion(args: {
  bookId: string;
  name: string;
  queryClient: QueryClient;
}) {
  const { bookId, name, queryClient } = args;
  scheduleDeletion({
    key: `book:${bookId}`,
    spec: { kind: "book", bookId },
    request: { path: `/api/vocabulary-books/${bookId}`, method: "DELETE" },
    message: `"${name}" 단어장을 삭제했어요.`,
    queryClient,
  });
}
