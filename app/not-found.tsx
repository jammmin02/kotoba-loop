import Link from "next/link";

import { PixelSearch } from "@/components/icons/pixel-icons";
import { buttonVariants } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export default function NotFound() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-6 px-4 py-8">
      <Card
        variant="elevated"
        title="ERROR.EXE"
        titleColor="pink"
        className="flex w-full max-w-sm flex-col items-center gap-4 py-10 text-center"
      >
        <PixelSearch className="size-16 text-primary" aria-hidden="true" />
        <div className="flex flex-col gap-1">
          <p className="text-4xl font-extrabold text-foreground">404</p>
          <p className="text-lg font-bold text-foreground">페이지를 찾을 수 없어요</p>
          <p className="text-sm font-content text-foreground/60">
            주소가 잘못됐거나 삭제된 페이지예요.
          </p>
        </div>
        <Link href="/" className={cn(buttonVariants({ variant: "primary" }), "w-full")}>
          홈으로 돌아가기
        </Link>
      </Card>
    </main>
  );
}
