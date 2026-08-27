import { z } from "zod";

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
    .max(VOCABULARY_BOOK_DESCRIPTION_MAX, `설명은 ${VOCABULARY_BOOK_DESCRIPTION_MAX}자 이하여야 합니다.`)
    .optional(),
  isPublic: z.boolean().optional(),
});

export const updateVocabularyBookSchema = createVocabularyBookSchema.partial();

export type CreateVocabularyBookInput = z.infer<typeof createVocabularyBookSchema>;
export type UpdateVocabularyBookInput = z.infer<typeof updateVocabularyBookSchema>;
