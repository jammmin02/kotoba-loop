import { createHash } from "node:crypto";

import { PrismaPg } from "@prisma/adapter-pg";
import { config } from "dotenv";

import { PrismaClient } from "../lib/generated/prisma/client";

// This script can run standalone (`npm run db:seed`) as well as via `prisma db seed`,
// so it loads env vars itself the same way `prisma.config.ts` does.
config({ path: ".env" });
config({ path: ".env.local", override: true });

// Seed scripts run as a standalone process (outside Next.js), so they get their
// own PrismaClient instance instead of importing the app's `lib/db.ts` singleton.
const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const db = new PrismaClient({ adapter });

function fakePasswordHash(plain: string): string {
  return createHash("sha256").update(plain).digest("hex");
}

async function main() {
  const user = await db.user.upsert({
    where: { email: "seed-user@example.com" },
    update: {},
    create: {
      email: "seed-user@example.com",
      password_hash: fakePasswordHash("seed-only-password"),
      nickname: "시드유저",
      jlpt_level: "N3",
      target_jlpt: "N2",
      daily_word_target: 10,
      daily_study_time: 20,
      purpose: ["JLPT 대비", "여행 회화"],
    },
  });

  const book = await db.vocabularyBook.create({
    data: {
      user_id: user.id,
      name: "기본 단어장",
      description: "시드 스크립트로 생성된 더미 단어장",
      is_public: false,
    },
  });

  const vocabulary = await db.vocabulary.create({
    data: {
      word: "見逃す",
      reading: "みのがす",
      part_of_speech: "동사",
      jlpt_level: "N3",
      difficulty: 3,
      meanings: {
        create: [{ meaning: "놓치다, 못 보고 넘어가다" }],
      },
      examples: {
        create: [
          {
            japanese: "彼のミスを見逃すわけにはいかない。",
            korean: "그의 실수를 눈감아 줄 수는 없다.",
            source: "seed",
          },
        ],
      },
      images: {
        create: [{ image_url: "https://example.com/seed/mem.jpg", image_type: "situation" }],
      },
    },
  });

  await db.vocabularyBookItem.upsert({
    where: {
      vocabulary_book_id_vocabulary_id: {
        vocabulary_book_id: book.id,
        vocabulary_id: vocabulary.id,
      },
    },
    update: {},
    create: {
      vocabulary_book_id: book.id,
      vocabulary_id: vocabulary.id,
    },
  });

  await db.userVocabulary.upsert({
    where: {
      user_id_vocabulary_id: {
        user_id: user.id,
        vocabulary_id: vocabulary.id,
      },
    },
    update: {},
    create: {
      user_id: user.id,
      vocabulary_id: vocabulary.id,
      learning_status: "LEARNING",
      is_favorite: true,
      interval_stage: 1,
      correct_count: 2,
      wrong_count: 1,
    },
  });

  await db.reviewHistory.create({
    data: {
      user_id: user.id,
      target_type: "vocab",
      target_id: vocabulary.id,
      quiz_type: "meaning_choice",
      result: true,
      response_time: 2400,
    },
  });

  const tag = await db.tag.upsert({
    where: { user_id_name: { user_id: user.id, name: "여행" } },
    update: {},
    create: { user_id: user.id, name: "여행" },
  });

  await db.vocabularyTag.upsert({
    where: {
      vocabulary_id_tag_id: {
        vocabulary_id: vocabulary.id,
        tag_id: tag.id,
      },
    },
    update: {},
    create: {
      vocabulary_id: vocabulary.id,
      tag_id: tag.id,
    },
  });

  await db.aIAnalysis.create({
    data: {
      user_id: user.id,
      analysis_type: "vocabulary_extraction",
      input_ref: vocabulary.id,
      result_json: { word: "見逃す", confidence: 0.92 },
      status: "confirmed",
    },
  });

  console.log("Seed complete:", { user: user.email, vocabulary: vocabulary.word });
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await db.$disconnect();
  });
