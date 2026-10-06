"use client";

import Link from "next/link";
import { useEffect } from "react";

import { PixelX } from "@/components/icons/pixel-icons";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export default function Error({
  error,
  retry,
}: {
  error: Error & { digest?: string };
  retry: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-6 px-4 py-8">
      <Card
        variant="elevated"
        title="ERROR.EXE"
        titleColor="pink"
        className="flex w-full max-w-sm flex-col items-center gap-4 py-10 text-center"
      >
        <PixelX className="size-16 text-error" aria-hidden="true" />
        <div className="flex flex-col gap-1">
          <p className="text-lg font-bold text-foreground">문제가 발생했어요</p>
          <p className="text-sm font-content text-foreground/60">
            일시적인 오류일 수 있어요. 다시 시도해도 안 되면 잠시 후에 이용해주세요.
          </p>
          {error.digest && (
            <p className="mt-1 text-xs font-content text-foreground/40">
              오류 코드: {error.digest}
            </p>
          )}
        </div>
        <div className="flex w-full flex-col gap-2">
          <Button type="button" onClick={() => retry()} className="w-full">
            다시 시도
          </Button>
          <Link href="/" className={cn(buttonVariants({ variant: "outline" }), "w-full")}>
            홈으로 돌아가기
          </Link>
        </div>
      </Card>
    </main>
  );
}
