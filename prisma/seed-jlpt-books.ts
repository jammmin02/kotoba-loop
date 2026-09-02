import { PrismaPg } from "@prisma/adapter-pg";
import { config } from "dotenv";

import { PrismaClient } from "../lib/generated/prisma/client";

import n1Words from "./data/jlpt-books/n1.json";
import n2Words from "./data/jlpt-books/n2.json";
import n3Words from "./data/jlpt-books/n3.json";
import n4Words from "./data/jlpt-books/n4.json";
import n5Words from "./data/jlpt-books/n5.json";

// 커뮤니티 탐색(PROMPT 58)에 노출할 공식 JLPT 필수단어장 — prisma/seed-admin-account.ts로 만든
// 관리자 계정(admin@kotoba-loop.app) 소유로, is_public: true인 5개 단어장(N5~N1)을 만든다.
// 단어 원본은 오픈소스 JLPT 단어 목록(elzup/jlpt-word-list, MIT license, tanos.co.uk 기반)의
// 표제어/읽기만 가져오고, 한국어 뜻/품사/예문은 이 저장소에서 새로 작성했다.
// prisma/seed-gap-vocab.ts와 같은 이유로 word+reading 조합이 이미 있으면 재사용하고(중복
// Vocabulary 생성 방지), 스크립트를 다시 돌려도 항상 같은 결과가 나오게 한다(idempotent).
config({ path: ".env" });
config({ path: ".env.local", override: true });

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const db = new PrismaClient({ adapter });

const ADMIN_EMAIL = "admin@kotoba-loop.app";

type JlptLevel = "N5" | "N4" | "N3" | "N2" | "N1";

type JlptWordEntry = {
  word: string;
  reading: string;
  part_of_speech: string;
  jlpt_level: JlptLevel;
  meaning_ko: string;
  example_ja: string;
  example_ko: string;
};

const BOOKS: { level: JlptLevel; name: string; description: string; words: JlptWordEntry[] }[] = [
  {
    level: "N5",
    name: "JLPT N5 필수단어",
    description: "JLPT N5 합격을 위한 필수단어 전체 목록.",
    words: n5Words as JlptWordEntry[],
  },
  {
    level: "N4",
    name: "JLPT N4 필수단어",
    description: "JLPT N4 합격을 위한 필수단어 전체 목록.",
    words: n4Words as JlptWordEntry[],
  },
  {
    level: "N3",
    name: "JLPT N3 필수단어",
    description: "JLPT N3 합격을 위한 필수단어 전체 목록.",
    words: n3Words as JlptWordEntry[],
  },
  {
    level: "N2",
    name: "JLPT N2 필수단어",
    description: "JLPT N2 합격을 위한 필수단어 전체 목록.",
    words: n2Words as JlptWordEntry[],
  },
  {
    level: "N1",
    name: "JLPT N1 필수단어",
    description: "JLPT N1 합격을 위한 필수단어 전체 목록.",
    words: n1Words as JlptWordEntry[],
  },
];

async function seedBook(adminId: string, book: (typeof BOOKS)[number]) {
  let vocabularyBook = await db.vocabularyBook.findFirst({
    where: { user_id: adminId, name: book.name },
  });
  if (!vocabularyBook) {
    vocabularyBook = await db.vocabularyBook.create({
      data: { user_id: adminId, name: book.name, description: book.description, is_public: true },
    });
  }

  const existing = await db.vocabulary.findMany({
    select: { id: true, word: true, reading: true },
  });
  const existingIdByKey = new Map(existing.map((v) => [`${v.word}${v.reading}`, v.id]));

  const existingItems = await db.vocabularyBookItem.findMany({
    where: { vocabulary_book_id: vocabularyBook.id },
    select: { vocabulary_id: true },
  });
  const linkedVocabIds = new Set(existingItems.map((i) => i.vocabulary_id));

  let created = 0;
  let reused = 0;
  let linked = 0;
  let alreadyLinked = 0;

  for (const entry of book.words) {
    const key = `${entry.word}${entry.reading}`;
    let vocabularyId = existingIdByKey.get(key);

    if (vocabularyId) {
      reused += 1;
    } else {
      const vocabulary = await db.vocabulary.create({
        data: {
          word: entry.word,
          reading: entry.reading,
          part_of_speech: entry.part_of_speech,
          jlpt_level: entry.jlpt_level,
          meanings: { create: [{ meaning: entry.meaning_ko }] },
          examples: {
            create: [
              { japanese: entry.example_ja, korean: entry.example_ko, source: "seed-jlpt-books" },
            ],
          },
        },
      });
      vocabularyId = vocabulary.id;
      existingIdByKey.set(key, vocabularyId);
      created += 1;
    }

    if (linkedVocabIds.has(vocabularyId)) {
      alreadyLinked += 1;
      continue;
    }
    await db.vocabularyBookItem.create({
      data: { vocabulary_book_id: vocabularyBook.id, vocabulary_id: vocabularyId },
    });
    linkedVocabIds.add(vocabularyId);
    linked += 1;
  }

  console.log(
    `${book.name}: vocabulary created ${created}, reused ${reused}; book items linked ${linked}, already linked ${alreadyLinked} (book id: ${vocabularyBook.id})`,
  );
}

async function main() {
  const admin = await db.user.findUnique({ where: { email: ADMIN_EMAIL } });
  if (!admin) {
    throw new Error(
      `관리자 계정(${ADMIN_EMAIL})이 없습니다. 먼저 prisma/seed-admin-account.ts를 실행하세요.`,
    );
  }

  for (const book of BOOKS) {
    await seedBook(admin.id, book);
  }
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await db.$disconnect();
  });
