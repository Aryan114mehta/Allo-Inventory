
import "dotenv/config";
import { defineConfig } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
    seed: "npm run db:seed",
  },
  datasource: {
    url: process.env["DATABASE_URL"]!,
    // directUrl bypasses PgBouncer for migrations (needed for Supabase)
    ...(process.env["DIRECT_URL"] ? { directUrl: process.env["DIRECT_URL"] } : {}),
  },
});
