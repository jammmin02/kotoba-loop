"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState } from "react";

import { PixelBookOpen, PixelSearch } from "@/components/icons/pixel-icons";
import { OnboardingSettingsForm } from "@/components/my/onboarding-settings-form";
import { FlashcardSession } from "@/components/study/flashcard-session";
import { TodaySummaryView } from "@/components/study/today-summary-view";
import { JlptBadge, StatusBadge, type JlptLevel, type WordStatus } from "@/components/ui/badge";
import { Button, type ButtonProps } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/ui/error-state";
import { Input } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { BottomTabBar, Sidebar } from "@/components/ui/navigation";
import { ProgressBar } from "@/components/ui/progress-bar";
import { Select } from "@/components/ui/select";
import { SkeletonList } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/components/ui/toast";
import { Tooltip } from "@/components/ui/tooltip";
import type { TodaySummaryResponse } from "@/types/study";

const buttonVariants: NonNullable<ButtonProps["variant"]>[] = [
  "primary",
  "secondary",
  "ghost",
  "outline",
  "danger",
  "quest",
];

const buttonSizes: NonNullable<ButtonProps["size"]>[] = ["sm", "md", "lg"];

const wordStatuses: WordStatus[] = ["NEW", "LEARNING", "REVIEW", "WEAK", "MASTERED"];

const jlptLevels: JlptLevel[] = ["N5", "N4", "N3", "N2", "N1"];

export function ButtonDemo() {
  const [loading, setLoading] = useState(false);

  return (
    <div className="flex flex-col gap-4">
      {buttonSizes.map((size) => (
        <div key={size} className="flex flex-wrap items-center gap-3">
          {buttonVariants.map((variant) => (
            <Button key={variant} variant={variant} size={size}>
              {variant}
            </Button>
          ))}
        </div>
      ))}
      <div className="flex flex-wrap items-center gap-3">
        <Button
          loading={loading}
          onClick={() => {
            setLoading(true);
            setTimeout(() => setLoading(false), 1500);
          }}
        >
          {loading ? "로딩 중" : "로딩 시작"}
        </Button>
        <Button disabled>disabled</Button>
      </div>
    </div>
  );
}

export function CardDemo() {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <Card variant="default">
        <p className="font-semibold">Default</p>
        <p className="mt-1 text-sm text-muted">기본 카드</p>
      </Card>
      <Card variant="elevated">
        <p className="font-semibold">Elevated</p>
        <p className="mt-1 text-sm text-muted">그림자가 있는 카드</p>
      </Card>
      <Card variant="quest">
        <p className="font-semibold">Quest</p>
        <p className="mt-1 text-sm text-muted">퀘스트 카드</p>
      </Card>
      <Card variant="achievement" locked>
        <p className="font-semibold">Achievement (locked)</p>
        <p className="mt-1 text-sm text-muted">잠긴 업적</p>
      </Card>
      <Card variant="achievement">
        <p className="font-semibold">Achievement (unlocked)</p>
        <p className="mt-1 text-sm text-muted">해금된 업적</p>
      </Card>
    </div>
  );
}

export function InputDemo() {
  return (
    <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
      <Input label="단어" placeholder="見逃す" helperText="일본어 단어를 입력하세요" />
      <Input label="반복 횟수" type="number" defaultValue={5} />
      <Input
        label="이메일"
        type="email"
        error="올바른 이메일 형식이 아닙니다"
        defaultValue="invalid"
      />
      <Select
        label="JLPT 레벨"
        options={jlptLevels.map((level) => ({ value: level, label: level }))}
        helperText="목표 레벨을 선택하세요"
      />
      <Textarea label="메모" placeholder="복습 메모를 남겨보세요" className="sm:col-span-2" />
      <Input label="비활성 입력" placeholder="수정 불가" disabled />
    </div>
  );
}

export function ModalDemo() {
  const [open, setOpen] = useState(false);
  const [nestedOpen, setNestedOpen] = useState(false);

  return (
    <div>
      <Button onClick={() => setOpen(true)}>모달 열기</Button>
      <Modal open={open} onClose={() => setOpen(false)} title="학습 완료">
        <p className="text-sm text-foreground/80">
          오늘의 단어 학습을 모두 마쳤습니다. 데스크탑에서는 중앙 모달로, 모바일 너비에서는 하단
          시트로 표시됩니다.
        </p>
        <div className="mt-6 flex justify-end gap-2">
          <Button variant="ghost" onClick={() => setNestedOpen(true)}>
            겹친 모달
          </Button>
          <Button variant="ghost" onClick={() => setOpen(false)}>
            취소
          </Button>
          <Button onClick={() => setOpen(false)}>확인</Button>
        </div>
      </Modal>
      <Modal open={nestedOpen} onClose={() => setNestedOpen(false)} title="두 번째 모달">
        <p className="text-sm text-foreground/80">Esc와 Tab은 맨 위 모달에만 적용됩니다.</p>
        <div className="mt-6 flex justify-end">
          <Button onClick={() => setNestedOpen(false)}>닫기</Button>
        </div>
      </Modal>
    </div>
  );
}

