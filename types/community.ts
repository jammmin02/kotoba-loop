import type { BookColor } from "@/lib/vocabulary-book-color";

export interface CommunityBookSummary {
  id: string;
  name: string;
  description: string | null;
  /** 작성자가 고른 슬롯 색. 없거나 가려진(숨김) 단어장이면 null. */
  color: BookColor | null;
  ownerNickname: string;
  wordCount: number;
  importCount: number;
  createdAt: string;
  /** 관리자에 의해 숨김 처리됨. 작성자·관리자가 아니면 name 등이 가려진 채로 내려온다. */
  hidden: boolean;
}

export interface CommunityBookDetail extends CommunityBookSummary {
  /** 숨김 사유 — 작성자·관리자에게만 내려온다. */
  hideReason: string | null;
  isOwner: boolean;
  words: {
    id: string;
    word: string;
    reading: string;
    meanings: string[];
  }[];
}
