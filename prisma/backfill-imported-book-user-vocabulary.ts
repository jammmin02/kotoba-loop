import { PrismaPg } from "@prisma/adapter-pg";
import { config } from "dotenv";

import { PrismaClient } from "../lib/generated/prisma/client";

// app/api/vocabulary-books/community/[id]/import/route.ts 가 VocabularyBookItem만 복사하고
// UserVocabulary를 만들지 않았던 버그 때문에, 이미 "가져오기"한 단어장의 단어를 누르면
// /words/[id]가 404를 띄운다. 이 스크립트는 그 버그로 생긴 누락분을 한 번 채워 넣는다
// (정상 흐름은 항상 둘 다 만들므로, 이미 있는 조합은 skipDuplicates로 건너뛰어 안전하다).
config({ path: ".env" });
config({ path: ".env.local", override: true });

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const db = new PrismaClient({ adapter });

async function main() {
  const items = await db.vocabularyBookItem.findMany({
    select: { vocabulary_id: true, book: { select: { user_id: true } } },
  });

  const seen = new Set<string>();
  const rows = items
    .map((item) => ({ user_id: item.book.user_id, vocabulary_id: item.vocabulary_id }))
    .filter((row) => {
      const key = `${row.user_id}:${row.vocabulary_id}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });

  const result = await db.userVocabulary.createMany({
    data: rows.map((row) => ({ ...row, learning_status: "NEW" as const })),
    skipDuplicates: true,
  });

  console.log(`검사한 (user, word) 조합: ${rows.length}개`);
  console.log(`새로 채운 UserVocabulary: ${result.count}개`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await db.$disconnect();
  });
