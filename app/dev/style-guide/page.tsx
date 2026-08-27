import { notFound } from "next/navigation";

import {
  BadgeDemo,
  ButtonDemo,
  CardDemo,
  InputDemo,
  ModalDemo,
  NavigationDemo,
  ProgressBarDemo,
  TooltipDemo,
  ToastDemo,
} from "@/app/dev/style-guide/component-demos";
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
import { ThemeToggle } from "@/app/dev/style-guide/theme-toggle";

import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Style Guide — kotoba-loop (dev)",
  robots: { index: false, follow: false },
};

const colorTokens = [
  { name: "Primary", bg: "bg-primary", fg: "text-primary-foreground" },
  { name: "Secondary", bg: "bg-secondary", fg: "text-secondary-foreground" },
  { name: "Accent", bg: "bg-accent", fg: "text-accent-foreground" },
  { name: "Background", bg: "bg-background", fg: "text-foreground", bordered: true },
  { name: "Surface", bg: "bg-surface", fg: "text-foreground", bordered: true },
  { name: "Success", bg: "bg-success", fg: "text-success-foreground" },
  { name: "Warning", bg: "bg-warning", fg: "text-warning-foreground" },
  { name: "Error", bg: "bg-error", fg: "text-error-foreground" },
  { name: "Text", bg: "bg-foreground", fg: "text-background" },
] as const;

const typeScale = [
  { label: "text-xs", px: "12px" },
  { label: "text-sm", px: "14px" },
  { label: "text-base", px: "16px" },
  { label: "text-lg", px: "18px" },
  { label: "text-xl", px: "20px" },
  { label: "text-2xl", px: "24px" },
  { label: "text-3xl", px: "30px" },
  { label: "text-4xl", px: "36px" },
  { label: "text-5xl", px: "48px" },
] as const;

const weightScale = [
  { label: "font-normal", value: 400 },
  { label: "font-medium", value: 500 },
  { label: "font-semibold", value: 600 },
  { label: "font-bold", value: 700 },
  { label: "font-extrabold", value: 800 },
] as const;

const radiusScale = [
  { label: "sm", box: "rounded-sm" },
  { label: "md", box: "rounded-md" },
  { label: "lg", box: "rounded-lg" },
  { label: "xl", box: "rounded-xl" },
  { label: "2xl", box: "rounded-2xl" },
  { label: "full", box: "rounded-full" },
] as const;

const shadowScale = ["shadow-sm", "shadow-md", "shadow-lg", "shadow-glow"] as const;

const spacingScale = [1, 2, 3, 4, 6, 8, 12, 16] as const;

