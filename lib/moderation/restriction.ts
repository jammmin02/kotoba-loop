import "server-only";

import { ApiError } from "@/lib/api/error";
import { db } from "@/lib/db";

export function formatRestrictionEnd(until: Date): string {
  return until.toLocaleString("ko-KR", {
    timeZone: "Asia/Seoul",
    dateStyle: "long",
    timeStyle: "short",
  });
}

/**
 * 작성 제한 중인 사용자의 글 작성·수정을 막는다(2026-10 모더레이션). 제한이 풀리는 시각을 메시지와
 * details에 함께 내려 클라이언트가 안내할 수 있게 한다. 제한은 쓰기에만 적용되고 읽기·학습은 그대로다.
 */
export async function assertCanWrite(userId: string): Promise<void> {
  const user = await db.user.findUnique({
    where: { id: userId },
    select: { write_restricted_until: true },
  });
  const until = user?.write_restricted_until;
  if (until && until.getTime() > Date.now()) {
    throw new ApiError(
      "FORBIDDEN",
      `관리자 조치로 ${formatRestrictionEnd(until)}까지 단어장을 만들거나 수정할 수 없습니다.`,
      { restrictedUntil: until.toISOString() },
    );
  }
}
