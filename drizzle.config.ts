import { config } from "dotenv";
import { defineConfig } from "drizzle-kit";

// Migrations run from a developer machine or CI, never from the Worker, so
// reading .env.local here is safe and keeps DATABASE_URL out of the bundle.
config({ path: ".env.local" });

export default defineConfig({
  schema: "./src/db/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
  strict: true,
  verbose: true,
});
