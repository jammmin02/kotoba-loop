"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "@/components/ui/toast";
import { ApiClientError, apiFetch } from "@/lib/api/client";
import { registerSchema } from "@/lib/validations/auth";

import type { FormEvent } from "react";

interface FieldErrors {
  nickname?: string;
  email?: string;
  password?: string;
  form?: string;
}

export function RegisterForm() {
  const router = useRouter();
  const [nickname, setNickname] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errors, setErrors] = useState<FieldErrors>({});
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setErrors({});

    const parsed = registerSchema.safeParse({ nickname, email, password });
    if (!parsed.success) {
      const fieldErrors: FieldErrors = {};
      for (const issue of parsed.error.issues) {
        const key = issue.path[0];
        if ((key === "nickname" || key === "email" || key === "password") && !fieldErrors[key]) {
          fieldErrors[key] = issue.message;
        }
      }
      setErrors(fieldErrors);
      return;
    }

    setLoading(true);
    try {
      await apiFetch("/api/auth/register", { method: "POST", body: parsed.data });

      // 가입 승인제: 관리자 승인 전에는 로그인할 수 없으므로 자동 로그인 없이 승인 대기 화면으로 보낸다.
      router.push("/pending");
    } catch (err) {
      const message =
        err instanceof ApiClientError
          ? err.message
          : err instanceof Error
            ? err.message
            : "회원가입에 실패했습니다.";
      setErrors({ form: message });
      toast.error(message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4" noValidate>
      <Input
        label="닉네임"
        value={nickname}
        onChange={(e) => setNickname(e.target.value)}
        error={errors.nickname}
        required
      />
      <Input
        label="이메일"
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        error={errors.email}
        autoComplete="email"
        required
      />
      <Input
        label="비밀번호"
        type="password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        error={errors.password}
        helperText={errors.password ? undefined : "8자 이상 입력해주세요."}
        autoComplete="new-password"
        required
      />
      {errors.form && (
        <p role="alert" className="text-sm text-error">
          {errors.form}
        </p>
      )}
      <Button type="submit" loading={loading}>
        회원가입
      </Button>
    </form>
  );
}
