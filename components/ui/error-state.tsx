"use client";

import { PixelX } from "@/components/icons/pixel-icons";
import { Button } from "@/components/ui/button";
import { ApiClientError } from "@/lib/api/client";
import { cn } from "@/lib/utils";

interface ErrorStateProps {
  /** 요청이 던진 오류. ApiClientError면 서버가 준 메시지를 보여주고, 아니면 fallbackMessage를 쓴다. */
  error?: unknown;
  fallbackMessage: string;
  /** 있으면 '다시 시도' 버튼을 보여준다(보통 useQuery의 refetch). */
  onRetry?: () => void;
  /** 재시도 요청이 진행 중인지 — 버튼을 잠가 중복 요청을 막는다. */
  retrying?: boolean;
  className?: string;
}

/** 목록/카드의 데이터를 못 불러왔을 때의 오류 안내. role="alert"라 나타나는 즉시 읽어준다. */
export function ErrorState({
  error,
  fallbackMessage,
  onRetry,
  retrying,
  className,
}: ErrorStateProps) {
  const message = error instanceof ApiClientError ? error.message : fallbackMessage;

  return (
    <div
      role="alert"
      className={cn(
        "flex flex-col gap-3 border-2 border-error bg-surface p-4 sm:flex-row sm:items-center sm:justify-between",
        className,
      )}
    >
      <div className="flex items-start gap-2">
        <PixelX className="mt-0.5 size-4 shrink-0 text-error" aria-hidden="true" />
        <p className="text-sm font-bold text-foreground">{message}</p>
      </div>
      {onRetry && (
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={onRetry}
          loading={retrying}
          className="shrink-0 self-start sm:self-auto"
        >
          다시 시도
        </Button>
      )}
    </div>
  );
}
