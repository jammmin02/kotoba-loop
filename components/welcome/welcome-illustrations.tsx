import Image from "next/image";

import { PixelCheck } from "@/components/icons/pixel-icons";
import { cn } from "@/lib/utils";

/**
 * 앱 소개 온보딩(/welcome) 슬라이드 안 "창" 속에 들어가는 정적 일러스트(2026-09-23).
 * 실제 데이터가 아니라 기능을 보여주는 예시 목업이다 — API를 부르지 않고 숫자·단어는 고정값이다.
 * 데스크톱에서는 부모(welcome-intro.tsx)가 `lg:[zoom:1.2]`로 한 번에 키우므로 여기서는
 * 모바일 기준(폭 ~350px) 크기만 잡는다.
 */

const cardBox = "border-2 border-pixel-ink bg-white";

function CheckBox({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        "flex size-4 shrink-0 items-center justify-center border-2 border-pixel-ink bg-secondary text-secondary-foreground",
        className,
      )}
    >
      <PixelCheck className="size-2.5" aria-hidden="true" />
    </span>
  );
}

export function WelcomeEggIllustration({ large = false }: { large?: boolean }) {
  return (
    <>
      <Image
        src="/pets/rabbit/egg-sparkle.png"
        alt="반짝이는 펫 알"
        width={1254}
        height={1254}
        preload
        className={cn(
          "size-64 object-contain motion-safe:animate-pet-idle",
          large && "lg:size-[380px]",
        )}
      />
      <div className="flex items-center gap-2 border-2 border-pixel-ink bg-white px-2.5 py-1.5 text-xs font-bold text-foreground lg:px-3.5 lg:py-2 lg:text-[15px]">
        <span className="size-2 border border-pixel-ink bg-accent lg:size-2.5" aria-hidden="true" />
        알이 부화를 기다리고 있어요
      </div>
    </>
  );
}

const REVIEW_SCHEDULE = [
  { day: "오늘", label: "학습", state: "done" },
  { day: "1일", label: "복습 1", state: "done" },
  { day: "3일", label: "복습 2", state: "now" },
  { day: "7일", label: "복습 3", state: "next" },
  { day: "14일", label: "복습 4", state: "next" },
] as const;

const scheduleStateClass = {
  done: "bg-secondary text-secondary-foreground",
  now: "bg-accent text-accent-foreground",
  next: "bg-surface text-foreground",
} as const;

export function SrsIllustration() {
  return (
    <>
      <div
        className={cn(
          cardBox,
          "flex w-full flex-col items-center gap-1.5 px-3.5 py-4 shadow-pixel-sm",
        )}
      >
        <div className="flex w-full items-center justify-between">
          <span className="border-2 border-pixel-ink bg-titlebar-pink px-1.5 py-0.5 text-[11px] font-bold text-pixel-ink">
            N2
          </span>
          <span className="text-[11px] font-bold text-foreground/70">오늘 복습 3 / 12</span>
        </div>
        <p lang="ja" className="mt-1.5 text-[44px] font-bold leading-tight text-foreground">
          見逃す
        </p>
        <p lang="ja" className="text-[15px] text-foreground/70">
          みのがす
        </p>
        <p className="font-content text-base font-medium text-foreground">
          놓치다, 못 보고 지나치다
        </p>
      </div>

      <div className="flex w-full flex-col gap-2">
        <span className="text-[11px] font-bold text-foreground">다음 복습 일정</span>
        <ol className="flex justify-between">
          {REVIEW_SCHEDULE.map((item) => (
            <li key={item.day} className="flex flex-col items-center gap-1">
              <span
                className={cn(
                  "flex h-[34px] w-[50px] items-center justify-center border-2 border-pixel-ink text-xs font-bold",
                  scheduleStateClass[item.state],
                )}
              >
                {item.day}
              </span>
              <span className="text-[10px] text-foreground/70">{item.label}</span>
            </li>
          ))}
        </ol>
      </div>
    </>
  );
}

const SCANNED_WORDS = [
  { word: "復習", reading: "ふくしゅう", meaning: "복습", tilt: "-rotate-2" },
  { word: "覚える", reading: "おぼえる", meaning: "외우다", tilt: "-rotate-1" },
  { word: "単語", reading: "たんご", meaning: "단어", tilt: "-rotate-2" },
] as const;

export function PhotoScanIllustration() {
  return (
    <>
      <div className="relative flex h-[118px] w-full flex-col justify-center gap-2 border-2 border-dashed border-pixel-ink bg-[#efe6cf] px-[18px] py-3.5 dark:bg-surface">
        <span className="absolute right-2 top-1.5 text-[10px] font-bold text-foreground/70">
          note_0923.jpg
        </span>
        {SCANNED_WORDS.map((item) => (
          <p key={item.word} lang="ja" className={cn("text-lg text-foreground", item.tilt)}>
            {item.word}　{item.reading}
          </p>
        ))}
      </div>

      <div className="flex items-center gap-2 border-2 border-pixel-ink bg-primary px-2.5 py-1 text-xs font-bold text-primary-foreground">
        <svg
          viewBox="0 0 14 14"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="square"
          className="size-3.5"
          aria-hidden="true"
        >
          <path d="M7 1 V13 M2 8 L7 13 L12 8" />
        </svg>
        AI 분석 · 3개 단어 발견
      </div>

      <ul className="flex w-full flex-col gap-1.5">
        {SCANNED_WORDS.map((item) => (
          <li key={item.word} className={cn(cardBox, "flex items-center gap-2.5 px-2.5 py-2")}>
            <CheckBox />
            <span lang="ja" className="text-[17px] font-bold text-foreground">
              {item.word}
            </span>
            <span lang="ja" className="text-xs text-foreground/70">
              {item.reading}
            </span>
            <span className="ml-auto font-content text-[13px] text-foreground">{item.meaning}</span>
          </li>
        ))}
      </ul>
    </>
  );
}

