"use client";

import { useEffect, useMemo, useState } from "react";

import { WordListItem } from "@/components/vocabulary/word-list-item";
import { WordsView } from "@/components/vocabulary/words-view";
import { formatKstISOString } from "@/lib/datetime";
import type { VocabularySummary } from "@/types/vocabulary";

const STATUSES = ["NEW", "LEARNING", "REVIEW", "WEAK", "MASTERED"] as const;
const BOOKS = [
  { id: "book-a", name: "N5 기초" },
  { id: "book-b", name: "N4 필수" },
  { id: "book-c", name: "회화 표현" },
];
const TAGS = [
  { id: "tag-verb", name: "동사" },
  { id: "tag-noun", name: "명사" },
  { id: "tag-adj", name: "형용사" },
];
const DAY = 24 * 60 * 60 * 1000;

function generateWords(count: number): (VocabularySummary & { bookIds: string[] })[] {
  const now = Date.now();
  return Array.from({ length: count }, (_, i) => {
    const status = STATUSES[i % STATUSES.length];
    // NEW는 예정일이 없고, 나머지는 어제 이전(밀림)~한 달 뒤에 고르게 흩어 놓는다.
    const dueOffsetDays = ((i * 7) % 36) - 5;
    return {
      id: `w${i}`,
      word: `単語${i}`,
      reading: `たんご${i}`,
      partOfSpeech: "noun",
      jlptLevel: (["N5", "N4", "N3"] as const)[i % 3],
      learningStatus: status,
      meanings: [`뜻 ${i}`, `의미 ${i}`],
      bookIds: [BOOKS[i % BOOKS.length].id],
      isFavorite: i % 7 === 0,
      tags: i % 2 === 0 ? [TAGS[i % TAGS.length]] : [],
      createdAt: formatKstISOString(new Date(now - i * 60_000)),
      nextReviewAt:
        status === "NEW" ? null : formatKstISOString(new Date(now + dueOffsetDays * DAY)),
      intervalStage: i % 7,
    };
  });
}

function envelope(data: unknown): Response {
  return new Response(JSON.stringify({ success: true, data }), {
    status: 200,
    headers: { "content-type": "application/json" },
  });
}

/** 이 화면이 열려 있는 동안만 목록 API 3개를 가짜 응답으로 바꾼다. */
function installMockApi(words: ReturnType<typeof generateWords>) {
  const realFetch = window.fetch;
  window.fetch = async (input, init) => {
    const url = new URL(typeof input === "string" ? input : (input as Request).url, location.href);
    if (url.pathname === "/api/vocabularies") {
      const bookId = url.searchParams.get("bookId");
      const status = url.searchParams.get("status");
      const tagId = url.searchParams.get("tagId");
      const favorite = url.searchParams.get("favorite") === "true";
      return envelope(
        words.filter(
          (w) =>
            (!bookId || w.bookIds.includes(bookId)) &&
            (!status || w.learningStatus === status) &&
            (!tagId || w.tags.some((t) => t.id === tagId)) &&
            (!favorite || w.isFavorite),
        ),
      );
    }
    if (url.pathname === "/api/vocabulary-books") {
      return envelope(BOOKS.map((b) => ({ ...b, wordCount: 0 })));
    }
    if (url.pathname === "/api/tags") return envelope(TAGS);
    return realFetch(input, init);
  };
  return () => {
    window.fetch = realFetch;
  };
}

declare global {
  interface Window {
    /** 성능 비교용 — 목록이 DOM에 나타나기까지의 시간과 그 시점의 DOM 노드 수. */
    __wordsPreviewMetrics?: { listReadyMs: number; listItems: number; domNodes: number };
  }
}

/** 첫 목록 항목들이 DOM에 들어오는 순간(데이터 도착 → 렌더 → 커밋)을 잰다. */
function useListReadyMetric(expectedItems: number) {
  useEffect(() => {
    const start = performance.now();
    const itemCount = () => document.querySelectorAll("[data-word-item], .defer-render").length;
    const record = () => {
      const listItems = itemCount();
      if (listItems < expectedItems) return false;
      window.__wordsPreviewMetrics = {
        listReadyMs: Math.round(performance.now() - start),
        listItems,
        domNodes: document.querySelectorAll("*").length,
      };
      return true;
    };
    if (record()) return;
    const observer = new MutationObserver(() => {
      if (record()) observer.disconnect();
    });
    observer.observe(document.body, { childList: true, subtree: true });
    return () => observer.disconnect();
  }, [expectedItems]);
}

export function WordsPreview({ count, baseline }: { count: number; baseline: boolean }) {
  const words = useMemo(() => generateWords(count), [count]);
  const [ready, setReady] = useState(false);
  const [baselineReady, setBaselineReady] = useState(false);
  // 점진 렌더링은 첫 묶음(60개)만 그리므로 기대 개수가 다르다.
  useListReadyMetric(baseline ? count : Math.min(count, 60));

  // 하위 컴포넌트가 쿼리를 보내기 전에 가짜 API를 먼저 깔아야 해서, 설치가 끝난 뒤에만 그린다.
  useEffect(() => {
    if (baseline) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setBaselineReady(true);
      return;
    }
    const uninstall = installMockApi(words);

    setReady(true);
    return uninstall;
  }, [baseline, words]);

  if (baseline) {
    // 점진 렌더링 도입 전과 같은 방식 — 전부 한 번에 마운트한다(성능 비교용). 실제 목록은 데이터가
    // 클라이언트에서 도착한 뒤 그려지므로, 서버 렌더에서 빠지도록 마운트 이후에만 그린다.
    return baselineReady ? (
      <div className="flex flex-col gap-3" data-testid="baseline-list">
        {words.map((word) => (
          <div key={word.id} data-word-item>
            <WordListItem word={word} />
          </div>
        ))}
      </div>
    ) : null;
  }

  return ready ? <WordsView /> : null;
}
