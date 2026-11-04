import { defineConfig } from "drizzle-kit";
import { resolveDatabaseUrl } from "./src/lib/db/url";

export default defineConfig({
  schema: "./src/lib/db/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: { url: resolveDatabaseUrl() ?? "postgres://postgres:postgres@localhost:5432/dklab" },
});
