import { notFound } from "next/navigation";

import {
  ModalPreview,
  ProgressBarPreview,
  ToastPreview,
  TooltipPreview,
} from "@/app/dev/design-plan/component-previews";
import {
  AchievementBadgeDemo,
  CollectionGridDemo,
  ExpBarDemo,
  ExpToastDemo,
  LevelBadgeDemo,
  ProgressRingDemo,
  QuestCardDemo,
  StreakIndicatorDemo,
} from "@/app/dev/style-guide/game-demos";
import { JlptBadge, StatusBadge, TagBadge } from "@/components/ui/badge";
import type { JlptLevel, WordStatus } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "디자인 계획 — kotoba-loop (dev)",
  robots: { index: false, follow: false },
};

const colorTokens = [
  { name: "Primary", hex: "#5B5FEF", bg: "bg-primary", fg: "text-primary-foreground" },
  { name: "Secondary", hex: "#14B8A6", bg: "bg-secondary", fg: "text-secondary-foreground" },
  { name: "Accent", hex: "#F59E0B", bg: "bg-accent", fg: "text-accent-foreground" },
  { name: "Background", hex: "#C9C6F2", bg: "bg-background", fg: "text-foreground" },
  { name: "Surface", hex: "#FBF3E1", bg: "bg-surface", fg: "text-foreground" },
  { name: "Pixel Ink", hex: "#171018", bg: "bg-pixel-ink", fg: "text-white" },
  { name: "Titlebar Pink", hex: "#FF8FB1", bg: "bg-titlebar-pink", fg: "text-pixel-ink" },
  { name: "Titlebar Mint", hex: "#7FE0C0", bg: "bg-titlebar-mint", fg: "text-pixel-ink" },
] as const;

const fontPlan = [
  {
    name: "Galmuri",
    role: "기본 폰트 (font-sans)",
    note: "픽셀 서체, OFL 라이선스. 한글 음절 + 가나 + 한자 + 라틴 지원 — 사이트 전반 UI 텍스트",
    sample: "단어를 반복해서 학습하기",
    className: "font-sans",
  },
  {
    name: "Pretendard",
    role: "콘텐츠 예외 (font-content)",
    note: "장문 한글 리딩 콘텐츠(뜻풀이·설명)는 가독성을 위해 픽셀 폰트 대신 사용",
    sample: "단어를 반복해서 학습하기",
    className: "font-content",
  },
  {
    name: "Noto Sans JP",
    role: "일본어 콘텐츠 (:lang(ja) / font-jp)",
    note: "단어·한자 등 획 정확도가 중요한 학습 콘텐츠는 필기체 대신 표준 서체 유지",
    sample: "見逃す 単語 漢字",
    className: "font-jp",
  },
] as const;

const shellRules = [
  {
    title: "보더 & 라운드",
    body: "버튼/카드/인풋/모달/뱃지는 border-2 border-pixel-ink + 반경 0(각진 모서리)이 기본. 레벨 뱃지·아바타 등 원형이 의미상 맞는 요소만 rounded-full 예외.",
  },
  {
    title: "하드 섀도우",
    body: "블러 없는 오프셋 그림자 3단계: shadow-pixel-sm(2px) / shadow-pixel(4px) / shadow-pixel-lg(6px). 보상 연출 전용 shadow-glow는 별도 유지.",
  },
  {
    title: "3D 베벨",
    body: "버튼·인풋에 shadow-bevel-raised(돌출) / shadow-bevel-sunken(함몰)로 눌림·입력 상태를 표현.",
  },
  {
    title: "아이콘",
    body: "아이콘 세트는 새로 그리지 않고 Lucide 유지 — 보더 박스로 감싸 픽셀 셸 톤에 맞춘다.",
  },
] as const;

const stack = [
  { name: "Next.js (App Router)", note: "라우팅 · 서버 컴포넌트" },
  { name: "TypeScript", note: "타입 안전성" },
  { name: "Tailwind CSS v4", note: "디자인 토큰 → CSS 변수 → 유틸리티 클래스" },
  { name: "class-variance-authority", note: "Button/Card 등 variant 관리" },
  { name: "TanStack Query", note: "서버 상태 캐싱" },
  { name: "Zustand", note: "클라이언트 전용 상태(모달/토스트/온보딩 진행 등)" },
] as const;