export function BadgeDemo() {
  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap gap-2">
        {wordStatuses.map((status) => (
          <StatusBadge key={status} status={status} />
        ))}
      </div>
      <div className="flex flex-wrap gap-2">
        {jlptLevels.map((level) => (
          <JlptBadge key={level} level={level} />
        ))}
      </div>
    </div>
  );
}

export function ToastDemo() {
  return (
    <div className="flex flex-wrap gap-3">
      <Button variant="secondary" onClick={() => toast.success("저장되었습니다")}>
        Success 토스트
      </Button>
      <Button variant="danger" onClick={() => toast.error("저장에 실패했습니다")}>
        Error 토스트
      </Button>
      <Button variant="outline" onClick={() => toast.info("새로운 업데이트가 있습니다")}>
        Info 토스트
      </Button>
      <Button
        variant="outline"
        onClick={() =>
          toast.success("단어를 삭제했어요", {
            action: { label: "실행 취소", onClick: () => toast.info("삭제를 취소했어요") },
            durationMs: 8000,
          })
        }
      >
        액션 토스트
      </Button>
    </div>
  );
}

export function TooltipDemo() {
  return (
    <div className="flex gap-6">
      <Tooltip content="복습 예정 단어입니다">
        <Button variant="outline">위쪽 툴팁</Button>
      </Tooltip>
      <Tooltip content="정답률 82%" side="bottom">
        <Button variant="outline">아래쪽 툴팁</Button>
      </Tooltip>
    </div>
  );
}

export function ProgressBarDemo() {
  return (
    <div className="flex flex-col gap-4">
      <ProgressBar label="오늘의 학습 목표" value={30} max={50} />
      <ProgressBar label="한자 마스터율" value={82} />
      <ProgressBar label="완료" value={100} />
    </div>
  );
}

export function NavigationDemo() {
  return (
    <div className="flex flex-col gap-6 overflow-hidden rounded-lg border border-foreground/10">
      <div>
        <p className="border-b border-foreground/10 bg-background px-4 py-2 text-xs font-semibold text-muted">
          Desktop Sidebar (6개 메뉴)
        </p>
        <Sidebar className="static !flex h-auto w-full flex-row flex-wrap gap-2 border-r-0" />
      </div>
      <div>
        <p className="border-b border-foreground/10 bg-background px-4 py-2 text-xs font-semibold text-muted">
          Mobile Bottom Tab (4개 메뉴)
        </p>
        <BottomTabBar className="static !flex w-full" />
      </div>
    </div>
  );
}

export function StateDemo() {
  const [retrying, setRetrying] = useState(false);

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col gap-3">
        <h3 className="text-sm font-semibold text-muted">Skeleton (row / card / tile)</h3>
        <SkeletonList variant="row" count={2} label="단어를 불러오는 중" />
        <SkeletonList variant="card" count={3} label="단어장을 불러오는 중" />
        <SkeletonList variant="tile" count={8} label="한자를 불러오는 중" />
      </div>

      <div className="flex flex-col gap-3">
        <h3 className="text-sm font-semibold text-muted">ErrorState</h3>
        <ErrorState
          fallbackMessage="단어를 불러오지 못했습니다."
          onRetry={() => {
            setRetrying(true);
            setTimeout(() => setRetrying(false), 1200);
          }}
          retrying={retrying}
        />
      </div>

      <div className="flex flex-col gap-3">
        <h3 className="text-sm font-semibold text-muted">EmptyState (card / inline)</h3>
        <EmptyState
          icon={PixelBookOpen}
          title="아직 등록된 단어가 없어요"
          description="직접 입력하거나, 교재 사진으로 한 번에 가져와 보세요."
        >
          <Button>단어 등록하기</Button>
          <Button variant="outline">사진으로 가져오기</Button>
        </EmptyState>
        <EmptyState
          variant="inline"
          icon={PixelSearch}
          title="검색 결과가 없어요"
          description="다른 검색어로 다시 찾아보세요."
        >
          <Button variant="outline" size="sm">
            검색어 지우기
          </Button>
        </EmptyState>
      </div>
    </div>
  );
}

