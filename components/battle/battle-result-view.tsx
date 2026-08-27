"use client";

import Link from "next/link";

import { buttonVariants } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { BattleParticipantSummary } from "@/types/battle";

const RANK_LABELS = ["🥇", "🥈", "🥉"];

export function BattleResultView({ participants }: { participants: BattleParticipantSummary[] }) {
  return (
    <div className="flex w-full max-w-md flex-col gap-6">
      <Card variant="elevated" title="최종 순위" className="flex flex-col gap-2">
        {participants.map((participant, index) => (
          <div
            key={participant.userId}
            className={cn(
              "flex items-center justify-between border-2 border-pixel-ink px-3 py-2",
              index === 0 ? "bg-accent text-accent-foreground" : "bg-background text-foreground",
            )}
          >
            <span className="flex items-center gap-2 text-sm font-bold">
              <span>{RANK_LABELS[index] ?? `${index + 1}위`}</span>
              {participant.nickname}
            </span>
            <span className="font-mono text-sm font-bold">{participant.score}점</span>
          </div>
        ))}
      </Card>

      <Link
        href="/study/battle"
        className={cn(buttonVariants({ variant: "quest", size: "lg" }), "w-full")}
      >
        다시 대결하기
      </Link>
    </div>
  );
}
