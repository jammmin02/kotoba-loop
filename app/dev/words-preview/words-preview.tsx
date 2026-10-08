"use client";

import { useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import { BookWordList } from "@/components/vocabulary/book-word-list";
import { VocabularyBooksView } from "@/components/vocabulary/vocabulary-books-view";
import { WordListItem } from "@/components/vocabulary/word-list-item";
import { WordsView } from "@/components/vocabulary/words-view";
import { formatKstISOString } from "@/lib/datetime";
import { scheduleWordDeletion } from "@/lib/pending-deletion/actions";
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

interface RecordedCall {
  method: string;
  path: string;
  body: unknown;
  at: number;
}

/**
 * 이 화면이 열려 있는 동안만 단어/단어장 API를 가짜 응답으로 바꾼다. 삭제 요청은 실제로 가짜
 * 데이터에 반영하고 `window.__mockCalls`에 기록해, 요청이 언제(몇 ms 뒤) 나갔는지 확인할 수 있다.
 */
function installMockApi(words: ReturnType<typeof generateWords>) {
  const realFetch = window.fetch;
  const books = BOOKS.map((book) => ({ ...book }));
  const calls: RecordedCall[] = [];
  window.__mockCalls = calls;

  const bookSummaries = () =>
    books.map((book) => ({
      id: book.id,
      name: book.name,
      description: null,
      isPublic: false,
      createdAt: formatKstISOString(new Date()),
      wordCount: words.filter((w) => w.bookIds.includes(book.id)).length,
      masteredCount: 0,
    }));

  window.fetch = async (input, init) => {
    const url = new URL(typeof input === "string" ? input : (input as Request).url, location.href);
    const method = (init?.method ?? "GET").toUpperCase();
    const body = init?.body ? JSON.parse(String(init.body)) : undefined;

    if (method !== "GET" && url.pathname.startsWith("/api/")) {
      calls.push({ method, path: url.pathname, body, at: performance.now() });
    }

    if (url.pathname === "/api/vocabularies" && method === "GET") {
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

    const wordMatch = url.pathname.match(/^\/api\/vocabularies\/([^/]+)$/);
    if (wordMatch && method === "DELETE") {
      const index = words.findIndex((w) => w.id === wordMatch[1]);
      if (index >= 0) words.splice(index, 1);
      return envelope(null);
    }

    const removeMatch = url.pathname.match(/^\/api\/vocabulary-books\/([^/]+)\/remove-words$/);
    if (removeMatch && method === "POST") {
      const ids = new Set<string>((body as { ids: string[] }).ids);
      let removedCount = 0;
      let deletedCount = 0;
      for (const word of [...words]) {
        if (!ids.has(word.id) || !word.bookIds.includes(removeMatch[1])) continue;
        removedCount += 1;
        word.bookIds = word.bookIds.filter((id) => id !== removeMatch[1]);
        if (word.bookIds.length === 0) {
          words.splice(words.indexOf(word), 1);
          deletedCount += 1;
        }
      }
      return envelope({ removedCount, deletedCount });
    }

    const bookMatch = url.pathname.match(/^\/api\/vocabulary-books\/([^/]+)$/);
    if (bookMatch && method === "DELETE") {
      const index = books.findIndex((b) => b.id === bookMatch[1]);
      if (index >= 0) books.splice(index, 1);
      for (const word of words) word.bookIds = word.bookIds.filter((id) => id !== bookMatch[1]);
      return envelope(null);
    }

    if (url.pathname === "/api/vocabulary-books" && method === "GET") {
      return envelope(bookSummaries());
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
    /** 삭제 실행 취소 확인용 — 가짜 API가 받은 변경 요청 기록. */
    __mockCalls?: { method: string; path: string; body: unknown; at: number }[];
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

function UndoPanel({ words }: { words: ReturnType<typeof generateWords> }) {
  const queryClient = useQueryClient();
  // 서버 컴포넌트가 내려주는 목록처럼, 삭제해도 바뀌지 않는 스냅샷을 쓴다(묘비 동작 확인용).
  const [bookWords] = useState(() =>
    words.filter((w) => w.bookIds.includes("book-a")).slice(0, 12),
  );

  return (
    <div className="flex flex-col gap-12">
      <section className="flex flex-col gap-4">
        <h2 className="text-lg font-bold">전체 단어 + 단어 삭제 시뮬레이션</h2>
        <div>
          <Button
            variant="danger"
            size="sm"
            onClick={() => scheduleWordDeletion({ wordId: "w3", word: "単語3", queryClient })}
          >
            단어 삭제 (単語3)
          </Button>
        </div>
        <WordsView />
      </section>
      <section className="flex flex-col gap-4">
        <h2 className="text-lg font-bold">단어장 상세 (book-a, 서버 스냅샷 12개)</h2>
        <BookWordList bookId="book-a" words={bookWords} />
      </section>
      <section className="flex flex-col gap-4">
        <h2 className="text-lg font-bold">단어장 목록</h2>
        <VocabularyBooksView />
      </section>
    </div>
  );
}

export function WordsPreview({
  count,
  baseline,
  undo = false,
}: {
  count: number;
  baseline: boolean;
  undo?: boolean;
}) {
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

  if (!ready) return null;
  return undo ? <UndoPanel words={words} /> : <WordsView />;
}