const wordCards: {
  word: string;
  reading: string;
  meaning: string;
  status: WordStatus;
  jlpt: JlptLevel;
  tags: string[];
}[] = [
  {
    word: "見逃す",
    reading: "みのがす",
    meaning: "놓치다, 못 보고 지나치다",
    status: "WEAK",
    jlpt: "N2",
    tags: ["동사", "빈출"],
  },
  {
    word: "単語",
    reading: "たんご",
    meaning: "단어",
    status: "MASTERED",
    jlpt: "N5",
    tags: ["명사"],
  },
  {
    word: "覚える",
    reading: "おぼえる",
    meaning: "외우다, 기억하다",
    status: "LEARNING",
    jlpt: "N4",
    tags: ["동사", "오늘의 학습"],
  },
  {
    word: "復習",
    reading: "ふくしゅう",
    meaning: "복습",
    status: "NEW",
    jlpt: "N3",
    tags: ["명사"],
  },
] as const;

export default function DesignPlanPage() {
  if (process.env.NODE_ENV === "production") {
    notFound();
  }

  return (
    <main className="mx-auto flex max-w-5xl flex-col gap-10 px-4 py-12 sm:px-6 lg:px-8">
      <header>
        <p className="text-xs font-bold tracking-wide text-foreground/60">
          제27기 백호 튜터링 · 오보에조 · 1주차
        </p>
        <h1 className="mt-1 text-3xl font-bold">디자인 계획 — 무엇으로, 어떻게 만들 것인가</h1>
        <p className="mt-2 text-sm text-foreground/70">
          코토바루프(kotoba-loop) 개발에 들어가기 전, 이번 주에 확정한 디자인 방향과 사용할
          도구·컴포넌트 규칙을 정리했다. 이후 화면 구현은 전부 이 기준을 따른다.
        </p>
      </header>

      <Card title="컨셉" titleColor="primary">
        <h2 className="text-lg font-semibold">Y2K · 레트로 픽셀 데스크톱 UI</h2>
        <p className="mt-2 text-sm leading-relaxed text-foreground/80">
          Windows 9x~2000년대 초 데스크톱 OS의 창(window)·다이얼로그 감성에 RPG/수집형 게임 요소를
          결합한다. 원색보다 파스텔·크림 톤, 두꺼운 검정 보더, 무블러 하드 섀도우, 각진 모서리로
          &ldquo;장난감스러움&rdquo;이 아니라 &ldquo;복고 데스크톱스러움&rdquo;을 만드는 것이
          목표다. 학습 흐름(오늘의 학습 → 카드 → 퀴즈 → 완료)에는 게임 연출을 적극적으로 쓰고, 단어
          상세·검색·설정처럼 정보 탐색이 우선인 화면은 같은 픽셀 셸 안에서 정보 밀도를 우선한다.
        </p>
      </Card>

      <section aria-labelledby="game-heading" className="flex flex-col gap-4">
        <div>
          <h2 id="game-heading" className="text-xl font-semibold">
            🎮 게임화 UI — 이 프로젝트의 핵심 재미 요소
          </h2>
          <p className="mt-1 text-xs text-foreground/60">
            &ldquo;RPG/수집형 게임 학습 서비스&rdquo;라는 컨셉이 실제로 드러나는 부분. 오늘의 학습
            홈, 학습 결과, 레벨업처럼 게임 연출이 우선인 화면에 이 컴포넌트들을 쓴다.
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <Card title="Level Badge & EXP Bar" titleColor="accent">
            <LevelBadgeDemo />
            <div className="mt-4">
              <ExpBarDemo />
            </div>
          </Card>

          <Card title="Streak & Quest Card" titleColor="mint">
            <StreakIndicatorDemo />
            <div className="mt-4">
              <QuestCardDemo />
            </div>
          </Card>

          <Card title="Achievement Badge" titleColor="primary">
            <AchievementBadgeDemo />
          </Card>

          <Card title="Progress Ring & Collection Grid" titleColor="pink">
            <ProgressRingDemo />
            <div className="mt-4">
              <CollectionGridDemo />
            </div>
          </Card>
        </div>

        <Card title="+EXP 토스트" titleColor="accent">
          <p className="mb-3 text-xs leading-relaxed text-foreground/70">
            학습 중 즉시 피드백 — 보상 연출은 항상 400~600ms 이내로 절제한다.
          </p>
          <ExpToastDemo />
        </Card>
      </section>

      <section aria-labelledby="word-heading" className="flex flex-col gap-4">
        <div>
          <h2 id="word-heading" className="text-xl font-semibold">
            📖 단어 카드
          </h2>
          <p className="mt-1 text-xs text-foreground/60">
            단어장·검색 결과 등 정보 우선 화면에서도 픽셀 셸(카드/보더/그림자)은 동일하게 쓰되,
            일본어 단어·읽는법은 font-jp, 뜻풀이는 font-content로 가독성을 확보한다.
          </p>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          {wordCards.map((card) => (
            <Card key={card.word} className="flex flex-col gap-2">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-baseline gap-2">
                    <span className="font-jp text-lg font-bold text-foreground">{card.word}</span>
                    <span className="font-jp text-sm text-foreground/60">{card.reading}</span>
                  </div>
                  <p className="font-content text-sm text-foreground/70">{card.meaning}</p>
                </div>
                <div className="flex shrink-0 flex-col items-end gap-1.5">
                  <StatusBadge status={card.status} />
                  <JlptBadge level={card.jlpt} />
                </div>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {card.tags.map((tag) => (
                  <TagBadge key={tag} name={tag} />
                ))}
              </div>
            </Card>
          ))}
        </div>
      </section>

      <section aria-labelledby="color-heading" className="flex flex-col gap-4">
        <h2 id="color-heading" className="text-xl font-semibold">
          색상 팔레트
        </h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {colorTokens.map((token) => (
            <div
              key={token.name}
              className={`flex h-20 flex-col justify-between border-2 border-pixel-ink p-2.5 shadow-pixel-sm ${token.bg} ${token.fg}`}
            >
              <span className="text-xs font-bold">{token.name}</span>
              <span className="text-[11px] opacity-80">{token.hex}</span>
            </div>
          ))}
        </div>
        <p className="text-xs text-foreground/60">
          Primary/Secondary/Accent는 기존 브랜드 색상을 그대로 유지하고, Background·Surface· Pixel
          Ink·Titlebar 포인트 색을 이번 주에 새로 확정했다. 다크 모드는 별도 값으로 전환한다.
        </p>
      </section>

      <section aria-labelledby="type-heading" className="flex flex-col gap-4">
        <h2 id="type-heading" className="text-xl font-semibold">
          타이포그래피
        </h2>
        <div className="grid gap-3 sm:grid-cols-3">
          {fontPlan.map((font) => (
            <Card key={font.name} title={font.name} titleColor="mint">
              <p className="text-xs font-semibold text-foreground/60">{font.role}</p>
              <p
                className={`mt-2 text-lg ${font.className}`}
                lang={font.name === "Noto Sans JP" ? "ja" : undefined}
              >
                {font.sample}
              </p>
              <p className="mt-2 text-xs leading-relaxed text-foreground/70">{font.note}</p>
            </Card>
          ))}
        </div>
      </section>

      <section aria-labelledby="shell-heading" className="flex flex-col gap-4">
        <h2 id="shell-heading" className="text-xl font-semibold">
          컴포넌트 셸 규칙
        </h2>
        <div className="grid gap-3 sm:grid-cols-2">
          {shellRules.map((rule) => (
            <Card key={rule.title} variant="elevated">
              <h3 className="text-sm font-bold">{rule.title}</h3>
              <p className="mt-1.5 text-xs leading-relaxed text-foreground/75">{rule.body}</p>
            </Card>
          ))}
        </div>
      </section>

      <section aria-labelledby="preview-heading" className="flex flex-col gap-4">
        <div>
          <h2 id="preview-heading" className="text-xl font-semibold">
            컴포넌트 적용 예시
          </h2>
          <p className="mt-1 text-xs text-foreground/60">
            위 토큰과 규칙을 실제 버튼·뱃지·인풋·카드에 적용해 미리 만들어본 프로토타입. 재사용
            컴포넌트로 다듬는 작업은 다음 주에 진행한다.
          </p>
        </div>

        <Card variant="elevated">
          <h3 className="text-sm font-bold text-foreground/70">Button</h3>
          <div className="mt-3 flex flex-wrap items-center gap-3">
            <Button variant="primary">Primary</Button>
            <Button variant="secondary">Secondary</Button>
            <Button variant="outline">Outline</Button>
            <Button variant="ghost">Ghost</Button>
            <Button variant="danger">Danger</Button>
            <Button variant="quest">퀘스트 시작</Button>
          </div>
          <div className="mt-3 flex flex-wrap items-center gap-3">
            <Button size="sm">Small</Button>
            <Button size="md">Medium</Button>
            <Button size="lg">Large</Button>
            <Button loading>로딩 중</Button>
            <Button disabled>Disabled</Button>
          </div>
          <p className="mt-3 text-xs text-foreground/60">
            클릭 시 2px 눌리며 그림자가 사라지는 프레스 효과 — ghost만 보더/그림자 없이 배경색
            반응만 준다.
          </p>
        </Card>

        <div className="grid gap-4 sm:grid-cols-2">
          <Card variant="elevated">
            <h3 className="text-sm font-bold text-foreground/70">Badge</h3>
            <div className="mt-3 flex flex-wrap gap-2">
              <StatusBadge status="NEW" />
              <StatusBadge status="LEARNING" />
              <StatusBadge status="REVIEW" />
              <StatusBadge status="WEAK" />
              <StatusBadge status="MASTERED" />
            </div>
            <div className="mt-2 flex flex-wrap gap-2">
              <JlptBadge level="N5" />
              <JlptBadge level="N4" />
              <JlptBadge level="N3" />
              <JlptBadge level="N2" />
              <JlptBadge level="N1" />
            </div>
          </Card>

          <Card variant="elevated">
            <h3 className="text-sm font-bold text-foreground/70">Input / Select / Textarea</h3>
            <div className="mt-3 flex flex-col gap-3">
              <Input label="닉네임" placeholder="예: 오보에조" helperText="2~12자" />
              <Input
                label="이메일"
                placeholder="you@yju.ac.kr"
                error="이미 사용 중인 이메일입니다"
              />
              <Select
                label="JLPT 레벨"
                options={["N5", "N4", "N3", "N2", "N1"].map((level) => ({
                  value: level,
                  label: level,
                }))}
                helperText="목표 레벨을 선택하세요"
              />
              <Textarea label="메모" placeholder="복습 메모를 남겨보세요" />
            </div>
          </Card>
        </div>

        <Card title="오늘의 퀘스트" titleColor="mint">
          <p className="text-sm">오늘의 단어 10개 학습하기</p>
          <Button size="sm" className="mt-3">
            시작하기
          </Button>
        </Card>
      </section>

      <section aria-labelledby="shared-heading" className="flex flex-col gap-4">
        <div>
          <h2 id="shared-heading" className="text-xl font-semibold">
            모달 · 알림 등 공용 컴포넌트
          </h2>
          <p className="mt-1 text-xs text-foreground/60">
            여러 화면에서 반복해서 쓰일 공용 컴포넌트 — 화면마다 새로 만들지 않고 이 컴포넌트만
            재사용한다. 버튼을 눌러 실제 동작까지 확인할 수 있다.
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <Card title="Modal" titleColor="primary">
            <p className="mb-3 text-xs leading-relaxed text-foreground/70">
              확인/완료 등 화면을 가리는 팝업. 데스크탑은 중앙 모달, 좁은 화면은 하단 시트로 반응형
              전환.
            </p>
            <ModalPreview />
          </Card>

          <Card title="Toast" titleColor="mint">
            <p className="mb-3 text-xs leading-relaxed text-foreground/70">
              저장/삭제 등 짧은 결과 안내. success / error / info 세 톤만 쓴다.
            </p>
            <ToastPreview />
          </Card>

          <Card title="Tooltip" titleColor="accent">
            <p className="mb-3 text-xs leading-relaxed text-foreground/70">
              아이콘/축약 정보에 보충 설명이 필요할 때만 최소한으로 사용.
            </p>
            <TooltipPreview />
          </Card>

          <Card title="Progress Bar" titleColor="pink">
            <p className="mb-3 text-xs leading-relaxed text-foreground/70">
              함몰 베벨 트랙 + 픽셀 세그먼트 채움 — 오늘의 학습 진행도, 한자 학습률 등에 공통 사용.
            </p>
            <ProgressBarPreview />
          </Card>
        </div>
      </section>

      <Card title="사용할 기술 · 도구" titleColor="pink">
        <ul className="grid gap-2.5 sm:grid-cols-2">
          {stack.map((item) => (
            <li key={item.name} className="text-sm">
              <span className="font-bold">{item.name}</span>
              <span className="text-foreground/60"> — {item.note}</span>
            </li>
          ))}
        </ul>
      </Card>

      <Card title="다음 주 예고" titleColor="accent">
        <p className="text-sm leading-relaxed text-foreground/80">
          다음 주부터는 위 프로토타입을 실제 화면(로그인/홈 등)에 적용하고, 게임화 컴포넌트 (EXP Bar
          · Level Badge · Streak · Quest Card · Progress Ring)도 같은 규칙으로 만든다.
        </p>
      </Card>
    </main>
  );
}
