import { config } from "dotenv";
import { defineConfig } from "prisma/config";

// Mirror Next.js's own env layering so the Prisma CLI reads the same
// DATABASE_URL as the app: `.env` first, then `.env.local` overrides it.
config({ path: ".env" });
config({ path: ".env.local", override: true });

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
    seed: "tsx prisma/seed.ts",
  },
  datasource: {
    url: process.env["DATABASE_URL"],
  },
});
