"use client";

import { useQuery } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";

import { FlashcardSession } from "@/components/study/flashcard-session";
import { QUIZ_TYPE_LABELS, QuizSession } from "@/components/study/quiz-session";
import { ResumePrompt } from "@/components/study/resume-prompt";
import { Button } from "@/components/ui/button";
import { Card, cardVariants } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { StampedChipButton } from "@/components/ui/stamped-chip-button";
import { ApiClientError, apiFetch } from "@/lib/api/client";
import { shuffle } from "@/lib/quiz/random";
import type { QuizType } from "@/lib/quiz/types";
import { VOCAB_QUIZ_TYPES } from "@/lib/quiz/types";
import { clearSavedSession, loadAnySavedSession } from "@/lib/study/saved-session";
import type { SavedSession } from "@/lib/study/saved-session";
import { cn } from "@/lib/utils";
import type { SessionCard } from "@/types/study";
import type { VocabularySummary } from "@/types/vocabulary";
import type { VocabularyBookSummary } from "@/types/vocabulary-book";

type GameMode = "flashcard" | "quiz";

const DEFAULT_QUESTION_COUNT = 20;
const COUNT_PRESETS = [10, 20, 30];

/** 선택한 단어장의 단어를 가져오는 쿼리 — 시작 전 문항 수 선택과 세션 실행이 같은 캐시를 공유한다. */
function customVocabQueryOptions(bookIds: string[]) {
  return {
    queryKey: ["vocabularies", "custom", bookIds],
    queryFn: () => apiFetch<VocabularySummary[]>(`/api/vocabularies?bookIds=${bookIds.join(",")}`),
  };
}

function toSessionCard(word: VocabularySummary): SessionCard {
  return {
    vocabularyId: word.id,
    word: word.word,
    reading: word.reading,
    meanings: word.meanings,
    // `GET /api/vocabularies`는 예문을 포함하지 않는다 — 뒷면에는 뜻까지만 표시된다.
    examples: [],
  };
}

function toggleId(ids: string[], id: string): string[] {
  return ids.includes(id) ? ids.filter((existing) => existing !== id) : [...ids, id];
}

function toggleQuizType(types: QuizType[], type: QuizType): QuizType[] {
  return types.includes(type) ? types.filter((existing) => existing !== type) : [...types, type];
}

/** 커스텀 학습은 한 번에 하나만 저장한다 — 플래시카드/퀴즈가 같은 슬롯을 쓴다. */
const RESUME_KEY = "custom";

/** 학습 세션이 시작된 뒤 선택 값이 바뀌어도 세션 도중 문제 구성이 흔들리지 않도록 얼린 스냅샷. */
interface StartedConfig {
  bookIds: string[];
  gameMode: GameMode;
  quizTypes: QuizType[];
  /** 출제할 문항 수. null이면 선택한 단어 전체. */
  count: number | null;
}

interface StartedSession extends StartedConfig {
  /** "auto": 저장해 둔 진행 상황을 바로 이어서, "none": 새로 시작. */
  resume: "auto" | "none";
}

/** 이어하기 카드에 보여줄 한 줄 설명. */
function describeConfig(config: StartedConfig): string {
  if (config.gameMode === "flashcard") return "플래시카드";
  return `퀴즈 · ${config.quizTypes.map((type) => QUIZ_TYPE_LABELS[type]).join(", ")}`;
}

/** 저장본의 meta를 읽어 시작 설정으로 되살린다. 형식이 맞지 않으면 null(이어하기를 제공하지 않는다). */
function parseConfig(meta: unknown): StartedConfig | null {
  if (typeof meta !== "object" || meta === null) return null;
  const { bookIds, gameMode, quizTypes, count } = meta as Record<string, unknown>;
  if (
    !Array.isArray(bookIds) ||
    !Array.isArray(quizTypes) ||
    (gameMode !== "flashcard" && gameMode !== "quiz") ||
    !(count === null || typeof count === "number")
  ) {
    return null;
  }
  return { bookIds: bookIds as string[], gameMode, quizTypes: quizTypes as QuizType[], count };
}

