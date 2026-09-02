import { PrismaPg } from "@prisma/adapter-pg";
import bcrypt from "bcryptjs";
import { config } from "dotenv";

import { PrismaClient } from "../lib/generated/prisma/client";

// 독립 실행 스크립트라 prisma/seed.ts와 동일한 방식으로 env를 직접 로드한다.
config({ path: ".env" });
config({ path: ".env.local", override: true });

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const db = new PrismaClient({ adapter });

// 커뮤니티 공개 단어장(app/api/vocabulary-books/community)을 소유하기 위한 계정 —
// 별도 관리자 role은 스키마에 없으므로(User에 is_admin 같은 필드가 없음), 그냥
// 이 계정 소유의 단어장을 is_public: true로 만들어 다른 유저의 "탐색"에 노출시키는 방식이다.
const ADMIN_EMAIL = "admin@kotoba-loop.app";
const ADMIN_PASSWORD = process.argv[2];
const ADMIN_NICKNAME = "Kotoba Loop 운영진";

async function main() {
  if (!ADMIN_PASSWORD) {
    throw new Error("사용법: tsx prisma/seed-admin-account.ts <password>");
  }

  const password_hash = await bcrypt.hash(ADMIN_PASSWORD, 10);

  const existing = await db.user.findUnique({ where: { email: ADMIN_EMAIL } });
  if (existing) {
    // 쉘에서 비밀번호에 특수문자(예: &)가 들어가면 따옴표 없이 실행 시 잘려서 저장될 수 있어,
    // 재실행 시 비밀번호를 그냥 덮어쓰도록 한다(계정을 두 번 만들지 않기 위해 create는 안 함).
    await db.user.update({ where: { id: existing.id }, data: { password_hash } });
    console.log("기존 관리자 계정의 비밀번호를 갱신했습니다 (user id:", existing.id, ")");
    return;
  }

  const user = await db.user.create({
    data: {
      email: ADMIN_EMAIL,
      password_hash,
      nickname: ADMIN_NICKNAME,
      purpose: ["공식 단어장 관리"],
    },
  });

  console.log("관리자 계정 생성 완료");
  console.log("  user id:", user.id);
  console.log("  email:", ADMIN_EMAIL);
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await db.$disconnect();
  });
