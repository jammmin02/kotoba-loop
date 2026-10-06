import { randomInt } from "node:crypto";

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
// 이 계정은 role=ADMIN, status=APPROVED로 만들어진다(관리자 페이지 접근용). 다른 계정을 관리자로
// 지정하려면 prisma/set-admin-role.ts <email> 을 쓴다.
//
// 사용법: tsx prisma/seed-admin-account.ts
// 이메일은 고정이고, 실행할 때마다 새 비밀번호를 무작위로 만들어 한 번만 출력한다(다시 볼 수 없으니
// 바로 기록해 둘 것). 쉘 특수문자 문제가 없도록 영문 대소문자와 숫자만 쓴다.
const ADMIN_EMAIL = "admin@kotoba-loop.app";
const ADMIN_NICKNAME = "Kotoba Loop 운영진";
const PASSWORD_LENGTH = 20;
const PASSWORD_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789";

function generatePassword(): string {
  // randomInt는 모듈로 편향 없이 균등하게 뽑는다.
  return Array.from(
    { length: PASSWORD_LENGTH },
    () => PASSWORD_ALPHABET[randomInt(PASSWORD_ALPHABET.length)],
  ).join("");
}

function printCredentials(password: string) {
  console.log("  email:   ", ADMIN_EMAIL);
  console.log("  password:", password);
  console.log("비밀번호는 지금만 확인할 수 있습니다. 바로 안전한 곳에 기록하세요.");
}

async function main() {
  const password = generatePassword();
  const password_hash = await bcrypt.hash(password, 10);

  const existing = await db.user.findUnique({ where: { email: ADMIN_EMAIL } });
  if (existing) {
    // 재실행하면 비밀번호만 새로 덮어쓴다(계정을 두 번 만들지 않기 위해 create는 안 함).
    await db.user.update({
      where: { id: existing.id },
      data: { password_hash, role: "ADMIN", status: "APPROVED" },
    });
    console.log("기존 관리자 계정의 비밀번호를 갱신했습니다 (user id:", existing.id, ")");
    printCredentials(password);
    return;
  }

  const user = await db.user.create({
    data: {
      email: ADMIN_EMAIL,
      password_hash,
      nickname: ADMIN_NICKNAME,
      purpose: ["공식 단어장 관리"],
      role: "ADMIN",
      status: "APPROVED",
    },
  });

  console.log("관리자 계정 생성 완료");
  console.log("  user id:", user.id);
  printCredentials(password);
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await db.$disconnect();
  });
