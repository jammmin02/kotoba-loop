import { z } from "zod";

export const registerSchema = z.object({
  nickname: z
    .string()
    .trim()
    .min(2, "닉네임은 2자 이상이어야 합니다.")
    .max(30, "닉네임은 30자 이하여야 합니다."),
  email: z.email("올바른 이메일 형식이 아닙니다.").trim().toLowerCase(),
  password: z.string().min(8, "비밀번호는 8자 이상이어야 합니다."),
});

export type RegisterInput = z.infer<typeof registerSchema>;

export const loginSchema = z.object({
  email: z.email("올바른 이메일 형식이 아닙니다.").trim().toLowerCase(),
  password: z.string().min(1, "비밀번호를 입력해주세요."),
});

export type LoginInput = z.infer<typeof loginSchema>;
