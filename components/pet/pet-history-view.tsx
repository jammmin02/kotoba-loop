"use client";

import { useQuery } from "@tanstack/react-query";

import { PetSprite } from "@/components/pet/pet-sprite";
import { Card } from "@/components/ui/card";
import { ApiClientError, apiFetch } from "@/lib/api/client";
import { PET_SPECIES_OPTIONS, PET_STAGE_LABELS } from "@/lib/pet/constants";
import { cn } from "@/lib/utils";
import type { PetHistoryResponse } from "@/types/pet";

function speciesLabel(species: string): string {
  return PET_SPECIES_OPTIONS.find((option) => option.value === species)?.label ?? species;
}

function formatDate(iso: string): string {
  const date = new Date(iso);
  return `${date.getFullYear()}년 ${date.getMonth() + 1}월 ${date.getDate()}일`;
}

/** MY > 내 펫(components/my/my-page-view.tsx MenuCard) — 현재 펫 + 졸업한 과거 펫 전체 이력. */
export function PetHistoryView() {
  const {
    data: pets,
    isLoading,
    isError,
    error,
  } = useQuery({
    queryKey: ["pet", "history"],
    queryFn: () => apiFetch<PetHistoryResponse>("/api/pet/history"),
  });

  if (isLoading) {
    return <p className="text-sm text-foreground/60">불러오는 중...</p>;
  }

  if (isError || !pets) {
    return (
      <p className="text-sm text-error">
        {error instanceof ApiClientError ? error.message : "펫 기록을 불러오지 못했습니다."}
      </p>
    );
  }

  return (
    <div className="flex w-full max-w-2xl flex-col gap-6">
      <h1 className="text-lg font-extrabold text-foreground">내 펫</h1>

      {pets.length === 0 ? (
        <p className="text-sm text-foreground/60">
          아직 키우는 펫이 없어요. 홈 화면에서 펫을 선택해보세요.
        </p>
      ) : (
        <ul className="flex flex-col gap-3">
          {pets.map((pet) => (
            <li key={pet.id}>
              <Card
                variant={pet.isActive ? "elevated" : "default"}
                className={cn("flex items-center gap-4", !pet.isActive && "opacity-70")}
              >
                <PetSprite species={pet.species} stage={pet.stage} expression="idle" size={56} />
                <div className="flex flex-1 flex-col gap-1">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-extrabold text-foreground">
                      {speciesLabel(pet.species)}
                    </p>
                    {pet.isActive && <span className="text-xs font-bold text-primary">현재 펫</span>}
                    {pet.isGraduated && <span className="text-xs font-bold text-accent">졸업</span>}
                  </div>
                  <p className="text-xs text-foreground/60">
                    {PET_STAGE_LABELS[pet.stage]} · {formatDate(pet.startedAt)} 시작
                    {pet.graduatedAt && ` · ${formatDate(pet.graduatedAt)} 졸업`}
                  </p>
                </div>
              </Card>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
