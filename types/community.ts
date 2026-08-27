export interface CommunityBookSummary {
  id: string;
  name: string;
  description: string | null;
  ownerNickname: string;
  wordCount: number;
  importCount: number;
  createdAt: string;
}

export interface CommunityBookDetail extends CommunityBookSummary {
  isOwner: boolean;
  words: {
    id: string;
    word: string;
    reading: string;
    meanings: string[];
  }[];
}