function SessionRunner({ session, onExit }: { session: StartedSession; onExit: () => void }) {
  const isResuming = session.resume === "auto";
  // 이어서 할 때는 저장본에 문제/카드가 다 들어 있어 단어를 다시 불러오지 않는다.
  const vocabQuery = useQuery({
    ...customVocabQueryOptions(session.bookIds),
    enabled: !isResuming,
  });
  // 객체 정체성을 유지해 세션 컴포넌트의 저장 구독이 렌더마다 다시 걸리지 않게 한다.
  const resumeProps = useMemo(() => {
    const { resume, ...config } = session;
    return {
      resumeKey: RESUME_KEY,
      resume,
      resumeLabel: describeConfig(config),
      resumeMeta: config,
    };
  }, [session]);

  // 플래시카드는 여기서 무작위로 count개를 뽑는다(퀴즈는 서버가 출제 가능한 단어만 골라 뽑는다).
  const flashcardQueue = useMemo(() => {
    const words = vocabQuery.data ?? [];
    const picked = session.count === null ? words : shuffle(words).slice(0, session.count);
    return picked.map(toSessionCard);
  }, [vocabQuery.data, session.count]);

  if (isResuming) {
    return session.gameMode === "flashcard" ? (
      <FlashcardSession
        key="custom-flashcards"
        mode="custom"
        queue={[]}
        onExit={onExit}
        {...resumeProps}
      />
    ) : (
      <QuizSession
        key="custom-quiz"
        targetIds={[]}
        quizTypes={session.quizTypes}
        returnHref="/study/custom"
        returnLabel="커스텀 학습으로 돌아가기"
        onExit={onExit}
        {...resumeProps}
      />
    );
  }

  if (vocabQuery.isLoading) {
    return <p className="text-sm text-foreground/60">불러오는 중...</p>;
  }

  if (vocabQuery.isError) {
    return (
      <p className="text-sm text-error">
        {vocabQuery.error instanceof ApiClientError
          ? vocabQuery.error.message
          : "단어를 불러오지 못했습니다."}
      </p>
    );
  }

  const words = vocabQuery.data ?? [];

  if (words.length === 0) {
    return (
      <div
        className={cn(
          cardVariants({ variant: "elevated" }),
          "flex w-full max-w-sm flex-col items-center gap-4 p-8 text-center",
        )}
      >
        <p className="text-lg font-bold text-foreground">선택한 단어장에 단어가 없어요</p>
        <Button type="button" variant="outline" onClick={onExit}>
          다시 고르기
        </Button>
      </div>
    );
  }

  if (session.gameMode === "flashcard") {
    return (
      <FlashcardSession
        key="custom-flashcards"
        mode="custom"
        queue={flashcardQueue}
        onExit={onExit}
        {...resumeProps}
      />
    );
  }

  return (
    <QuizSession
      key="custom-quiz"
      targetIds={words.map((word) => word.id)}
      quizTypes={session.quizTypes}
      count={session.count ?? undefined}
      returnHref="/study/custom"
      returnLabel="커스텀 학습으로 돌아가기"
      onExit={onExit}
      {...resumeProps}
    />
  );
}

export interface CustomStudyViewProps {
  /** 단어 상세의 "복습하기" 진입 등에서 넘어올 때 STEP 1의 단어장 선택을 미리 채워준다. */
  initialBookId?: string;
}

