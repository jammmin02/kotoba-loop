"use client";

import { useMemo } from "react";
import { create } from "zustand";

import type { HiddenSpec } from "./hidden";

interface HiddenEntry {
  key: string;
  spec: HiddenSpec;
}

interface PendingDeletionState {
  /**
   * 화면에서 숨길 항목. 삭제가 서버에 확정된 뒤에도 남겨 둔다(묘비) — 서버가 렌더한 목록(단어장
   * 상세 등)이나 라우터 캐시에는 아직 그 항목이 들어 있을 수 있어서, 다시 불러오기 전까지 되살아나지
   * 않게 하려는 것이다. 페이지를 새로 열면 서버 데이터가 최신이라 자연히 비워진다.
   */
  hidden: HiddenEntry[];
  add: (key: string, spec: HiddenSpec) => void;
  remove: (key: string) => void;
}

export const usePendingDeletionStore = create<PendingDeletionState>()((set) => ({
  hidden: [],
  add: (key, spec) =>
    set((state) =>
      state.hidden.some((entry) => entry.key === key)
        ? state
        : { hidden: [...state.hidden, { key, spec }] },
    ),
  remove: (key) => set((state) => ({ hidden: state.hidden.filter((entry) => entry.key !== key) })),
}));

/** 목록 컴포넌트가 숨길 항목 규칙을 읽는다(참조가 안정적이라 `useMemo` 의존성에 그대로 쓸 수 있다). */
export function useHiddenSpecs(): readonly HiddenSpec[] {
  const hidden = usePendingDeletionStore((state) => state.hidden);
  return useMemo(() => hidden.map((entry) => entry.spec), [hidden]);
}
