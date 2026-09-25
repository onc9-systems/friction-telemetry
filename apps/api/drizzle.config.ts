import { defineConfig } from "drizzle-kit";

// Migrations run against the Neon direct URL only (never the -pooler host), passed on the command line:
// DATABASE_URL_UNPOOLED=... bun run db:migrate
export default defineConfig({
  dialect: "postgresql",
  schema: "./src/db/schema.ts",
  out: "./drizzle",
  dbCredentials: { url: process.env.DATABASE_URL_UNPOOLED ?? "" },
  strict: true,
});
