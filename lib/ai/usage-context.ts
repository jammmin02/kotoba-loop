import "server-only";

import { AsyncLocalStorage } from "node:async_hooks";

/**
 * AI 호출을 누가 일으켰는지 호출 스택 전체에 전달한다. runStructuredAnalysis는 모든 기능이 공유하는
 * 단일 지점인데 사용자 정보를 받지 않으므로, 모든 호출부의 시그니처를 바꾸는 대신 요청 단위
 * 컨텍스트(AsyncLocalStorage)로 넘긴다. 컨텍스트가 없으면 사용량은 사용자 없이(null) 기록된다.
 */
const storage = new AsyncLocalStorage<{ userId: string }>();

export function runWithAiUser<T>(userId: string, fn: () => Promise<T>): Promise<T> {
  return storage.run({ userId }, fn);
}

export function getAiUserId(): string | null {
  return storage.getStore()?.userId ?? null;
}
