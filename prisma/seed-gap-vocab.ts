import { PrismaPg } from "@prisma/adapter-pg";
import { config } from "dotenv";

import { PrismaClient } from "../lib/generated/prisma/client";

import gapVocab from "./data/gap-vocab-merged.json";

// 常用漢字 2,136자 중 단어가 연결되지 않았던 2,055자를 위해 만든 대표 단어 1,981개를 심는다.
// 13개 배치(에이전트)가 각자 담당 한자마다 실제로 쓰이는 단어를 만들어 냈고, 이 스크립트는 그
// 결과(prisma/data/gap-vocab-merged.json, 중복 단어 제거 완료)를 Vocabulary/VocabularyMeaning/
// ExampleSentence로 심기만 한다. 한자-단어 연결은 여기서 하지 않고, 항상
// prisma/backfill-vocabulary-kanji.ts가 word 원문을 스캔해 별도로 만든다(같은 이유:
// 스크립트 재실행 시 항상 같은 결과가 나오도록).
config({ path: ".env" });
config({ path: ".env.local", override: true });

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const db = new PrismaClient({ adapter });

type GapVocabEntry = {
  kanji: string;
  word: string;
  reading: string;
  part_of_speech: string;
  jlpt_level: "N5" | "N4" | "N3" | "N2" | "N1" | null;
  meaning_ko: string;
  example_ja: string;
  example_ko: string;
};

const entries = gapVocab as GapVocabEntry[];

async function main() {
  const existing = await db.vocabulary.findMany({ select: { word: true, reading: true } });
  const existingKeys = new Set(existing.map((v) => `${v.word}${v.reading}`));

  let created = 0;
  let skipped = 0;

  for (const entry of entries) {
    const key = `${entry.word}${entry.reading}`;
    if (existingKeys.has(key)) {
      skipped += 1;
      continue;
    }
    existingKeys.add(key);

    await db.vocabulary.create({
      data: {
        word: entry.word,
        reading: entry.reading,
        part_of_speech: entry.part_of_speech,
        jlpt_level: entry.jlpt_level ?? undefined,
        meanings: { create: [{ meaning: entry.meaning_ko }] },
        examples: {
          create: [
            { japanese: entry.example_ja, korean: entry.example_ko, source: "seed-gap-vocab" },
          ],
        },
      },
    });
    created += 1;
  }

  console.log(
    `Seed complete: created ${created} vocabulary entries, skipped ${skipped} already-existing.`,
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