export function CustomStudyView({ initialBookId }: CustomStudyViewProps = {}) {
  const [selectedBookIds, setSelectedBookIds] = useState<string[]>(
    initialBookId ? [initialBookId] : [],
  );
  const [gameMode, setGameMode] = useState<GameMode | null>(null);
  const [selectedQuizTypes, setSelectedQuizTypes] = useState<QuizType[]>([]);
  // null = 전체. 직접 입력 중인 값은 문자열로 따로 들고 있어 입력칸을 비워둘 수 있게 한다.
  const [questionCount, setQuestionCount] = useState<number | null>(DEFAULT_QUESTION_COUNT);
  const [customCountInput, setCustomCountInput] = useState("");
  const [session, setSession] = useState<StartedSession | null>(null);
  // 이전에 하다 만 학습(브라우저 저장본). 선택 화면에 있을 때만 읽는다.
  const [saved, setSaved] = useState<SavedSession | null>(null);

  // 브라우저 저장소(외부 시스템)는 마운트 뒤에야 읽을 수 있어, 선택 화면으로 돌아올 때마다 다시 읽는다.
  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    setSaved(session ? null : loadAnySavedSession(RESUME_KEY));
  }, [session]);
  /* eslint-enable react-hooks/set-state-in-effect */

  const savedConfig = saved ? parseConfig(saved.meta) : null;

  const booksQuery = useQuery({
    queryKey: ["vocabulary-books"],
    queryFn: () => apiFetch<VocabularyBookSummary[]>("/api/vocabulary-books"),
  });

  const wordsQuery = useQuery({
    ...customVocabQueryOptions(selectedBookIds),
    enabled: selectedBookIds.length > 0,
  });
  const totalWords = wordsQuery.data?.length;

  if (session) {
    return <SessionRunner session={session} onExit={() => setSession(null)} />;
  }

  const canStart =
    selectedBookIds.length > 0 &&
    (gameMode === "flashcard" || (gameMode === "quiz" && selectedQuizTypes.length > 0)) &&
    (questionCount === null || questionCount >= 1);

  function handleStart() {
    if (!gameMode || !canStart) return;
    // 새로 시작하면 하다 만 저장본은 버린다(저장은 한 번에 하나).
    clearSavedSession(RESUME_KEY);
    setSession({
      bookIds: selectedBookIds,
      gameMode,
      quizTypes: selectedQuizTypes,
      count: questionCount,
      resume: "none",
    });
  }

  return (
    <div className="flex w-full max-w-md flex-col gap-6">
      {saved && savedConfig && (
        <ResumePrompt
          saved={saved}
          title="하던 학습이 있어요"
          discardLabel="버리기"
          onResume={() => setSession({ ...savedConfig, resume: "auto" })}
          onDiscard={() => {
            clearSavedSession(RESUME_KEY);
            setSaved(null);
          }}
        />
      )}

      <Card variant="elevated" title="STEP 1" className="flex flex-col gap-3">
        <p className="text-sm font-bold text-foreground">
          학습할 단어장을 골라주세요 (복수 선택 가능)
        </p>
        {booksQuery.isLoading && <p className="text-sm text-foreground/60">불러오는 중...</p>}
        {booksQuery.isError && (
          <p className="text-sm text-error">단어장 목록을 불러오지 못했습니다.</p>
        )}
        {booksQuery.data && booksQuery.data.length === 0 && (
          <p className="text-sm text-foreground/60">등록된 단어장이 없어요.</p>
        )}
        <div className="flex flex-wrap gap-3 pt-1">
          {booksQuery.data?.map((book, index) => (
            <StampedChipButton
              key={book.id}
              selected={selectedBookIds.includes(book.id)}
              colorIndex={index}
              onClick={() => setSelectedBookIds((ids) => toggleId(ids, book.id))}
            >
              {book.name} ({book.wordCount})
            </StampedChipButton>
          ))}
        </div>
      </Card>

      <Card variant="elevated" title="STEP 2" className="flex flex-col gap-3">
        <p className="text-sm font-bold text-foreground">어떤 방식으로 학습할까요?</p>
        <div className="flex flex-wrap gap-3 pt-1">
          <StampedChipButton
            selected={gameMode === "flashcard"}
            colorIndex={0}
            onClick={() => setGameMode("flashcard")}
          >
            플래시카드
          </StampedChipButton>
          <StampedChipButton
            selected={gameMode === "quiz"}
            colorIndex={1}
            onClick={() => setGameMode("quiz")}
          >
            퀴즈
          </StampedChipButton>
        </div>

        {gameMode === "quiz" && (
          <div className="flex flex-col gap-2 border-t-2 border-pixel-ink pt-3">
            <p className="text-sm font-bold text-foreground">
              퀴즈 유형을 골라주세요 (복수 선택 가능)
            </p>
            <div className="flex flex-wrap gap-3 pt-1">
              {VOCAB_QUIZ_TYPES.map((quizType, index) => (
                <StampedChipButton
                  key={quizType}
                  selected={selectedQuizTypes.includes(quizType)}
                  colorIndex={index}
                  onClick={() => setSelectedQuizTypes((types) => toggleQuizType(types, quizType))}
                >
                  {QUIZ_TYPE_LABELS[quizType]}
                </StampedChipButton>
              ))}
            </div>
          </div>
        )}
      </Card>

      <Card variant="elevated" title="STEP 3" className="flex flex-col gap-3">
        <p className="text-sm font-bold text-foreground">몇 문제로 할까요?</p>
        <div className="flex flex-wrap gap-3 pt-1">
          {COUNT_PRESETS.filter((preset) => totalWords === undefined || preset < totalWords).map(
            (preset, index) => (
              <StampedChipButton
                key={preset}
                selected={questionCount === preset && customCountInput === ""}
                colorIndex={index}
                onClick={() => {
                  setQuestionCount(preset);
                  setCustomCountInput("");
                }}
              >
                {preset}개
              </StampedChipButton>
            ),
          )}
          <StampedChipButton
            selected={
              questionCount === null || (totalWords !== undefined && questionCount >= totalWords)
            }
            colorIndex={COUNT_PRESETS.length}
            onClick={() => {
              setQuestionCount(null);
              setCustomCountInput("");
            }}
          >
            전체{totalWords !== undefined ? ` (${totalWords})` : ""}
          </StampedChipButton>
        </div>
        <Input
          label="직접 입력"
          type="number"
          inputMode="numeric"
          min={1}
          placeholder="문제 수"
          value={customCountInput}
          onChange={(event) => {
            const digits = event.target.value.replace(/D/g, "");
            setCustomCountInput(digits);
            const parsed = Number.parseInt(digits, 10);
            // 비우면 기본값으로 되돌린다(0 이하는 시작 버튼을 막지 않고 기본값을 쓴다).
            setQuestionCount(parsed >= 1 ? parsed : DEFAULT_QUESTION_COUNT);
          }}
        />
        {gameMode === "quiz" && (
          <p className="text-xs text-foreground/60">
            빈칸·문장 번역처럼 예문이 필요한 유형은 예문이 있는 단어에서만 출제돼요.
          </p>
        )}
      </Card>

      <Button type="button" variant="quest" size="lg" disabled={!canStart} onClick={handleStart}>
        {gameMode === "quiz" ? "퀴즈 시작" : "학습 시작"}
        {questionCount !== null && ` (${questionCount}문제)`}
      </Button>
    </div>
  );
}
