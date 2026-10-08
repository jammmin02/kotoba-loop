"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { useState } from "react";

import { LogoutButton } from "@/components/auth/logout-button";
import { GameProfileHeader } from "@/components/game/game-profile-header";
import {
  PixelBarChart,
  PixelEgg,
  PixelFlame,
  PixelGlobe,
  PixelLock,
  PixelStar,
  PixelUsers,
} from "@/components/icons/pixel-icons";
import type { PixelIconComponent } from "@/components/icons/pixel-icons";
import { ExamGoalSettings } from "@/components/my/exam-goal-settings";
import { OnboardingSettingsForm } from "@/components/my/onboarding-settings-form";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, cardVariants } from "@/components/ui/card";
import { ThemeSelector } from "@/components/ui/theme-selector";
import { ExportDialog } from "@/components/vocabulary/export-dialog";
import { ApiClientError, apiFetch } from "@/lib/api/client";
import { isAdminRole } from "@/lib/auth-admin";
import { cn } from "@/lib/utils";
import type { UserProfileResponse } from "@/types/user";

function formatJoinDate(iso: string): string {
  const date = new Date(iso);
  return `${date.getFullYear()}년 ${date.getMonth() + 1}월 ${date.getDate()}일 가입`;
}

function MenuCard({
  icon: Icon,
  label,
  href,
  disabled,
}: {
  icon: PixelIconComponent;
  label: string;
  href?: string;
  disabled?: boolean;
}) {
  const content = (
    <div
      className={cn(
        cardVariants(),
        "flex items-center gap-3 p-4 transition",
        disabled
          ? "opacity-50 grayscale"
          : "hover:bg-background active:translate-x-[2px] active:translate-y-[2px] active:shadow-none",
      )}
      aria-disabled={disabled}
    >
      <Icon className="size-5 shrink-0" aria-hidden="true" />
      <span className="flex-1 text-sm font-bold text-foreground">{label}</span>
      {disabled && <span className="text-xs font-bold text-muted">준비 중</span>}
    </div>
  );

  if (disabled || !href) return content;
  return <Link href={href}>{content}</Link>;
}

export function MyPageView() {
  const { data: session } = useSession();
  const [exportOpen, setExportOpen] = useState(false);
  const {
    data: profile,
    isLoading,
    isError,
    error,
  } = useQuery({
    queryKey: ["users", "me"],
    queryFn: () => apiFetch<UserProfileResponse>("/api/users/me"),
  });

  if (isLoading) {
    return <p className="text-sm text-muted">불러오는 중...</p>;
  }

  if (isError || !profile) {
    return (
      <p className="text-sm text-error">
        {error instanceof ApiClientError ? error.message : "프로필을 불러오지 못했습니다."}
      </p>
    );
  }

  return (
    <div className="flex w-full max-w-2xl flex-col gap-6">
      <h1 className="text-lg font-extrabold text-foreground">마이페이지</h1>

      <Card variant="elevated" title="PROFILE.EXE" className="flex flex-col gap-4">
        <div className="flex flex-col gap-1">
          <p className="text-lg font-extrabold text-foreground">{profile.nickname}</p>
          <p className="text-sm text-muted">{profile.email}</p>
          <p className="text-xs text-muted">{formatJoinDate(profile.createdAt)}</p>
        </div>
        <GameProfileHeader />
      </Card>

      <div className="flex flex-col gap-3">
        <MenuCard icon={PixelBarChart} label="통계" href="/stats" />
        <MenuCard icon={PixelFlame} label="스트릭 · 캘린더" href="/my/streak" />
        <MenuCard icon={PixelStar} label="업적" href="/achievements" />
        <MenuCard icon={PixelEgg} label="내 펫" href="/my/pet" />
        <MenuCard icon={PixelUsers} label="친구" href="/my/friends" />
        <MenuCard icon={PixelGlobe} label="커뮤니티 단어장" href="/community" />
        {isAdminRole(session?.user?.role) && (
          <MenuCard icon={PixelLock} label="관리자" href="/admin" />
        )}
      </div>

      <Card title="DISPLAY.EXE" className="flex flex-col gap-3">
        <div className="flex flex-col gap-1">
          <h2 className="text-sm font-extrabold text-foreground">화면 테마</h2>
          <p className="text-xs text-muted">
            이 기기의 브라우저에 저장돼요. &apos;시스템&apos;은 기기 설정을 따라가요.
          </p>
        </div>
        <ThemeSelector />
      </Card>

      <Card title="DATA.EXE" titleColor="pink" className="flex flex-col gap-3">
        <div className="flex flex-col gap-1">
          <h2 className="text-sm font-extrabold text-foreground">내 단어 데이터</h2>
          <p className="text-xs text-muted">
            단어를 CSV·JSON 파일로 내려받아 백업하거나, 파일에서 한꺼번에 가져올 수 있어요.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button type="button" variant="outline" onClick={() => setExportOpen(true)}>
            내보내기
          </Button>
          <Link href="/vocabulary/import" className={buttonVariants({ variant: "outline" })}>
            가져오기
          </Link>
        </div>
      </Card>
      {exportOpen && <ExportDialog open onClose={() => setExportOpen(false)} />}

      <OnboardingSettingsForm profile={profile} />

      <ExamGoalSettings />

      <LogoutButton />
    </div>
  );
}