// 학습 단계(intervalStage)가 서로 다른 샘플 카드 — 채점 버튼의 "다음 복습" 미리보기를 단계별로 본다.
const FLASHCARD_DEMO_QUEUE = [
  {
    vocabularyId: "demo-new",
    word: "勉強",
    reading: "べんきょう",
    meanings: ["공부"],
    examples: [{ japanese: "毎日勉強します。", korean: "매일 공부합니다." }],
    intervalStage: 0,
  },
  {
    vocabularyId: "demo-mid",
    word: "図書館",
    reading: "としょかん",
    meanings: ["도서관"],
    examples: [],
    intervalStage: 3,
  },
  {
    vocabularyId: "demo-max",
    word: "先生",
    reading: "せんせい",
    meanings: ["선생님"],
    examples: [],
    intervalStage: 6,
  },
];

export function FlashcardDemo() {
  const [runKey, setRunKey] = useState(0);

  return (
    <div className="flex flex-col items-center gap-3">
      <p className="text-sm text-muted">
        단계 0 / 3 / 6의 샘플 카드입니다. 채점은 실제 API를 호출하므로 개발 계정이 아니면 오류
        토스트가 뜰 수 있습니다.
      </p>
      <FlashcardSession
        key={runKey}
        mode="custom"
        queue={FLASHCARD_DEMO_QUEUE}
        onExit={() => setRunKey((key) => key + 1)}
      />
    </div>
  );
}

type TodaySummaryData = TodaySummaryResponse;

const SUMMARY_BASE: TodaySummaryData = {
  categories: [
    { key: "newWords", label: "새 단어", count: 7 },
    { key: "yesterday", label: "어제 복습", count: 12 },
    { key: "weak", label: "오답 복습", count: 2 },
  ],
  totalCount: 21,
  estimatedMinutes: 12,
  estimatedTimeLabel: "약 12분",
  completedToday: 3,
  hasAnyVocabulary: true,
  todayKanjiCount: 0,
  limits: {
    newTarget: 10,
    newIntroducedToday: 3,
    reviewLimit: 50,
    reviewedToday: 20,
    hasMore: true,
  },
};

const SUMMARY_DEMOS: { title: string; data: TodaySummaryData }[] = [
  { title: "진행 중 (복습 상한 50)", data: SUMMARY_BASE },
  {
    title: "목표 달성 + 더 학습하기",
    data: {
      ...SUMMARY_BASE,
      categories: [],
      totalCount: 0,
      completedToday: 30,
      limits: { ...SUMMARY_BASE.limits, newIntroducedToday: 10, reviewedToday: 50 },
    },
  },
  {
    title: "복습 상한 없음 + 더 할 게 없음",
    data: {
      ...SUMMARY_BASE,
      categories: [],
      totalCount: 0,
      completedToday: 14,
      limits: {
        newTarget: 10,
        newIntroducedToday: 10,
        reviewLimit: null,
        reviewedToday: 4,
        hasMore: false,
      },
    },
  },
];

// 요약 API 응답을 미리 채운 별도 QueryClient로 감싸 로그인/DB 없이 상태별 화면을 본다.
function TodaySummaryPreview({ data }: { data: TodaySummaryData }) {
  const [client] = useState(() => {
    const queryClient = new QueryClient({ defaultOptions: { queries: { staleTime: Infinity } } });
    queryClient.setQueryData(["study", "today-summary", {}], data);
    return queryClient;
  });
  return (
    <QueryClientProvider client={client}>
      <TodaySummaryView />
    </QueryClientProvider>
  );
}

export function TodaySummaryDemo() {
  return (
    <div className="flex flex-col items-center gap-6">
      {SUMMARY_DEMOS.map(({ title, data }) => (
        <div key={title} className="flex w-full flex-col items-center gap-2">
          <h3 className="text-sm font-semibold text-muted">{title}</h3>
          <TodaySummaryPreview data={data} />
        </div>
      ))}
    </div>
  );
}

export function StudySettingsDemo() {
  return (
    <div className="max-w-2xl">
      <OnboardingSettingsForm
        profile={{
          nickname: "demo",
          email: "demo@example.invalid",
          createdAt: "2026-01-01T00:00:00.000Z",
          jlptLevel: "N4",
          targetJlpt: "N3",
          dailyWordTarget: 10,
          dailyReviewLimit: 100,
          dailyStudyTime: 20,
          purpose: ["JLPT"],
        }}
      />
    </div>
  );
}
