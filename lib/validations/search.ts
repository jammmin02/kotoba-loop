import { z } from "zod";

export const SEARCH_QUERY_MAX = 100;
export const SEARCH_PAGE_SIZE_DEFAULT = 20;
export const SEARCH_PAGE_SIZE_MAX = 50;

export const searchQuerySchema = z.object({
  q: z
    .string()
    .trim()
    .min(1, "검색어를 입력해주세요.")
    .max(SEARCH_QUERY_MAX, `검색어는 ${SEARCH_QUERY_MAX}자 이하여야 합니다.`),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(SEARCH_PAGE_SIZE_MAX).default(SEARCH_PAGE_SIZE_DEFAULT),
});

export type SearchQueryInput = z.infer<typeof searchQuerySchema>;
