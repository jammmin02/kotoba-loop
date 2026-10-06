import Link from "next/link";

import { Card, cardVariants } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export default function PendingPage() {
  return (
    <Card variant="elevated" title="PENDING.EXE" titleColor="mint" className="flex flex-col gap-6">
      <div className="flex flex-col gap-2 text-center">
        <h1 className="text-xl font-bold text-foreground">승인 대기 중</h1>
        <p className="text-sm font-content text-foreground/70">
          가입 신청이 접수되었어요. 관리자가 승인하면 로그인할 수 있습니다.
        </p>
        <p className="text-xs font-content text-foreground/50">
          승인되면 가입한 방법(이메일 또는 Google)으로 다시 로그인해주세요.
        </p>
      </div>

      <Link
        href="/login"
        className={cn(
          cardVariants(),
          "p-3 text-center text-sm font-bold text-foreground hover:bg-background",
        )}
      >
        로그인 화면으로
      </Link>
    </Card>
  );
}
