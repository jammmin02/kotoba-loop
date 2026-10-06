import { PrismaPg } from "@prisma/adapter-pg";
import { config } from "dotenv";

import { PrismaClient } from "../lib/generated/prisma/client";

// 독립 실행 스크립트라 prisma/seed.ts와 동일한 방식으로 env를 직접 로드한다.
config({ path: ".env" });
config({ path: ".env.local", override: true });

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const db = new PrismaClient({ adapter });

// 사용법: tsx prisma/set-admin-role.ts <email> [--revoke]
// 관리자 지정은 UI 없이 이 스크립트(또는 DB의 User.role 직접 수정)로만 한다.
const email = process.argv[2]?.trim().toLowerCase();
const revoke = process.argv.includes("--revoke");

async function main() {
  if (!email) {
    throw new Error("사용법: tsx prisma/set-admin-role.ts <email> [--revoke]");
  }

  const user = await db.user.findUnique({ where: { email } });
  if (!user) throw new Error(`해당 이메일의 계정이 없습니다: ${email}`);

  await db.user.update({
    where: { id: user.id },
    // 관리자는 로그인할 수 있어야 하므로 지정 시 승인 상태도 함께 맞춘다.
    data: revoke ? { role: "USER" } : { role: "ADMIN", status: "APPROVED" },
  });
  console.log(`${email} → role=${revoke ? "USER" : "ADMIN"}`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await db.$disconnect();
  });
