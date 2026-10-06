import { z } from "zod";

import { BOOK_COLORS } from "@/lib/vocabulary-book-color";

export const VOCABULARY_BOOK_NAME_MAX = 50;
export const VOCABULARY_BOOK_DESCRIPTION_MAX = 200;

export const createVocabularyBookSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "단어장 이름을 입력해주세요.")
    .max(VOCABULARY_BOOK_NAME_MAX, `이름은 ${VOCABULARY_BOOK_NAME_MAX}자 이하여야 합니다.`),
  description: z
    .string()
    .trim()
    .max(
      VOCABULARY_BOOK_DESCRIPTION_MAX,
      `설명은 ${VOCABULARY_BOOK_DESCRIPTION_MAX}자 이하여야 합니다.`,
    )
    .optional(),
  isPublic: z.boolean().optional(),
  // null은 "직접 고르지 않음"(순번 색으로 대체)이라 수정 시 색을 되돌리는 데도 쓴다.
  color: z.enum(BOOK_COLORS).nullable().optional(),
});

export const updateVocabularyBookSchema = createVocabularyBookSchema.partial();

export type CreateVocabularyBookInput = z.infer<typeof createVocabularyBookSchema>;
export type UpdateVocabularyBookInput = z.infer<typeof updateVocabularyBookSchema>;
