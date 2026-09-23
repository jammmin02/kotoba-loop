"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";

import { Button, buttonVariants } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import type { CardProps } from "@/components/ui/card";
import {
  KanjiIllustration,
  PetQuestIllustration,
  PhotoScanIllustration,
  SrsIllustration,
  WelcomeEggIllustration,
} from "@/components/welcome/welcome-illustrations";
import { cn } from "@/lib/utils";

/**
 * 앱 소개 온보딩(2026-09-23, 디자인 캔버스 "kotoba-loop 앱 소개 온보딩" 기준 구현).
 * 가입 전 방문자에게 핵심 기능 4가지를 넘겨보게 한 뒤 회원가입(/register)으로 보낸다 — 가입 직후
 * 학습 설정 마법사(/onboarding, PROMPT 08)와는 별개의 화면이다.
 *
 * 하나의 마크업으로 모바일(세로 1단)과 데스크톱(lg 이상, 좌측 텍스트 + 우측 창 2단)을 모두 그린다.
 * 모바일에서는 왼쪽 텍스트 묶음을 `contents`로 풀어 헤치고 `order`로 창을 스텝 표시와 제목 사이에
 * 끼워 넣는다.
 */

const LAST_STEP = 4;

/** 데스크톱에서만 줄바꿈 — 넓은 화면에서 제목을 한 줄 더 끊어 읽기 좋게 한다 */
function DesktopBr() {
  return <br className="hidden lg:inline" />;
}

interface Slide {
  windowTitle: string;
  titleColor: NonNullable<CardProps["titleColor"]>;
  Illustration: () => React.JSX.Element;
  headline: React.ReactNode;
  body: string;
}

const SLIDES: Slide[] = [
  {
    windowTitle: "FLASHCARD.EXE",
    titleColor: "mint",
    Illustration: SrsIllustration,
    headline: (
      <>
        잊기 직전에,
        <br />
        다시 보여줄게요
      </>
    ),
    body: "간격 반복(SRS)이 단어마다 복습 시점을 계산해요. 매일 오늘 봐야 할 단어만 골라 드려요.",
  },
  {
    windowTitle: "PHOTO_SCAN.EXE",
    titleColor: "pink",
    Illustration: PhotoScanIllustration,
    headline: (
      <>
        사진 한 장으로
        <br />
        단어장 완성
      </>
    ),
    body: "교재나 필기 노트를 찍으면 단어를 뽑아내고, AI가 읽는 법·뜻·예문까지 채워줘요.",
  },
  {
    windowTitle: "KANJI_DRAW.EXE",
    titleColor: "mint",
    Illustration: KanjiIllustration,
    headline: (
      <>
        한자는
        <br />
        직접 써 보면서 <DesktopBr />
        익혀요
      </>
    ),
    body: "획순을 보며 따라 쓰고 퀴즈로 확인해요. 모르는 한자는 손글씨로 그려서 찾을 수 있어요.",
  },
  {
    windowTitle: "MY_PET.EXE",
    titleColor: "pink",
    Illustration: PetQuestIllustration,
    headline: (
      <>
        공부할수록
        <br />
        펫이 자라요
      </>
    ),
    body: "학습 EXP로 알에서 성체까지 펫을 키워요. 매일 퀘스트와 연속 학습으로 루프를 이어가세요.",
  },
];

const FEATURE_CHIPS = [
  { label: "SRS 복습", color: "bg-secondary" },
  { label: "사진·AI 등록", color: "bg-titlebar-pink" },
  { label: "한자 쓰기", color: "bg-titlebar-mint" },
  { label: "펫·퀘스트", color: "bg-accent" },
] as const;

const bigButton = "h-13 w-full text-[17px] lg:h-14 lg:text-lg";

function Logo({ className }: { className?: string }) {
  return (
    <span className={cn("flex items-baseline gap-2.5", className)}>
      <span className="font-bold text-foreground">
        kotoba<span className="text-primary">-</span>loop
      </span>
      <span lang="ja" className="text-xs font-bold tracking-[0.15em] text-foreground/70">
        ことば・ループ
      </span>
    </span>
  );
}

function StepDots({ step }: { step: number }) {
  return (
    <div className="flex items-center gap-1.5 lg:gap-2" aria-hidden="true">
      {SLIDES.map((_, index) => (
        <span
          key={index}
          className={cn(
            "h-2 border-2 border-pixel-ink transition-[width] duration-200 lg:h-2.5",
            index + 1 === step ? "w-[22px] bg-primary lg:w-7" : "w-2 bg-surface lg:w-2.5",
          )}
        />
      ))}
    </div>
  );
}

