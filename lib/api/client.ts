import type { ApiErrorCode, ApiResponse } from "@/types/api";

/** Error codes that never reach the server and so aren't part of the standard `ApiErrorCode` set. */
export type ApiClientErrorCode = ApiErrorCode | "NETWORK_ERROR" | "TIMEOUT";

/**
 * Thrown by `apiFetch` for both server-reported errors and client-side failures
 * (network/timeout). Safe to use directly as a TanStack Query `queryFn`/`mutationFn`
 * error — Query surfaces whatever this throws as `error`.
 */
export class ApiClientError extends Error {
  readonly code: ApiClientErrorCode;
  readonly status?: number;

  constructor(code: ApiClientErrorCode, message: string, status?: number) {
    super(message);
    this.name = "ApiClientError";
    this.code = code;
    this.status = status;
  }
}

export interface ApiFetchOptions extends Omit<RequestInit, "body"> {
  body?: unknown;
  /** Aborts the request after this many ms. Defaults to 10s. */
  timeoutMs?: number;
}

const DEFAULT_TIMEOUT_MS = 10_000;

/**
 * Fetches `path`, parses the standard `ApiResponse` envelope, returns `data` on
 * success, and throws `ApiClientError` otherwise (including on network failure
 * or timeout). Intended for direct use as a TanStack Query `queryFn`/`mutationFn`.
 */
export async function apiFetch<T>(path: string, options: ApiFetchOptions = {}): Promise<T> {
  const { body, timeoutMs = DEFAULT_TIMEOUT_MS, headers, ...rest } = options;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  let res: Response;
  try {
    res = await fetch(path, {
      ...rest,
      headers: {
        "Content-Type": "application/json",
        ...headers,
      },
      body: body !== undefined ? JSON.stringify(body) : undefined,
      signal: controller.signal,
    });
  } catch (err) {
    if (err instanceof DOMException && err.name === "AbortError") {
      throw new ApiClientError("TIMEOUT", "요청이 시간 초과되었습니다.");
    }
    throw new ApiClientError("NETWORK_ERROR", "네트워크 연결에 실패했습니다.");
  } finally {
    clearTimeout(timeoutId);
  }

  let json: ApiResponse<T>;
  try {
    json = (await res.json()) as ApiResponse<T>;
  } catch {
    throw new ApiClientError("NETWORK_ERROR", "서버 응답을 해석할 수 없습니다.", res.status);
  }

  if (!json.success) {
    throw new ApiClientError(json.error.code, json.error.message, res.status);
  }

  return json.data;
}
