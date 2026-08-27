import Link from "next/link";

import { GoogleSignInButton } from "@/components/auth/google-signin-button";
import { RegisterForm } from "@/components/auth/register-form";
import { Card } from "@/components/ui/card";

export default function RegisterPage() {
  return (
    <Card variant="elevated" title="SIGNUP.EXE" titleColor="mint" className="flex flex-col gap-6">
      <div className="flex flex-col gap-1 text-center">
        <h1 className="text-xl font-bold text-foreground">회원가입</h1>
        <p className="text-sm font-content text-foreground/60">
          이메일 또는 Google로 시작해보세요.
        </p>
      </div>

      <RegisterForm />

      <div className="flex items-center gap-3">
        <div className="h-0.5 flex-1 bg-pixel-ink" />
        <span className="text-xs font-bold text-foreground/50">또는</span>
        <div className="h-0.5 flex-1 bg-pixel-ink" />
      </div>

      <GoogleSignInButton callbackUrl="/onboarding" />

      <p className="text-center text-sm text-foreground/60">
        이미 계정이 있으신가요?{" "}
        <Link href="/login" className="font-medium text-primary hover:underline">
          로그인
        </Link>
      </p>
    </Card>
  );
}
