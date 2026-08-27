"use client";

import { useState } from "react";

import { parseKanjiReading } from "@/lib/kanji";

const COLLAPSED_LIMIT = 4;

/**
 * 음독/훈독을 쉼표로 이어붙인 한 줄 대신 칩 단위로 나눠 보여준다. 오쿠리가나 구분점("くだ.す")은
 * "くだ(す)"처럼 괄호로 바꿔 어디까지가 한자 읽기이고 어디부터 오쿠리가나인지 한눈에 들어오게
 * 하고, 읽기가 많은 한자(예: 下 12개)는 처음 4개만 보여주고 나머지는 펼치기로 감춘다.
 */
export function KanjiReadingList({ readings }: { readings: string[] }) {
  const [expanded, setExpanded] = useState(false);

  if (readings.length === 0) {
    return <span className="text-foreground/40">-</span>;
  }

  const visible = expanded ? readings : readings.slice(0, COLLAPSED_LIMIT);
  const hiddenCount = readings.length - visible.length;

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {visible.map((reading, index) => {
        const { base, okurigana } = parseKanjiReading(reading);
        return (
          <span
            key={`${reading}-${index}`}
            className="inline-flex items-baseline rounded-none border-2 border-pixel-ink bg-surface px-1.5 py-0.5 font-jp text-xs text-foreground"
          >
            {base}
            {okurigana && <span className="text-foreground/40">({okurigana})</span>}
          </span>
        );
      })}
      {hiddenCount > 0 && (
        <button
          type="button"
          onClick={() => setExpanded(true)}
          className="text-xs font-bold text-foreground/50 hover:text-foreground hover:underline"
        >
          +{hiddenCount}개 더
        </button>
      )}
      {expanded && readings.length > COLLAPSED_LIMIT && (
        <button
          type="button"
          onClick={() => setExpanded(false)}
          className="text-xs font-bold text-foreground/50 hover:text-foreground hover:underline"
        >
          접기
        </button>
      )}
    </div>
  );
}
