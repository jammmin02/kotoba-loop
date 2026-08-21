import { ZodError } from "zod";

import { ApiError } from "@/lib/api/error";
import { apiError, apiSuccess } from "@/lib/api/response";
import type { ApiResponse } from "@/types/api";

import type { NextRequest, NextResponse } from "next/server";

type Handler<Args extends unknown[]> = (
  req: NextRequest,
  ...args: Args
) => Promise<unknown> | unknown;

/**
 * Wraps a Next.js Route Handler so it can just return data or throw, and always
 * produces the standard `ApiResponse` envelope. Thrown `ApiError`s map to their
 * declared code/status; thrown `ZodError`s become `VALIDATION_ERROR`; anything
 * else becomes `INTERNAL_ERROR`.
 */
export function withApiHandler<Args extends unknown[] = []>(handler: Handler<Args>) {
  return async (req: NextRequest, ...args: Args): Promise<NextResponse<ApiResponse<unknown>>> => {
    try {
      const data = await handler(req, ...args);
      return apiSuccess(data);
    } catch (err) {
      if (err instanceof ApiError) {
        return apiError(err.code, err.message, err.status);
      }
      if (err instanceof ZodError) {
        const message = err.issues.map((issue) => issue.message).join(", ");
        return apiError("VALIDATION_ERROR", message, 400);
      }
      console.error(err);
      return apiError("INTERNAL_ERROR", "예상치 못한 오류가 발생했습니다.", 500);
    }
  };
}
