import "server-only";

import { z } from "zod";

import { runStructuredAnalysis } from "@/lib/ai/orchestrator";
import { WORD_CHAT_ANSWER_MAX } from "@/lib/validations/ai";

export const WORD_CHAT_TYPE = "word_chat";

const wordChatAnswerSchema = z.object({
  answer: z.string().min(1).max(WORD_CHAT_ANSWER_MAX),
});

export interface WordChatMessage {
  role: "user" | "assistant";
  content: string;
}

export type WordChatResult = z.infer<typeof wordChatAnswerSchema>;

const SYSTEM_PROMPT = `당신은 일본어 학습 앱 kotoba-loop의 단어 사전 도우미입니다.
사용자는 단어 사전 화면에서 특정 일본어 단어를 조회한 뒤, 그 단어에 대해 궁금한 점을 한국어로
이어서 채팅으로 질문합니다.

규칙:
- 답변은 항상 대화 맨 위에 주어진 "단어"와 직접 관련된 내용으로만 답하세요.
- 뜻, 뉘앙스, 유의어/반의어, 활용형, 존댓말/반말 표현, 예문, 사용 상황 등 학습에 도움이 되는
  정보를 간결하게 설명하세요.
- 이전 대화 맥락이 있으면 참고해서 자연스럽게 이어서 답하세요.
- 답변은 한국어로, ${WORD_CHAT_ANSWER_MAX}자 이내로 간결하게 작성하세요.
- 근거 없는 정보를 지어내지 마세요. 확신할 수 없으면 솔직하게 확실하지 않다고 답하세요.
- 질문이 해당 단어와 무관하면, 정중히 거절하고 단어 관련 질문을 유도하세요.`;

function buildUserPrompt(word: string, history: WordChatMessage[], question: string): string {
  const historyText = history.map((m) => `${m.role === "user" ? "Q" : "A"}: ${m.content}`).join("\n");

  return [`단어: ${word}`, historyText && `이전 대화:\n${historyText}`, `새 질문: ${question}`]
    .filter(Boolean)
    .join("\n\n");
}

export async function chatAboutWord(
  word: string,
  question: string,
  history: WordChatMessage[],
): Promise<WordChatResult> {
  const { data } = await runStructuredAnalysis({
    analysisType: WORD_CHAT_TYPE,
    system: SYSTEM_PROMPT,
    user: buildUserPrompt(word, history, question),
    schema: wordChatAnswerSchema,
  });

  return data;
}