export function KanjiIllustration() {
  return (
    <>
      <div className="flex items-center gap-4">
        <div
          className={cn(
            cardBox,
            "relative flex size-44 items-center justify-center shadow-pixel-sm",
          )}
          aria-hidden="true"
        >
          <svg viewBox="0 0 172 172" className="absolute inset-0 size-full">
            <path
              d="M86 0 V172 M0 86 H172"
              className="stroke-primary"
              strokeOpacity="0.35"
              strokeWidth="1.5"
              strokeDasharray="5 5"
            />
          </svg>
          <span lang="ja" className="relative text-[132px] leading-none text-foreground/20">
            語
          </span>
          <svg viewBox="0 0 172 172" className="absolute inset-0 size-full">
            <path
              d="M32 44 L62 44 M36 64 L60 64 M36 84 L60 84"
              className="stroke-primary"
              strokeWidth="7"
              strokeLinecap="square"
              fill="none"
            />
            <circle
              cx="62"
              cy="44"
              r="6"
              className="fill-accent stroke-pixel-ink"
              strokeWidth="2"
            />
          </svg>
        </div>

        <dl className="flex flex-col gap-2">
          <div className="flex flex-col gap-0.5">
            <dt className="text-[10px] font-bold text-foreground/70">음독</dt>
            <dd lang="ja" className="text-lg font-bold text-foreground">
              ゴ
            </dd>
          </div>
          <div className="flex flex-col gap-0.5">
            <dt className="text-[10px] font-bold text-foreground/70">훈독</dt>
            <dd lang="ja" className="text-base font-bold text-foreground">
              かた(る)
            </dd>
          </div>
          <div className="flex flex-col gap-0.5">
            <dt className="text-[10px] font-bold text-foreground/70">뜻</dt>
            <dd className="font-content text-[15px] font-medium text-foreground">말씀 어</dd>
          </div>
          <span className="self-start border-2 border-pixel-ink bg-titlebar-mint px-1.5 py-0.5 text-[11px] font-bold text-pixel-ink">
            14획
          </span>
        </dl>
      </div>

      <div className="flex w-full flex-col gap-1.5">
        <div className="flex justify-between text-[11px] font-bold text-foreground">
          <span>획순 따라 쓰기</span>
          <span>3 / 14</span>
        </div>
        <div className="h-3.5 border-2 border-pixel-ink bg-white">
          <div className="h-full w-[21%] bg-accent" />
        </div>
      </div>
    </>
  );
}

const SAMPLE_QUESTS = [
  { title: "오늘의 복습 끝내기", exp: 30, done: true },
  { title: "새 단어 10개 학습", exp: 20, done: false },
] as const;

export function PetQuestIllustration() {
  return (
    <>
      <div className="flex items-center gap-3">
        <Image
          src="/pets/rabbit/egg-sparkle.png"
          alt="펫 알"
          width={1254}
          height={1254}
          className="size-[78px] object-contain opacity-85"
        />
        <svg
          viewBox="0 0 28 16"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="square"
          className="h-4 w-7 text-pixel-ink dark:text-foreground"
          aria-hidden="true"
        >
          <path d="M2 8 H24 M18 2 L24 8 L18 14" />
        </svg>
        <Image
          src="/pets/cat/baby-happy.png"
          alt="부화한 아기 고양이 펫"
          width={1254}
          height={1254}
          className="size-[180px] object-contain motion-safe:animate-pet-idle"
        />
      </div>

      <div className="flex w-full flex-col gap-1.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="flex size-[30px] items-center justify-center rounded-full border-2 border-pixel-ink bg-accent text-xs font-bold text-accent-foreground">
              5
            </span>
            <span className="text-[13px] font-bold text-foreground">아기 고양이</span>
          </div>
          <span className="text-[11px] font-bold text-foreground/70">EXP 320 / 500</span>
        </div>
        <div className="h-3.5 border-2 border-pixel-ink bg-white">
          <div className="h-full w-[64%] bg-primary" />
        </div>
      </div>

      <ul className="flex w-full flex-col gap-1.5">
        {SAMPLE_QUESTS.map((quest) => (
          <li
            key={quest.title}
            className={cn(cardBox, "flex items-center gap-2.5 px-2.5 py-[7px]")}
          >
            {quest.done ? (
              <CheckBox className="size-[18px]" />
            ) : (
              <span className="size-[18px] shrink-0 border-2 border-pixel-ink bg-white" />
            )}
            <span className="text-xs font-bold text-foreground">{quest.title}</span>
            <span className="ml-auto text-[11px] font-bold text-amber-800">+{quest.exp} EXP</span>
          </li>
        ))}
      </ul>
    </>
  );
}
