import type { ReviewGrade } from "@/lib/srs/types";

/** 채점 버튼 순서 — 화면의 버튼 순서와 숫자 단축키(1~4)가 같은 배열을 쓴다. */
export const FLASHCARD_GRADE_ORDER: readonly ReviewGrade[] = ["UNKNOWN", "HARD", "GOOD", "EASY"];

export type FlashcardShortcutAction = { type: "flip" } | { type: "grade"; grade: ReviewGrade };

export interface FlashcardShortcutInput {
  key: string;
  repeat: boolean;
  /** IME(한글/일본어)로 글자를 조합하는 중인지. */
  isComposing: boolean;
  ctrlKey: boolean;
  metaKey: boolean;
  altKey: boolean;
  /** 입력창/텍스트 영역/셀렉트/contenteditable 위에서 눌렀는지 — 타이핑을 가로채면 안 된다. */
  targetIsEditable: boolean;
  /** 버튼/링크 위에서 눌렀는지 — Space/Enter는 브라우저 기본 동작(클릭)에 맡겨야 이중 실행이 없다. */
  targetIsInteractive: boolean;
  /** 모달이 열려 있는지 — 모달 위에서는 학습 단축키를 쓰지 않는다. */
  modalOpen: boolean;
  isFlipped: boolean;
  isSubmitting: boolean;
}

/**
 * 플래시카드 단축키를 해석한다. 아무 동작도 하지 않을 입력이면 null.
 * - Space/Enter: 정답 면 보기(이미 뒤집힌 뒤에는 무시 — 실수로 앞면으로 돌아가지 않게)
 * - 1~4: 뒤집힌 뒤에만 채점(모르겠음/헷갈림/기억남/쉬움)
 */
export function resolveFlashcardShortcut(
  input: FlashcardShortcutInput,
): FlashcardShortcutAction | null {
  if (input.repeat || input.isComposing || input.modalOpen) return null;
  if (input.ctrlKey || input.metaKey || input.altKey) return null;
  if (input.targetIsEditable) return null;

  if (input.key === " " || input.key === "Enter") {
    if (input.targetIsInteractive || input.isFlipped) return null;
    return { type: "flip" };
  }

  const gradeIndex = ["1", "2", "3", "4"].indexOf(input.key);
  if (gradeIndex !== -1 && input.isFlipped && !input.isSubmitting) {
    return { type: "grade", grade: FLASHCARD_GRADE_ORDER[gradeIndex] };
  }

  return null;
}