export default function StyleGuidePage() {
  if (process.env.NODE_ENV === "production") {
    notFound();
  }

  return (
    <main className="mx-auto flex max-w-5xl flex-col gap-16 px-4 py-12 sm:px-6 lg:px-8">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">kotoba-loop 디자인 토큰 스타일 가이드</h1>
          <p className="mt-2 text-sm text-foreground/70">
            개발 전용 페이지입니다. 프로덕션 빌드에서는 404로 응답합니다.
          </p>
        </div>
        <ThemeToggle />
      </header>

      <section aria-labelledby="colors-heading" className="flex flex-col gap-4">
        <h2 id="colors-heading" className="text-xl font-semibold">
          색상 (Colors)
        </h2>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {colorTokens.map((token) => (
            <div
              key={token.name}
              className={`flex h-24 flex-col justify-between rounded-lg p-3 ${token.bg} ${token.fg} ${
                "bordered" in token && token.bordered ? "border border-foreground/10" : ""
              }`}
            >
              <span className="text-sm font-semibold">{token.name}</span>
              <span className="text-xs opacity-80">{token.bg}</span>
            </div>
          ))}
        </div>
      </section>

      <section aria-labelledby="typography-heading" className="flex flex-col gap-6">
        <h2 id="typography-heading" className="text-xl font-semibold">
          타이포그래피 (Typography)
        </h2>

        <div className="flex flex-col gap-3">
          <h3 className="text-sm font-semibold text-foreground/70">폰트 크기 스케일</h3>
          {typeScale.map((scale) => (
            <div key={scale.label} className="flex items-baseline gap-4">
              <span className={`${scale.label} font-medium`}>Aa 한글 見逃す</span>
              <span className="text-xs text-foreground/50">
                {scale.label} / {scale.px}
              </span>
            </div>
          ))}
        </div>

        <div className="flex flex-col gap-3">
          <h3 className="text-sm font-semibold text-foreground/70">폰트 굵기 (Weight)</h3>
          {weightScale.map((weight) => (
            <div key={weight.label} className="flex items-baseline gap-4">
              <span className={`${weight.label} text-lg`}>Aa 한글 見逃す</span>
              <span className="text-xs text-foreground/50">
                {weight.label} / {weight.value}
              </span>
            </div>
          ))}
        </div>

        <div className="flex flex-col gap-3">
          <h3 className="text-sm font-semibold text-foreground/70">
            폰트 패밀리 (Galmuri 픽셀 / Pretendard / Noto Sans JP)
          </h3>
          <p className="font-sans text-lg">
            font-sans (Galmuri, 사이트 기본 픽셀 폰트): 단어를 반복해서 학습하기
          </p>
          <p className="font-content text-lg">
            font-content (Pretendard, 장문 한글 콘텐츠용): 단어를 반복해서 학습하기
          </p>
          <p lang="ja" className="text-lg">
            :lang(ja) 자동 전환 (Noto Sans JP): 見逃す 単語 漢字
          </p>
          <p className="font-jp text-lg">font-jp 유틸리티 직접 지정: 見逃す 単語 漢字</p>
        </div>
      </section>

      <section aria-labelledby="radius-heading" className="flex flex-col gap-4">
        <h2 id="radius-heading" className="text-xl font-semibold">
          Border Radius
        </h2>
        <div className="grid grid-cols-3 gap-4 sm:grid-cols-6">
          {radiusScale.map((radius) => (
            <div key={radius.label} className="flex flex-col items-center gap-2">
              <div className={`h-16 w-16 bg-primary ${radius.box}`} />
              <span className="text-xs text-foreground/60">{radius.label}</span>
            </div>
          ))}
        </div>
      </section>

      <section aria-labelledby="shadow-heading" className="flex flex-col gap-4">
        <h2 id="shadow-heading" className="text-xl font-semibold">
          Shadow
        </h2>
        <div className="grid grid-cols-2 gap-6 sm:grid-cols-4">
          {shadowScale.map((shadow) => (
            <div key={shadow} className="flex flex-col items-center gap-2">
              <div className={`h-16 w-16 rounded-lg bg-surface ${shadow}`} />
              <span className="text-xs text-foreground/60">{shadow}</span>
            </div>
          ))}
        </div>
      </section>

      <section aria-labelledby="spacing-heading" className="flex flex-col gap-4">
        <h2 id="spacing-heading" className="text-xl font-semibold">
          Spacing (4px 배수)
        </h2>
        <div className="flex flex-col gap-2">
          {spacingScale.map((step) => (
            <div key={step} className="flex items-center gap-4">
              <div
                className={`h-4 bg-secondary`}
                style={{ width: `calc(var(--spacing) * ${step})` }}
              />
              <span className="text-xs text-foreground/60">
                {step} · {step * 4}px
              </span>
            </div>
          ))}
        </div>
      </section>

      <section aria-labelledby="breakpoint-heading" className="flex flex-col gap-4">
        <h2 id="breakpoint-heading" className="text-xl font-semibold">
          Breakpoint 반응형 확인
        </h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
          {["base", "sm", "md", "lg"].map((bp) => (
            <div
              key={bp}
              className="flex h-20 items-center justify-center rounded-lg border border-foreground/10 bg-surface text-sm"
            >
              {bp}
            </div>
          ))}
        </div>
        <p className="text-xs text-foreground/50">
          화면 폭을 줄이거나 늘려 sm(640px)/md(768px)/lg(1024px)/xl(1280px) 구간에서 열 배치가
          바뀌는지 확인하세요.
        </p>
      </section>

      <section aria-labelledby="button-heading" className="flex flex-col gap-4">
        <h2 id="button-heading" className="text-xl font-semibold">
          Button
        </h2>
        <ButtonDemo />
      </section>

      <section aria-labelledby="card-heading" className="flex flex-col gap-4">
        <h2 id="card-heading" className="text-xl font-semibold">
          Card
        </h2>
        <CardDemo />
      </section>

      <section aria-labelledby="input-heading" className="flex flex-col gap-4">
        <h2 id="input-heading" className="text-xl font-semibold">
          Input / Select / Textarea
        </h2>
        <InputDemo />
      </section>

      <section aria-labelledby="modal-heading" className="flex flex-col gap-4">
        <h2 id="modal-heading" className="text-xl font-semibold">
          Modal
        </h2>
        <p className="text-xs text-foreground/50">
          모바일 너비(640px 미만)에서는 하단 시트로, 그 이상에서는 중앙 모달로 표시됩니다. ESC 키
          또는 배경 클릭으로 닫힙니다.
        </p>
        <ModalDemo />
      </section>

      <section aria-labelledby="badge-heading" className="flex flex-col gap-4">
        <h2 id="badge-heading" className="text-xl font-semibold">
          Badge
        </h2>
        <BadgeDemo />
      </section>

      <section aria-labelledby="toast-heading" className="flex flex-col gap-4">
        <h2 id="toast-heading" className="text-xl font-semibold">
          Toast
        </h2>
        <ToastDemo />
      </section>

      <section aria-labelledby="tooltip-heading" className="flex flex-col gap-4">
        <h2 id="tooltip-heading" className="text-xl font-semibold">
          Tooltip
        </h2>
        <TooltipDemo />
      </section>

      <section aria-labelledby="progress-heading" className="flex flex-col gap-4">
        <h2 id="progress-heading" className="text-xl font-semibold">
          ProgressBar
        </h2>
        <ProgressBarDemo />
      </section>

      <section aria-labelledby="navigation-heading" className="flex flex-col gap-4">
        <h2 id="navigation-heading" className="text-xl font-semibold">
          Navigation
        </h2>
        <NavigationDemo />
      </section>

      <section aria-labelledby="gamification-heading" className="flex flex-col gap-10">
        <h2 id="gamification-heading" className="text-2xl font-bold">
          게임화 컴포넌트 (components/game)
        </h2>

        <div className="flex flex-col gap-4">
          <h3 className="text-lg font-semibold">EXP Bar</h3>
          <ExpBarDemo />
        </div>

        <div className="flex flex-col gap-4">
          <h3 className="text-lg font-semibold">Level Badge</h3>
          <LevelBadgeDemo />
        </div>

        <div className="flex flex-col gap-4">
          <h3 className="text-lg font-semibold">Streak Indicator</h3>
          <StreakIndicatorDemo />
        </div>

        <div className="flex flex-col gap-4">
          <h3 className="text-lg font-semibold">Quest Card</h3>
          <QuestCardDemo />
        </div>

        <div className="flex flex-col gap-4">
          <h3 className="text-lg font-semibold">Achievement Badge</h3>
          <AchievementBadgeDemo />
        </div>

        <div className="flex flex-col gap-4">
          <h3 className="text-lg font-semibold">Progress Ring</h3>
          <ProgressRingDemo />
        </div>

        <div className="flex flex-col gap-4">
          <h3 className="text-lg font-semibold">Collection Grid</h3>
          <CollectionGridDemo />
        </div>

        <div className="flex flex-col gap-4">
          <h3 className="text-lg font-semibold">EXP 획득 토스트</h3>
          <ExpToastDemo />
        </div>
      </section>
    </main>
  );
}
