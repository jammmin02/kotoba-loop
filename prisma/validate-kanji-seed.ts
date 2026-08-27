import { PrismaPg } from "@prisma/adapter-pg";
import { config } from "dotenv";

import { PrismaClient } from "../lib/generated/prisma/client";

import joyoKanji from "./data/joyo-kanji.json";

// 常用漢字 시드 데이터 무결성 검증(PROMPT 33 완료 조건) — 소스 JSON 자체의 구조 문제와,
// 실제로 DB에 반영된 상태(seed-kanji.ts 실행 후)를 모두 점검한다. CI나 배포 스크립트에서
// 시딩 직후 실행해 조용히 깨지는 것을 막는 용도다.
config({ path: ".env" });
config({ path: ".env.local", override: true });

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const db = new PrismaClient({ adapter });

type JoyoKanjiEntry = {
  character: string;
  onyomi: string[];
  kunyomi: string[];
  korean_reading: string;
  meaning: string;
  stroke_count: number;
  radical: string;
  school_grade: number | null;
  jlpt_level_ref: string | null;
};

function validateSourceJson(entries: JoyoKanjiEntry[]): string[] {
  const problems: string[] = [];

  if (entries.length !== 2136) {
    problems.push(`Expected 2136 entries, found ${entries.length}.`);
  }

  const seenChars = new Set<string>();
  for (const entry of entries) {
    if (seenChars.has(entry.character)) {
      problems.push(`Duplicate character in source data: ${entry.character}`);
    }
    seenChars.add(entry.character);

    if (entry.onyomi.length === 0 && entry.kunyomi.length === 0) {
      problems.push(`${entry.character}: missing both onyomi and kunyomi.`);
    }
    if (!entry.korean_reading) {
      problems.push(`${entry.character}: missing korean_reading.`);
    }
    if (!entry.meaning) {
      problems.push(`${entry.character}: missing meaning.`);
    }
    if (!entry.radical) {
      problems.push(`${entry.character}: missing radical.`);
    }
    if (!Number.isInteger(entry.stroke_count) || entry.stroke_count <= 0) {
      problems.push(`${entry.character}: invalid stroke_count (${entry.stroke_count}).`);
    }
  }

  return problems;
}

async function validateDbState(): Promise<string[]> {
  const problems: string[] = [];

  const total = await db.kanji.count();
  if (total !== 2136) {
    problems.push(`Expected 2136 rows in Kanji table, found ${total}.`);
  }

  const missingReadings = await db.kanji.findMany({
    where: { onyomi: { isEmpty: true }, kunyomi: { isEmpty: true } },
    select: { character: true },
  });
  if (missingReadings.length > 0) {
    problems.push(
      `${missingReadings.length} DB rows missing both onyomi and kunyomi: ${missingReadings
        .map((k) => k.character)
        .join(", ")}`,
    );
  }

  return problems;
}

async function main() {
  const sourceProblems = validateSourceJson(joyoKanji as JoyoKanjiEntry[]);
  const dbProblems = await validateDbState();
  const problems = [...sourceProblems, ...dbProblems];

  if (problems.length > 0) {
    console.error(`Validation failed with ${problems.length} problem(s):`);
    for (const problem of problems) console.error(` - ${problem}`);
    process.exitCode = 1;
    return;
  }

  console.log(
    "Validation passed: 2,136 Joyo kanji present in source data and DB, all readings populated.",
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
