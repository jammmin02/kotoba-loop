import Link from "next/link";

import { GoogleSignInButton } from "@/components/auth/google-signin-button";
import { LoginForm } from "@/components/auth/login-form";
import { OAuthErrorToast } from "@/components/auth/oauth-error-toast";
import { Card } from "@/components/ui/card";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ callbackUrl?: string; error?: string }>;
}) {
  const { callbackUrl = "/", error } = await searchParams;

  return (
    <Card variant="elevated" title="LOGIN.EXE" titleColor="pink" className="flex flex-col gap-6">
      <OAuthErrorToast error={error} />
      <div className="flex flex-col gap-1 text-center">
        <h1 className="text-xl font-bold text-foreground">로그인</h1>
        <p className="text-sm font-content text-foreground/60">
          kotoba-loop에서 일본어 학습을 이어가세요.
        </p>
      </div>

      <LoginForm callbackUrl={callbackUrl} />

      <div className="flex items-center gap-3">
        <div className="h-0.5 flex-1 bg-pixel-ink" />
        <span className="text-xs font-bold text-foreground/50">또는</span>
        <div className="h-0.5 flex-1 bg-pixel-ink" />
      </div>

      <GoogleSignInButton callbackUrl={callbackUrl} />

      <p className="text-center text-sm text-foreground/60">
        계정이 없으신가요?{" "}
        <Link href="/register" className="font-medium text-primary hover:underline">
          회원가입
        </Link>
      </p>
    </Card>
  );
}
