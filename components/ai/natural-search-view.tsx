"use client";

import { useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { useRef, useState } from "react";

import { PixelBookOpen, PixelCheck, PixelSparkles } from "@/components/icons/pixel-icons";
import { JlptBadge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Modal } from "@/components/ui/modal";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/components/ui/toast";
import { VocabularyForm } from "@/components/vocabulary/vocabulary-form";
import type { NaturalSearchResult } from "@/lib/ai/natural-search";
import { ApiClientError, apiFetch } from "@/lib/api/client";
import { NATURAL_SEARCH_QUERY_MAX } from "@/lib/validations/ai";

import type { FormEvent } from "react";

const QUERY_PLACEHOLDER = "일부러라는 뜻인데 상대방이 나를 위해 수고했다는 느낌의 일본어가 뭐였지?";

interface SearchEntry {
  key: string;
  query: string;
  data?: NaturalSearchResult;
}

export function NaturalSearchView() {
  const queryClient = useQueryClient();
  const [query, setQuery] = useState("");
  const [entries, setEntries] = useState<SearchEntry[]>([]);
  const [pendingKey, setPendingKey] = useState<string | null>(null);
  const [addingEntryKey, setAddingEntryKey] = useState<string | null>(null);
  const nextKeyRef = useRef(0);

  const addingEntry = entries.find((entry) => entry.key === addingEntryKey);

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const trimmed = query.trim();
    if (!trimmed || pendingKey) return;

    const key = `q-${nextKeyRef.current++}`;
    setEntries((prev) => [{ key, query: trimmed }, ...prev]);
    setPendingKey(key);
    setQuery("");

    apiFetch<NaturalSearchResult>("/api/ai/natural-search", {
      method: "POST",
      body: { query: trimmed },
      timeoutMs: 45_000,
    })
      .then((data) => {
        setEntries((prev) => prev.map((entry) => (entry.key === key ? { ...entry, data } : entry)));
      })
      .catch((err) => {
        setEntries((prev) => prev.filter((entry) => entry.key !== key));
        toast.error(err instanceof ApiClientError ? err.message : "검색에 실패했습니다.");
      })
      .finally(() => {
        setPendingKey((prev) => (prev === key ? null : prev));
      });
  }

  function handleSaved() {
    setAddingEntryKey(null);
    toast.success("단어를 등록했습니다.");
    queryClient.invalidateQueries({ queryKey: ["vocabularies"] });
    queryClient.invalidateQueries({ queryKey: ["vocabulary-books"] });
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <h1 className="flex items-center gap-2 text-xl font-bold text-foreground">
          <PixelSparkles className="size-5 text-accent" aria-hidden="true" />
          자연어 단어 검색
        </h1>
        <p className="text-sm font-content text-foreground/60">
          정확한 단어를 몰라도 상황이나 느낌을 한국어로 설명하면 AI가 가장 적절한 일본어 표현을
          찾아드려요. 정확한 단어를 알고 있다면{" "}
          <Link href="/search" className="font-bold text-primary hover:underline">
            기본 검색
          </Link>
          을 이용해주세요.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-2">
        <Textarea
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={QUERY_PLACEHOLDER}
          maxLength={NATURAL_SEARCH_QUERY_MAX}
          rows={3}
          aria-label="상황 설명"
        />
        <Button type="submit" className="self-end" loading={!!pendingKey} disabled={!query.trim()}>
          AI에게 물어보기
        </Button>
      </form>

      {entries.length === 0 && (
        <p className="py-16 text-center text-sm font-content text-foreground/60">
          궁금한 상황을 문장으로 설명해보세요.
        </p>
      )}

      <div className="flex flex-col gap-4">
        {entries.map((entry) => (
          <Card key={entry.key} className="flex flex-col gap-3">
            <p className="text-sm font-content text-foreground/70">Q. {entry.query}</p>

            {!entry.data && entry.key === pendingKey && (
              <p className="text-sm text-foreground/50">
                AI가 찾고 있어요. 최대 45초 정도 걸릴 수 있어요.
              </p>
            )}

            {entry.data && entry.data.result.found && (
              <>
                <div className="flex items-start justify-between gap-3">
                  <div className="flex flex-col gap-0.5">
                    <p className="text-sm font-bold text-primary">
                      {entry.data.result.explanation}
                    </p>
                    <p className="font-jp text-2xl text-foreground">{entry.data.result.word}</p>
                    <p className="text-sm text-foreground/60">{entry.data.result.reading}</p>
                  </div>
                  <div className="flex flex-wrap justify-end gap-1.5">
                    {entry.data.result.jlptLevel && (
                      <JlptBadge level={entry.data.result.jlptLevel} />
                    )}
                    <span className="border-2 border-pixel-ink bg-surface px-2 py-0.5 text-xs font-bold">
                      {entry.data.result.partOfSpeech}
                    </span>
                  </div>
                </div>

                <ul className="flex flex-col gap-1">
                  {entry.data.result.meanings.map((meaning, i) => (
                    <li key={i} className="text-sm text-foreground">
                      {meaning}
                    </li>
                  ))}
                </ul>

                <div className="flex flex-col gap-2">
                  {entry.data.result.examples.map((example, i) => (
                    <div key={i} className="border-2 border-pixel-ink bg-background p-2">
                      <p className="font-jp text-sm text-foreground">{example.japanese}</p>
                      <p className="text-xs text-foreground/60">{example.korean}</p>
                    </div>
                  ))}
                </div>

                {entry.data.existing ? (
                  <Link
                    href={`/words/${entry.data.existing.id}`}
                    className="flex w-fit items-center gap-1.5 border-2 border-pixel-ink bg-success px-3 py-1.5 text-sm font-bold text-success-foreground hover:brightness-110"
                  >
                    <PixelCheck className="size-3.5" aria-hidden="true" />
                    이미 단어장에 있어요 · 바로가기
                  </Link>
                ) : (
                  <Button
                    type="button"
                    variant="primary"
                    size="sm"
                    className="w-fit"
                    onClick={() => setAddingEntryKey(entry.key)}
                  >
                    <PixelBookOpen className="size-3.5" aria-hidden="true" />
                    단어장에 추가하기
                  </Button>
                )}
              </>
            )}

            {entry.data && !entry.data.result.found && (
              <div className="flex flex-col gap-1 border-2 border-dashed border-pixel-ink/40 bg-background p-3">
                <p className="text-sm font-bold text-foreground/70">
                  {entry.data.result.explanation}
                </p>
                <p className="text-xs text-foreground/50">{entry.data.result.meanings[0]}</p>
                <p className="text-xs text-foreground/40">다른 표현으로 다시 질문해보세요.</p>
              </div>
            )}
          </Card>
        ))}
      </div>

      <Modal
        open={!!addingEntry?.data?.result.found}
        onClose={() => setAddingEntryKey(null)}
        title={`"${addingEntry?.data?.result.word ?? ""}" 단어장에 추가`}
      >
        {addingEntry?.data && (
          <VocabularyForm
            key={addingEntry.key}
            initialAnalysis={{ id: addingEntry.data.id, result: addingEntry.data.result }}
            onSaved={handleSaved}
            onCancel={() => setAddingEntryKey(null)}
          />
        )}
      </Modal>
    </div>
  );
}
