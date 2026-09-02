"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";

import { PET_MOTION_DISPLAY_MS, usePetMotionPending } from "@/components/pet/pet-motion-store";
import { PetSprite } from "@/components/pet/pet-sprite";
import type { PetExpression } from "@/components/pet/pet-sprite";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ProgressBar } from "@/components/ui/progress-bar";
import { toast } from "@/components/ui/toast";
import { ApiClientError, apiFetch } from "@/lib/api/client";
import { PET_SPECIES_OPTIONS, PET_STAGE_LABELS } from "@/lib/pet/constants";
import type { PetSpecies } from "@/lib/pet/types";
import { cn } from "@/lib/utils";
import type { PetActiveResponse } from "@/types/pet";

const BLINK_MIN_MS = 6000;
const BLINK_MAX_MS = 10000;
const BLINK_DURATION_MS = 180;

function randomBlinkDelay(): number {
  return BLINK_MIN_MS + Math.random() * (BLINK_MAX_MS - BLINK_MIN_MS);
}

/**
 * 홈 화면(PROMPT 17) 상단에 항상 노출되는 펫 위젯(계획서 외 신규 기능, 2026-08-25 확정) —
 * 활성 펫이 없으면(최초 진입 또는 졸업 직후) 이 컴포넌트 자체가 선택 패널을 보여준다. 별도
 * 라우트를 만들지 않아 최초 진입/재선택 흐름이 자동으로 하나로 합쳐진다.
 */
export function PetWidget() {
  const queryClient = useQueryClient();
  const { data, isLoading, isError, error } = useQuery({
    queryKey: ["pet", "active"],
    queryFn: () => apiFetch<PetActiveResponse>("/api/pet"),
  });
  const [selected, setSelected] = useState<PetSpecies>();
  const [blinking, setBlinking] = useState(false);
  const [motionPending, clearMotionPending] = usePetMotionPending();

  const pet = data?.pet ?? null;

  const selectMutation = useMutation({
    mutationFn: (species: PetSpecies) =>
      apiFetch<PetActiveResponse>("/api/pet", { method: "POST", body: { species } }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["pet", "active"] });
      queryClient.invalidateQueries({ queryKey: ["pet", "history"] });
      toast.success("펫을 선택했어요! 학습하면서 함께 키워보세요.");
    },
    onError: (err) => {
      toast.error(err instanceof ApiClientError ? err.message : "펫 선택에 실패했습니다.");
    },
  });

  // 눈 깜빡임 — egg를 제외한 단계에서 외부 트리거 없이 6~10초마다 150~200ms 자체 재생한다.
  useEffect(() => {
    if (!pet || pet.stage === "egg") return;
    let blinkTimer: ReturnType<typeof setTimeout>;
    let revertTimer: ReturnType<typeof setTimeout>;

    function scheduleBlink() {
      blinkTimer = setTimeout(() => {
        setBlinking(true);
        revertTimer = setTimeout(() => {
          setBlinking(false);
          scheduleBlink();
        }, BLINK_DURATION_MS);
      }, randomBlinkDelay());
    }
    scheduleBlink();

    return () => {
      clearTimeout(blinkTimer);
      clearTimeout(revertTimer);
    };
    // pet 객체 전체가 아니라 stage/id 변화에만 반응한다 — 매 refetch마다 새 객체 참조가 와도
    // 값이 그대로면 깜빡임 루프를 다시 시작하지 않는다.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pet?.stage, pet?.id]);

  // 성장(sparkle)/기쁨(happy) 모션 — 이 위젯이 마운트된 동안에만 1회 재생 후 pending을 지운다
  // (Level Badge의 useLevelUpPending 소비 패턴과 동일).
  useEffect(() => {
    if (!motionPending) return;
    const timer = setTimeout(clearMotionPending, PET_MOTION_DISPLAY_MS[motionPending]);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [motionPending]);

  if (isLoading) return null;
  if (isError) {
    return (
      <p className="text-xs text-error">
        {error instanceof ApiClientError ? error.message : "펫 정보를 불러오지 못했습니다."}
      </p>
    );
  }

  if (!pet) {
    return (
      <Card variant="elevated" title="PET.EXE" titleColor="mint" className="flex flex-col gap-3">
        <p className="text-sm font-bold text-foreground">
          함께 학습할 펫을 골라주세요. 아래는 다 자랐을 때(성체) 모습이에요.
        </p>
        <div className="grid grid-cols-3 gap-2">
          {PET_SPECIES_OPTIONS.map((option) => (
            <button
              key={option.value}
              type="button"
              aria-pressed={selected === option.value}
              onClick={() => setSelected(option.value)}
              className={cn(
                "flex flex-col items-center gap-1 border-2 border-pixel-ink p-2 transition",
                selected === option.value
                  ? "bg-primary/15 shadow-bevel-sunken"
                  : "bg-surface shadow-bevel-raised hover:bg-background",
              )}
            >
              <PetSprite species={option.value} stage="adult" expression="idle" size={64} />
              <span className="text-xs font-bold text-foreground">{option.label}</span>
            </button>
          ))}
        </div>
        <Button
          type="button"
          disabled={!selected}
          loading={selectMutation.isPending}
          onClick={() => selected && selectMutation.mutate(selected)}
          className="self-end"
        >
          선택하기
        </Button>
      </Card>
    );
  }

  const expression: PetExpression = motionPending ?? (blinking ? "blink" : "idle");

  return (
    <Card variant="elevated" title="PET.EXE" titleColor="mint" className="flex flex-col gap-3">
      <div className="flex items-center gap-4">
        <PetSprite species={pet.species} stage={pet.stage} expression={expression} size={80} />
        <div className="flex flex-1 flex-col gap-1">
          <p className="text-sm font-extrabold text-foreground">{PET_STAGE_LABELS[pet.stage]}</p>
          <p className="text-xs text-foreground/60">
            {pet.levelsUntilNextStage > 0
              ? `다음 단계까지 레벨 ${pet.levelsUntilNextStage}`
              : "곧 다음 단계로 자라요"}
          </p>
        </div>
      </div>
      <ProgressBar value={pet.stageProgressCurrent} max={pet.stageProgressTotal} />
    </Card>
  );
}
