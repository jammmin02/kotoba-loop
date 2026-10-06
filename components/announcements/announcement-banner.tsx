"use client";

import { useQuery } from "@tanstack/react-query";
import { useMemo, useSyncExternalStore } from "react";

import { PixelInfo, PixelX } from "@/components/icons/pixel-icons";
import { apiFetch } from "@/lib/api/client";
import { cn } from "@/lib/utils";
import type { ActiveAnnouncement } from "@/types/announcement";

// 닫은 공지 id 목록을 기기(브라우저)에 기억한다. 공지가 수정돼도 id가 같으면 계속 닫힌 채로 둔다.
const DISMISSED_KEY = "kotoba-loop:dismissed-announcements";
const DISMISSED_EVENT = "kotoba-loop:dismissed-announcements-change";

function subscribeDismissed(onChange: () => void) {
  window.addEventListener("storage", onChange);
  window.addEventListener(DISMISSED_EVENT, onChange);
  return () => {
    window.removeEventListener("storage", onChange);
    window.removeEventListener(DISMISSED_EVENT, onChange);
  };
}

function getDismissedSnapshot(): string {
  try {
    return localStorage.getItem(DISMISSED_KEY) ?? "[]";
  } catch {
    return "[]";
  }
}

function parseDismissed(raw: string): string[] {
  try {
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter((v): v is string => typeof v === "string") : [];
  } catch {
    return [];
  }
}

function dismiss(id: string, current: string[]) {
  try {
    localStorage.setItem(DISMISSED_KEY, JSON.stringify([...new Set([...current, id])]));
  } catch {
    // 저장소를 쓸 수 없으면 새로고침 전까지만 닫혀 있게 둘 방법이 없어 그냥 넘어간다.
  }
  window.dispatchEvent(new Event(DISMISSED_EVENT));
}

export function AnnouncementBanner() {
  const { data } = useQuery({
    queryKey: ["announcements", "active"],
    queryFn: () => apiFetch<ActiveAnnouncement[]>("/api/announcements"),
    staleTime: 60_000,
  });

  const rawDismissed = useSyncExternalStore(subscribeDismissed, getDismissedSnapshot, () => "[]");
  const dismissed = useMemo(() => parseDismissed(rawDismissed), [rawDismissed]);

  const visible = (data ?? []).filter((a) => !dismissed.includes(a.id));
  if (visible.length === 0) return null;

  return (
    <div className="flex w-full flex-col gap-2" aria-label="공지사항">
      {visible.map((a) => (
        <div
          key={a.id}
          role="status"
          className={cn(
            "flex items-start gap-3 border-2 border-pixel-ink p-3 shadow-pixel-sm",
            a.level === "WARNING"
              ? "bg-warning text-warning-foreground"
              : "bg-surface text-foreground",
          )}
        >
          <PixelInfo className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
          <div className="min-w-0 flex-1">
            <p className="text-sm font-bold">
              {a.isPinned && <span className="mr-1">📌</span>}
              {a.title}
            </p>
            <p className="whitespace-pre-line text-xs font-content opacity-80">{a.body}</p>
          </div>
          <button
            type="button"
            onClick={() => dismiss(a.id, dismissed)}
            aria-label="공지 닫기"
            className="flex size-6 shrink-0 items-center justify-center border-2 border-pixel-ink bg-surface text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
          >
            <PixelX className="size-3.5" aria-hidden="true" />
          </button>
        </div>
      ))}
    </div>
  );
}
