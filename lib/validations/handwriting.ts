import { z } from "zod";

export const HANDWRITING_MAX_STROKES = 30;
export const HANDWRITING_MAX_POINTS_PER_STROKE = 300;

const strokeSchema = z
  .object({
    x: z.array(z.number()).min(2).max(HANDWRITING_MAX_POINTS_PER_STROKE),
    y: z.array(z.number()).min(2).max(HANDWRITING_MAX_POINTS_PER_STROKE),
    t: z.array(z.number()).min(2).max(HANDWRITING_MAX_POINTS_PER_STROKE),
  })
  .refine((stroke) => stroke.x.length === stroke.y.length && stroke.y.length === stroke.t.length, {
    message: "stroke의 x/y/t 길이가 일치해야 합니다.",
  });

export const handwritingRecognizeSchema = z.object({
  strokes: z.array(strokeSchema).min(1).max(HANDWRITING_MAX_STROKES),
  width: z.number().int().min(10).max(4000),
  height: z.number().int().min(10).max(4000),
});

export type HandwritingRecognizeInput = z.infer<typeof handwritingRecognizeSchema>;
