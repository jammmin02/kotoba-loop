import { PrismaPg } from "@prisma/adapter-pg";
import { config } from "dotenv";

import { PrismaClient } from "../lib/generated/prisma/client";

// PROMPT 14는 AI가 제안한 "관련 한자"를 텍스트로만 보여주고 저장하지 않았다(Kanji 테이블이
// 아직 없었기 때문). 이제 常用漢字 2,136자가 시딩됐으니(prisma/seed-kanji.ts), 그때의 제안
// 문자열을 다시 신뢰하는 대신 기존 Vocabulary.word 원문을 한 글자씩 다시 스캔해 실제 Kanji와
// 일치하는 문자만 VocabularyKanji로 연결한다 — word에 없는 한자를 AI가 잘못 제안했을 가능성을
// 원천 차단하고, 이 스크립트를 몇 번 다시 돌려도(재배포 후 재실행) 항상 같은 결과가 나오도록
// 한다(idempotent upsert).
config({ path: ".env" });
config({ path: ".env.local", override: true });

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const db = new PrismaClient({ adapter });

async function main() {
  const kanjiRows = await db.kanji.findMany({ select: { id: true, character: true } });
  const kanjiIdByChar = new Map(kanjiRows.map((k) => [k.character, k.id]));

  const vocabularies = await db.vocabulary.findMany({ select: { id: true, word: true } });

  let linked = 0;
  for (const vocab of vocabularies) {
    const charsInWord = new Set(Array.from(vocab.word));
    const kanjiIds = Array.from(charsInWord)
      .map((char) => kanjiIdByChar.get(char))
      .filter((id): id is string => id !== undefined);

    for (const kanjiId of kanjiIds) {
      await db.vocabularyKanji.upsert({
        where: { vocabulary_id_kanji_id: { vocabulary_id: vocab.id, kanji_id: kanjiId } },
        update: {},
        create: { vocabulary_id: vocab.id, kanji_id: kanjiId },
      });
      linked += 1;
    }
  }

  console.log(
    `Backfill complete: scanned ${vocabularies.length} vocabularies, ensured ${linked} vocabulary-kanji links.`,
  );
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await db.$disconnect();
  });
