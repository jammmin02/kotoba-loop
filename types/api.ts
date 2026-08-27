export const API_ERROR_CODES = [
  "VALIDATION_ERROR",
  "UNAUTHORIZED",
  "FORBIDDEN",
  "NOT_FOUND",
  "CONFLICT",
  "AI_TIMEOUT",
  "AI_SCHEMA_INVALID",
  "EXTERNAL_API_ERROR",
  "INTERNAL_ERROR",
  "FILE_TOO_LARGE",
  "UNSUPPORTED_FILE_TYPE",
  "IMAGE_TOO_SMALL",
  "UPLOAD_MISMATCH",
  "STORAGE_ERROR",
  "OCR_NO_TEXT_FOUND",
  "OCR_TIMEOUT",
  "RATE_LIMITED",
] as const;

export type ApiErrorCode = (typeof API_ERROR_CODES)[number];

export interface ApiErrorBody {
  code: ApiErrorCode;
  message: string;
}

export interface ApiSuccessResponse<T> {
  success: true;
  data: T;
}

export interface ApiErrorResponse {
  success: false;
  error: ApiErrorBody;
}

export type ApiResponse<T> = ApiSuccessResponse<T> | ApiErrorResponse;

export interface PaginationParams {
  page: number;
  pageSize: number;
}

export interface PaginatedResponse<T> {
  items: T[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}
