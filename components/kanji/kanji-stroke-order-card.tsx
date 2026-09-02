"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

import type HanziWriterType from "hanzi-writer";

interface KanjiStrokeOrderCardProps {
  character: string;
}

type Status = "loading" | "ready" | "unavailable";
type PlaybackPhase = "idle" | "playing" | "paused" | "done";

const WRITER_SIZE_MOBILE = 200;
const WRITER_SIZE_DESKTOP = 260;
// Tailwind의 `sm` breakpoint와 맞춘다 — 이 컴포넌트만 별도 기준을 두지 않기 위해.
const DESKTOP_MEDIA_QUERY = "(min-width: 640px)";

function subscribeToDesktopQuery(callback: () => void) {
  const mql = window.matchMedia(DESKTOP_MEDIA_QUERY);
  mql.addEventListener("change", callback);
  return () => mql.removeEventListener("change", callback);
}

function getIsDesktopSnapshot() {
  return window.matchMedia(DESKTOP_MEDIA_QUERY).matches;
}

// matchMedia doesn't exist during SSR — default to the mobile size there, same as
// components/pwa/install-prompt-banner.tsx's useMounted does for window reads.
function getIsDesktopServerSnapshot() {
  return false;
}

/**
 * PROMPT 52(계획서 44장) — 한자 상세 페이지(PROMPT 34/48)에 얹는 획순 애니메이션 섹션.
 * 획순 데이터는 hanzi-writer-data-jp(animCJK/Make Me a Hanzi 기반, 일본어 자형 전용)를
 * jsDelivr CDN에서 문자 단위로 lazy fetch한다 — npm 의존성으로 번들에 포함하지 않고,
 * 데이터가 없는 문자는 이 섹션 자체를 렌더링하지 않는다(완료 조건: 폴백).
 */
export function KanjiStrokeOrderCard({ character }: KanjiStrokeOrderCardProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const writerRef = useRef<HanziWriterType | null>(null);
  const [status, setStatus] = useState<Status>("loading");
  const [phase, setPhase] = useState<PlaybackPhase>("idle");
  const isDesktop = useSyncExternalStore(
    subscribeToDesktopQuery,
    getIsDesktopSnapshot,
    getIsDesktopServerSnapshot,
  );
  const size = isDesktop ? WRITER_SIZE_DESKTOP : WRITER_SIZE_MOBILE;

  useEffect(() => {
    let cancelled = false;

    import("hanzi-writer").then(({ default: HanziWriter }) => {
      if (cancelled || !containerRef.current) return;
      containerRef.current.innerHTML = "";

      const inkColor = getComputedStyle(document.documentElement)
        .getPropertyValue("--foreground")
        .trim();

      const writer = HanziWriter.create(containerRef.current, character, {
        width: size,
        height: size,
        padding: 12,
        showCharacter: false,
        showOutline: true,
        strokeColor: inkColor || "#333",
        outlineColor: "#9ca3af",
        delayBetweenStrokes: 300,
        charDataLoader: (char, onLoad, onError) => {
          fetch(
            `https://cdn.jsdelivr.net/npm/hanzi-writer-data-jp@0/${encodeURIComponent(char)}.json`,
          )
            .then((res) => {
              if (!res.ok) throw new Error("stroke data not found");
              return res.json();
            })
            .then(onLoad)
            .catch(onError);
        },
        onLoadCharDataSuccess: () => {
          if (!cancelled) setStatus("ready");
        },
        onLoadCharDataError: () => {
          if (!cancelled) setStatus("unavailable");
        },
      });

      writerRef.current = writer;
    });

    return () => {
      cancelled = true;
      writerRef.current = null;
    };
  }, [character, size]);

  const handleTogglePlay = () => {
    const writer = writerRef.current;
    if (!writer) return;

    if (phase === "playing") {
      writer.pauseAnimation();
      setPhase("paused");
      return;
    }

    if (phase === "paused") {
      writer.resumeAnimation();
      setPhase("playing");
      return;
    }

    writer.hideCharacter({ duration: 0 });
    setPhase("playing");
    writer.animateCharacter({ onComplete: () => setPhase("done") });
  };

  if (status === "unavailable") {
    return null;
  }

  const playLabel =
    phase === "playing" ? "일시정지" : phase === "paused" ? "이어서 재생" : "획순 재생";

  return (
    <Card className="flex flex-col gap-3">
      <h2 className="text-sm font-bold text-foreground/70">획순</h2>
      <div className="flex flex-col items-center gap-3">
        <div
          ref={containerRef}
          className="border-2 border-pixel-ink bg-surface"
          style={{ width: size, height: size }}
        />
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={status === "loading"}
          onClick={handleTogglePlay}
        >
          {playLabel}
        </Button>
      </div>
    </Card>
  );
}