function IntroWindow({
  title,
  titleColor,
  className,
  bodyClassName,
  children,
}: {
  title: string;
  titleColor: NonNullable<CardProps["titleColor"]>;
  className?: string;
  /** 창 본문(타이틀 바 아래) 영역 — 높이는 여기서 잡는다 */
  bodyClassName?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={cn("w-full shrink-0", className)}>
      <Card
        variant="elevated"
        title={title}
        titleColor={titleColor}
        className={cn("flex flex-col items-center justify-center p-[18px] lg:p-6", bodyClassName)}
      >
        {children}
      </Card>
    </div>
  );
}

export function WelcomeIntro() {
  // 0 = 웰컴 화면, 1~4 = 기능 소개 슬라이드
  const [step, setStep] = useState(0);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const hasNavigated = useRef(false);

  const goTo = useCallback((next: number) => {
    hasNavigated.current = true;
    setStep(Math.min(Math.max(next, 0), LAST_STEP));
  }, []);

  // 스텝이 바뀌면 새 제목으로 포커스를 옮겨 스크린리더가 바뀐 내용을 읽게 한다(첫 진입은 제외).
  useEffect(() => {
    if (!hasNavigated.current) return;
    headingRef.current?.focus({ preventScroll: true });
    window.scrollTo({ top: 0 });
  }, [step]);

  // 데스크톱에서 ← / → 키로 넘겨볼 수 있게 한다.
  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      const target = event.target as HTMLElement | null;
      if (target?.closest("input, textarea, select, [contenteditable='true']")) return;
      if (event.key === "ArrowRight") goTo(step + 1);
      if (event.key === "ArrowLeft") goTo(step - 1);
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [goTo, step]);

  const slide = step > 0 ? SLIDES[step - 1] : null;
  const isLast = step === LAST_STEP;

  return (
    <div className="flex min-h-dvh w-full flex-col">
      {/* 데스크톱 상단 바 — 모바일은 각 화면 안의 로고/건너뛰기로 대신한다 */}
      <header className="hidden h-16 shrink-0 items-center justify-between border-b-2 border-pixel-ink bg-surface px-12 lg:flex">
        <button
          type="button"
          onClick={() => goTo(0)}
          className="text-[22px] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
          aria-label="kotoba-loop 처음 화면으로"
        >
          <Logo />
        </button>
        <nav className="flex items-center gap-4" aria-label="온보딩 메뉴">
          {slide && !isLast && (
            <button
              type="button"
              onClick={() => goTo(LAST_STEP)}
              className="flex h-11 items-center px-2 text-sm font-bold text-foreground/70 underline underline-offset-[3px] hover:text-foreground"
            >
              건너뛰기
            </button>
          )}
          <Link href="/login" className={buttonVariants({ variant: "outline", size: "md" })}>
            로그인
          </Link>
        </nav>
      </header>

      <main
        className={cn(
          "mx-auto flex w-full max-w-md flex-1 flex-col gap-6 px-5 pb-7 pt-5",
          "lg:max-w-[1280px] lg:flex-row lg:items-center lg:justify-between lg:gap-16 lg:px-24 lg:py-10",
        )}
      >
        {slide === null ? (
          <>
            <div className="contents lg:flex lg:w-[500px] lg:flex-col lg:gap-7">
              <div className="order-1 flex flex-col items-center gap-1.5 pt-4 lg:hidden">
                <p className="text-4xl font-bold tracking-tight text-foreground">
                  kotoba<span className="text-primary">-</span>loop
                </p>
                <p lang="ja" className="text-[15px] font-bold tracking-[0.2em] text-foreground/70">
                  ことば・ループ
                </p>
              </div>

              <span className="hidden self-start border-2 border-pixel-ink bg-titlebar-mint px-2.5 py-1 text-[13px] font-bold text-pixel-ink lg:inline">
                AI 일본어 단어·한자 학습
              </span>

              <div className="order-3 flex flex-col items-center gap-2.5 text-center lg:items-start lg:gap-4 lg:text-left">
                <h1
                  ref={headingRef}
                  tabIndex={-1}
                  className="text-[25px] font-bold leading-[1.35] break-keep text-foreground outline-none lg:text-[52px] lg:leading-[1.22]"
                >
                  외우고, <DesktopBr />
                  다시 만나고,
                  <br />
                  함께 자라는 일본어
                </h1>
                <p className="font-content text-[15px] leading-relaxed break-keep text-foreground/70 lg:text-lg lg:leading-[1.7]">
                  단어·한자를 잊기 전에 복습하는 학습 루프.
                  <br />
                  공부할수록 나만의 펫이 성장해요.
                </p>
              </div>

              <ul className="order-5 hidden flex-wrap gap-2 lg:flex" aria-label="주요 기능">
                {FEATURE_CHIPS.map((chip) => (
                  <li
                    key={chip.label}
                    className="flex items-center gap-2 border-2 border-pixel-ink bg-white px-2.5 py-2 text-sm font-bold text-foreground dark:bg-surface"
                  >
                    <span className={cn("size-2.5 border-2 border-pixel-ink", chip.color)} />
                    {chip.label}
                  </li>
                ))}
              </ul>

              <div className="order-4 flex-1 lg:hidden" />

              <div className="order-6 flex flex-col gap-3 lg:flex-row lg:gap-3.5 lg:pt-2">
                <Button
                  type="button"
                  size="lg"
                  onClick={() => goTo(1)}
                  className={cn(bigButton, "lg:w-[220px]")}
                >
                  시작하기
                </Button>
                <Link
                  href="/login"
                  className={cn(
                    buttonVariants({ variant: "outline", size: "lg" }),
                    bigButton,
                    "lg:w-auto",
                  )}
                >
                  이미 계정이 있어요<span className="lg:hidden">&nbsp;· 로그인</span>
                </Link>
              </div>
            </div>

            <IntroWindow
              title="WELCOME.EXE"
              titleColor="mint"
              className="order-2 lg:order-none lg:w-[560px]"
              bodyClassName="min-h-[300px] lg:min-h-[500px]"
            >
              <div className="flex flex-col items-center gap-3.5 lg:gap-5">
                <WelcomeEggIllustration large />
              </div>
            </IntroWindow>
          </>
        ) : (
          <>
            <div className="contents lg:flex lg:w-[440px] lg:flex-col lg:gap-7">
              <div className="order-1 flex h-11 items-center justify-between lg:h-auto">
                <div className="flex items-center gap-3 lg:gap-3.5">
                  <span className="text-xs font-bold text-foreground lg:text-sm">
                    STEP {step}/{SLIDES.length}
                  </span>
                  <StepDots step={step} />
                </div>
                {!isLast && (
                  <button
                    type="button"
                    onClick={() => goTo(LAST_STEP)}
                    className="flex h-11 items-center px-1 text-[13px] font-bold text-foreground/70 underline underline-offset-[3px] hover:text-foreground lg:hidden"
                  >
                    건너뛰기
                  </button>
                )}
              </div>

              <div className="order-3 flex flex-col gap-2.5 px-0.5 lg:gap-4 lg:px-0">
                <h1
                  ref={headingRef}
                  tabIndex={-1}
                  className="text-[25px] font-bold leading-[1.3] break-keep text-foreground outline-none lg:text-[44px] lg:leading-[1.25]"
                >
                  {slide.headline}
                </h1>
                <p className="font-content text-[15px] leading-relaxed break-keep text-foreground/70 lg:text-lg lg:leading-[1.7]">
                  {slide.body}
                </p>
              </div>

              <div className="order-4 flex-1 lg:hidden" />

              {isLast && (
                <p className="order-5 text-center font-content text-xs text-foreground/70 lg:text-left lg:text-sm">
                  현재는 @g.yju.ac.kr 이메일로 가입할 수 있어요.
                </p>
              )}

              <div className="order-6 flex gap-3 lg:gap-3.5 lg:pt-2">
                <Button
                  type="button"
                  variant="outline"
                  size="lg"
                  onClick={() => goTo(step - 1)}
                  className={cn(bigButton, "w-[108px] shrink-0 lg:w-32")}
                >
                  이전
                </Button>
                {isLast ? (
                  <Link
                    href="/register"
                    className={cn(
                      buttonVariants({ size: "lg" }),
                      bigButton,
                      "flex-1 lg:w-[220px] lg:flex-none",
                    )}
                  >
                    시작하기
                  </Link>
                ) : (
                  <Button
                    type="button"
                    size="lg"
                    onClick={() => goTo(step + 1)}
                    className={cn(bigButton, "flex-1 lg:w-[220px] lg:flex-none")}
                  >
                    다음
                  </Button>
                )}
              </div>
            </div>

            <IntroWindow
              title={slide.windowTitle}
              titleColor={slide.titleColor}
              className="order-2 lg:order-none lg:w-[620px]"
              bodyClassName="min-h-[360px] lg:min-h-[500px]"
            >
              <div className="flex w-full max-w-[400px] flex-col items-center gap-3.5 lg:[zoom:1.2]">
                <slide.Illustration />
              </div>
            </IntroWindow>
          </>
        )}
      </main>
    </div>
  );
}
