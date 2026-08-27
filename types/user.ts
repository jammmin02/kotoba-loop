/** `GET /api/users/me` — MY 프로필 화면(PROMPT 25-A)이 쓰는 계정/온보딩 값 조회 응답. */
export interface UserProfileResponse {
  nickname: string;
  email: string;
  createdAt: string;
  jlptLevel: string | null;
  targetJlpt: string | null;
  dailyWordTarget: number | null;
  dailyStudyTime: number | null;
  purpose: string[];
}
