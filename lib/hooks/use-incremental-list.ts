"use client";

import { useCallback, useEffect, useState } from "react";

interface UseIncrementalListOptions {
  /** 처음에 그릴 개수. */
  initialCount?: number;
  /** 한 번에 더 그릴 개수. */
  step?: number;
  /**
   * 목록의 "정체성" — 필터/검색/정렬 조합을 문자열로 만든 값. 바뀌면 처음 개수로 되돌린다
   * (조건이 바뀐 새 목록의 맨 위부터 보여주기 위해).
   */
  resetKey: string;
  /**
   * 지정하면 `resetKey`별로 "여기까지 그렸다"를 sessionStorage에 기억한다. 상세 화면에 갔다가
   * 뒤로 돌아왔을 때 이전에 스크롤해 본 만큼 다시 그려, 브라우저가 스크롤 위치를 되돌릴 수 있게 한다.
   */
  storagePrefix?: string;
}

const DEFAULT_INITIAL_COUNT = 60;
const DEFAULT_STEP = 60;

function readStoredCount(storageKey: string | null): number | null {
  if (!storageKey) return null;
  try {
    const raw = sessionStorage.getItem(storageKey);
    const parsed = raw === null ? NaN : Number(raw);
    return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
  } catch {
    return null;
  }
}

/**
 * 큰 목록을 한 번에 다 그리지 않고 앞에서부터 나눠서 그린다. 수천 개 항목을 한꺼번에 마운트하면
 * 첫 렌더와 필터/정렬 변경이 느려지므로, 화면 근처까지 스크롤할 때 `loadMore`로 늘려간다.
 * 필터링·정렬은 호출부가 전체 `items`에 대해 하고, 이 훅은 "몇 개까지 그릴지"만 정한다.
 */
export function useIncrementalList<T>(
  items: readonly T[],
  {
    initialCount = DEFAULT_INITIAL_COUNT,
    step = DEFAULT_STEP,
    resetKey,
    storagePrefix,
  }: UseIncrementalListOptions,
) {
  const storageKey = storagePrefix ? `${storagePrefix}:${resetKey}` : null;
  const [state, setState] = useState(() => ({
    key: storageKey,
    count: readStoredCount(storageKey) ?? initialCount,
  }));

  // resetKey가 바뀌면 렌더 중에 곧바로 새 목록의 개수로 바꾼다(이펙트로 하면 한 프레임 동안
  // 이전 개수로 그려진다).
  let count = state.count;
  if (state.key !== storageKey) {
    count = readStoredCount(storageKey) ?? initialCount;
    setState({ key: storageKey, count });
  }

  useEffect(() => {
    if (!storageKey) return;
    try {
      sessionStorage.setItem(storageKey, String(count));
    } catch {
      // 저장소를 쓸 수 없으면 뒤로가기 복원만 포기한다.
    }
  }, [storageKey, count]);

  const loadMore = useCallback(
    () => setState((prev) => ({ ...prev, count: prev.count + step })),
    [step],
  );

  const shownCount = Math.min(count, items.length);
  return {
    shownItems: items.slice(0, shownCount),
    shownCount,
    remaining: items.length - shownCount,
    hasMore: shownCount < items.length,
    loadMore,
  };
}
