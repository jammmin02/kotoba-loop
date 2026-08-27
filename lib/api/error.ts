import type { ApiErrorCode } from "@/types/api";

const ERROR_STATUS: Record<ApiErrorCode, number> = {
  VALIDATION_ERROR: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  EXTERNAL_API_ERROR: 502,
  AI_TIMEOUT: 504,
  AI_SCHEMA_INVALID: 502,
  INTERNAL_ERROR: 500,
  FILE_TOO_LARGE: 400,
  UNSUPPORTED_FILE_TYPE: 400,
  IMAGE_TOO_SMALL: 400,
  UPLOAD_MISMATCH: 400,
  STORAGE_ERROR: 502,
  OCR_NO_TEXT_FOUND: 400,
  OCR_TIMEOUT: 504,
  RATE_LIMITED: 429,
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
