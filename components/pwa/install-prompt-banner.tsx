"use client";

import { useEffect, useState, useSyncExternalStore } from "react";

import { PixelDownload, PixelX } from "@/components/icons/pixel-icons";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

const DISMISSED_KEY = "kotoba-loop:install-prompt-dismissed";

// Not in lib.dom.d.ts — https://developer.mozilla.org/docs/Web/API/BeforeInstallPromptEvent
interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  readonly userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

function isStandaloneDisplay() {
  const iosStandalone = (navigator as Navigator & { standalone?: boolean }).standalone;
  return window.matchMedia("(display-mode: standalone)").matches || iosStandalone === true;
}

function subscribeNoop() {
  return () => {};
}

// navigator/localStorage/matchMedia don't exist during SSR — defer any read of
// them to after hydration instead of branching render on `typeof window`.
function useMounted() {
  return useSyncExternalStore(
    subscribeNoop,
    () => true,
    () => false,
  );
}

/**
 * Global "add to home screen" banner — Chrome/Edge/Android can trigger the native
 * install prompt programmatically; iOS Safari has no such API, so it gets a
 * "how to" hint instead (Share sheet > 홈 화면에 추가). Hidden once installed, or
 * after the user dismisses it once (localStorage, this device only).
 */
export function InstallPromptBanner() {
  const mounted = useMounted();
  const [installEvent, setInstallEvent] = useState<BeforeInstallPromptEvent | null>(null);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    function handleBeforeInstallPrompt(event: Event) {
      event.preventDefault();
      setInstallEvent(event as BeforeInstallPromptEvent);
    }

    function handleAppInstalled() {
      setDismissed(true);
      setInstallEvent(null);
    }

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    window.addEventListener("appinstalled", handleAppInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
      window.removeEventListener("appinstalled", handleAppInstalled);
    };
  }, []);

  if (!mounted) return null;

  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
  const alreadyDismissed = dismissed || localStorage.getItem(DISMISSED_KEY) === "1";

  // Nothing to offer: already running standalone, dismissed before, or (not iOS
  // and the browser never fired beforeinstallprompt — unsupported browser, or
  // installability criteria not met yet).
  if (isStandaloneDisplay() || alreadyDismissed || (!installEvent && !isIOS)) return null;

  function dismiss() {
    localStorage.setItem(DISMISSED_KEY, "1");
    setDismissed(true);
  }

  async function handleInstallClick() {
    if (!installEvent) return;
    await installEvent.prompt();
    const { outcome } = await installEvent.userChoice;
    setInstallEvent(null);
    if (outcome === "accepted") setDismissed(true);
  }

  return (
    <div className="fixed inset-x-0 bottom-16 z-40 flex justify-center px-4 lg:bottom-4 lg:justify-end lg:pr-6">
      <Card
        variant="elevated"
        title="INSTALL.EXE"
        titleColor="mint"
        className="flex w-full max-w-sm items-start gap-3 p-3"
      >
        <PixelDownload className="mt-0.5 size-6 shrink-0 text-primary" aria-hidden="true" />
        <div className="flex-1">
          <p className="text-sm font-bold text-foreground">홈 화면에 추가</p>
          <p className="mt-1 text-xs font-content text-foreground/70">
            {isIOS && !installEvent
              ? "공유 버튼을 누르고 '홈 화면에 추가'를 선택하면 앱처럼 사용할 수 있어요."
              : "홈 화면에 추가하면 앱처럼 빠르게 열 수 있어요."}
          </p>
          {installEvent && (
            <Button variant="primary" size="sm" className="mt-2" onClick={handleInstallClick}>
              설치하기
            </Button>
          )}
        </div>
        <button
          type="button"
          onClick={dismiss}
          aria-label="설치 안내 닫기"
          className="shrink-0 text-foreground/50 transition hover:text-foreground"
        >
          <PixelX className="size-4" aria-hidden="true" />
        </button>
      </Card>
    </div>
  );
}
