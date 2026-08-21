import type { ApiErrorCode } from "@/types/api";

const ERROR_STATUS: Record<ApiErrorCode, number> = {
  VALIDATION_ERROR: 400,
  UNAUTHORIZED: 401,
  NOT_FOUND: 404,
  EXTERNAL_API_ERROR: 502,
  AI_TIMEOUT: 504,
  INTERNAL_ERROR: 500,
};

/** Throw this from within a `withApiHandler`-wrapped route to produce a standard error response. */
export class ApiError extends Error {
  readonly code: ApiErrorCode;
  readonly status: number;

  constructor(code: ApiErrorCode, message: string) {
    super(message);
    this.name = "ApiError";
    this.code = code;
    this.status = ERROR_STATUS[code];
  }
}
