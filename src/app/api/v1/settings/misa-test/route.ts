import { eq } from "drizzle-orm";
import { ok, withAuth } from "@/lib/api";
import { db, schema } from "@/lib/db";
import { misaTestConnection } from "@/lib/einvoice/misa";

export const POST = withAuth("settings.manage", async (_req, ctx) => {
  const [t] = await db.select({ settings: schema.tenants.settings }).from(schema.tenants).where(eq(schema.tenants.id, ctx.tid));
  const cfg = t.settings.misa;
  if (!cfg) return ok({ ok: false, message: "Chưa cấu hình MISA" });
  return ok(await misaTestConnection(cfg));
});
