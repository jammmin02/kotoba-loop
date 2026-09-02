"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useRef, useState } from "react";

import { PixelBookOpen, PixelGlobe, PixelSearch } from "@/components/icons/pixel-icons";
import { JlptBadge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/components/ui/toast";
import { VoiceInputButton } from "@/components/ui/voice-input-button";
import { VocabularyForm } from "@/components/vocabulary/vocabulary-form";
import type { AnalyzeWordResult } from "@/lib/ai/word-analysis";
import type { WordChatResult } from "@/lib/ai/word-chat";
import { ApiClientError, apiFetch } from "@/lib/api/client";
import { WORD_CHAT_QUESTION_MAX } from "@/lib/validations/ai";
import { VOCABULARY_WORD_MAX } from "@/lib/validations/vocabulary";

import type { FormEvent } from "react";

interface ChatMessage {
  key: string;
  role: "user" | "assistant";
  content: string;
}

function naverDictUrl(word: string): string {
  return `https://ja.dict.naver.com/#/search?query=${encodeURIComponent(word)}`;
}

/**
 * 단어장 저장과 무관하게 단어 하나를 가볍게 찾아보는 화면. 네이버 사전 링크 + 기존
 * `/api/ai/analyze-word`(단어장 폼에서 쓰는 것과 동일한 API) 결과를 함께 보여주고,
 * 그 아래 채팅으로 같은 단어에 대해 계속 물어볼 수 있게 한다. 단어장 추가는 선택사항.
 */
export function DictionaryView() {
  const queryClient = useQueryClient();
  const [wordInput, setWordInput] = useState("");
  const [activeWord, setActiveWord] = useState<string | null>(null);
  const [analysis, setAnalysis] = useState<AnalyzeWordResult | null>(null);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState("");
  const [addOpen, setAddOpen] = useState(false);
  const nextKeyRef = useRef(0);

  const lookupMutation = useMutation({
    mutationFn: (word: string) =>
      apiFetch<AnalyzeWordResult>("/api/ai/analyze-word", {
        method: "POST",
        body: { word },
        timeoutMs: 45_000,
      }),
    onSuccess: (data, word) => {
      setActiveWord(word);
      setAnalysis(data);
      setChatMessages([]);
    },
    onError: (err) => {
      toast.error(err instanceof ApiClientError ? err.message : "단어 조회에 실패했습니다.");
    },
  });

  const chatMutation = useMutation({
    mutationFn: ({ question, history }: { question: string; history: ChatMessage[] }) =>
      apiFetch<WordChatResult>("/api/ai/word-chat", {
        method: "POST",
        body: {
          word: activeWord,
          question,
          history: history.map(({ role, content }) => ({ role, content })),
        },
        timeoutMs: 45_000,
      }),
  });

  function handleLookupSubmit(e: FormEvent) {
    e.preventDefault();
    submitLookup(wordInput);
  }

  function submitLookup(word: string) {
    const trimmed = word.trim();
    if (!trimmed || lookupMutation.isPending) return;
    setWordInput(trimmed);
    lookupMutation.mutate(trimmed);
  }

  function handleChatSubmit(e: FormEvent) {
    e.preventDefault();
    const trimmed = chatInput.trim();
    if (!trimmed || !activeWord || chatMutation.isPending) return;

    const historyBefore = chatMessages;
    const userMessage: ChatMessage = { key: `m-${nextKeyRef.current++}`, role: "user", content: trimmed };
    setChatMessages((prev) => [...prev, userMessage]);
    setChatInput("");

    chatMutation.mutate(
      { question: trimmed, history: historyBefore },
      {
        onSuccess: (data) => {
          setChatMessages((prev) => [
            ...prev,
            { key: `m-${nextKeyRef.current++}`, role: "assistant", content: data.answer },
          ]);
        },
        onError: (err) => {
          setChatMessages((prev) => prev.filter((m) => m.key !== userMessage.key));
          setChatInput(trimmed);
          toast.error(err instanceof ApiClientError ? err.message : "답변을 가져오지 못했습니다.");
        },
      },
    );
  }

  function handleSaved() {
    setAddOpen(false);
    toast.success("단어를 등록했습니다.");
    queryClient.invalidateQueries({ queryKey: ["vocabularies"] });
    queryClient.invalidateQueries({ queryKey: ["vocabulary-books"] });
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <h1 className="flex items-center gap-2 text-xl font-bold text-foreground">
          <PixelSearch className="size-5 text-accent" aria-hidden="true" />
          단어 사전
        </h1>
        <p className="text-sm font-content text-foreground/60">
          궁금한 단어를 입력하면 네이버 사전 링크와 AI 설명을 함께 보여드려요. 단어장에 저장하지
          않아도 자유롭게 찾아볼 수 있어요.
        </p>
      </div>

      <form onSubmit={handleLookupSubmit} className="flex gap-2">
        <div className="min-w-0 flex-1">
          <Input
            value={wordInput}
            onChange={(e) => setWordInput(e.target.value)}
            placeholder="예: おざなり"
            maxLength={VOCABULARY_WORD_MAX}
            aria-label="찾을 단어"
          />
        </div>
        <VoiceInputButton onResult={submitLookup} />
        <Button
          type="submit"
          className="shrink-0"
          loading={lookupMutation.isPending}
          disabled={!wordInput.trim()}
        >
          찾아보기
        </Button>
      </form>

      {lookupMutation.isPending && (
        <p className="text-sm text-foreground/50">AI가 분석하고 있어요. 최대 45초 정도 걸릴 수 있어요.</p>
      )}

      {!activeWord && !lookupMutation.isPending && (
        <p className="py-16 text-center text-sm font-content text-foreground/60">
          찾아보고 싶은 일본어 단어를 입력해보세요.
        </p>
      )}

      {activeWord && analysis && (
        <Card className="flex flex-col gap-4">
          <div className="flex items-start justify-between gap-3">
            <div className="flex flex-col gap-0.5">
              <p className="font-jp text-2xl text-foreground">{activeWord}</p>
              <p className="text-sm text-foreground/60">{analysis.result.reading}</p>
            </div>
            <div className="flex flex-wrap justify-end gap-1.5">
              {analysis.result.jlptLevel && <JlptBadge level={analysis.result.jlptLevel} />}
              <span className="border-2 border-pixel-ink bg-surface px-2 py-0.5 text-xs font-bold">
                {analysis.result.partOfSpeech}
              </span>
            </div>
          </div>

          <a
            href={naverDictUrl(activeWord)}
            target="_blank"
            rel="noopener noreferrer"
            className="flex w-fit items-center gap-1.5 border-2 border-pixel-ink bg-surface px-3 py-1.5 text-sm font-bold text-foreground hover:bg-background"
          >
            <PixelGlobe className="size-3.5" aria-hidden="true" />
            네이버 사전에서 보기
          </a>

          <ul className="flex flex-col gap-1">
            {analysis.result.meanings.map((meaning, i) => (
              <li key={i} className="text-sm text-foreground">
                {meaning}
              </li>
            ))}
          </ul>

          <div className="flex flex-col gap-2">
            {analysis.result.examples.map((example, i) => (
              <div key={i} className="border-2 border-pixel-ink bg-background p-2">
                <p className="font-jp text-sm text-foreground">{example.japanese}</p>
                <p className="text-xs text-foreground/60">{example.korean}</p>
              </div>
            ))}
          </div>

          {(analysis.result.relatedKanji.length > 0 ||
            analysis.result.synonyms.length > 0 ||
            analysis.result.relatedExpressions.length > 0) && (
            <div className="flex flex-col gap-1.5 border-t-2 border-dashed border-pixel-ink/30 pt-3">
              {analysis.result.relatedKanji.length > 0 && (
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-xs text-foreground/60">관련 한자</span>
                  {analysis.result.relatedKanji.map((kanji) => (
                    <span
                      key={kanji}
                      className="border-2 border-pixel-ink bg-surface px-2 py-0.5 text-xs font-bold"
                    >
                      {kanji}
                    </span>
                  ))}
                </div>
              )}
              {analysis.result.synonyms.length > 0 && (
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-xs text-foreground/60">유의어</span>
                  {analysis.result.synonyms.map((word) => (
                    <span
                      key={word}
                      className="border-2 border-pixel-ink bg-surface px-2 py-0.5 text-xs font-bold"
                    >
                      {word}
                    </span>
                  ))}
                </div>
              )}
              {analysis.result.relatedExpressions.length > 0 && (
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-xs text-foreground/60">관련 표현</span>
                  {analysis.result.relatedExpressions.map((word) => (
                    <span
                      key={word}
                      className="border-2 border-pixel-ink bg-surface px-2 py-0.5 text-xs font-bold"
                    >
                      {word}
                    </span>
                  ))}
                </div>
              )}
            </div>
          )}

          <Button type="button" variant="primary" size="sm" className="w-fit" onClick={() => setAddOpen(true)}>
            <PixelBookOpen className="size-3.5" aria-hidden="true" />
            단어장에 추가하기
          </Button>
        </Card>
      )}

      {activeWord && analysis && (
        <Card title="AI에게 더 물어보기" titleColor="mint" className="flex flex-col gap-3">
          <div className="flex flex-col gap-3">
            {chatMessages.length === 0 && (
              <p className="text-sm text-foreground/50">
                &ldquo;{activeWord}&rdquo;에 대해 더 궁금한 점을 채팅으로 물어보세요.
              </p>
            )}
            {chatMessages.map((message) => (
              <div
                key={message.key}
                className={
                  message.role === "user"
                    ? "self-end border-2 border-pixel-ink bg-primary px-3 py-2 text-sm text-primary-foreground"
                    : "self-start border-2 border-pixel-ink bg-background px-3 py-2 text-sm text-foreground"
                }
              >
                {message.content}
              </div>
            ))}
            {chatMutation.isPending && (
              <p className="text-sm text-foreground/50">AI가 답변을 작성하고 있어요...</p>
            )}
          </div>

          <form onSubmit={handleChatSubmit} className="flex flex-col gap-2">
            <Textarea
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              placeholder="이 단어랑 비슷한 표현 뭐 있어?"
              maxLength={WORD_CHAT_QUESTION_MAX}
              rows={2}
              aria-label="추가 질문"
            />
            <Button
              type="submit"
              size="sm"
              className="self-end"
              loading={chatMutation.isPending}
              disabled={!chatInput.trim()}
            >
              물어보기
            </Button>
          </form>
        </Card>
      )}

      <Modal open={addOpen} onClose={() => setAddOpen(false)} title={`"${activeWord ?? ""}" 단어장에 추가`}>
        {analysis && (
          <VocabularyForm
            key={analysis.id}
            initialAnalysis={{ id: analysis.id, result: analysis.result }}
            onSaved={handleSaved}
            onCancel={() => setAddOpen(false)}
          />
        )}
      </Modal>
    </div>
  );
}
