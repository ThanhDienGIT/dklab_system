import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { audit, ok, parseBody, withAuth } from "@/lib/api";
import { db, schema } from "@/lib/db";
import { invalidateCatalog } from "@/lib/services/crud";

/** Lưu vị trí sơ đồ bàn sau khi kéo thả (chỉ cập nhật bàn thuộc tenant). */
const Body = z.object({ items: z.array(z.object({ id: z.uuid(), x: z.number().int().min(0).max(40), y: z.number().int().min(0).max(40) })).max(300) });

export const PUT = withAuth("resource.manage", async (req, ctx) => {
  const { items } = await parseBody(req, Body);
  await db.transaction(async (tx) => {
    for (const it of items)
      await tx.update(schema.resources).set({ x: it.x, y: it.y }).where(and(eq(schema.resources.id, it.id), eq(schema.resources.tenantId, ctx.tid)));
  });
  invalidateCatalog(ctx.tid);
  await audit(ctx, "resource.layout", "resource", null, { count: items.length });
  return ok({ saved: items.length });
});
