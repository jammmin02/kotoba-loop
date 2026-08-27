export interface FriendSummary {
  userId: string;
  nickname: string;
  email: string;
  publicBookCount: number;
  followedAt: string;
}

export interface UserSearchResult {
  id: string;
  nickname: string;
  email: string;
  isFollowing: boolean;
}
