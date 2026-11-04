import { eq } from "drizzle-orm";
import { z } from "zod";
import { ApiError, ok, parseBody } from "@/lib/api";
import { platformAudit, withPlatform } from "@/lib/auth/platform";
import { db, schema } from "@/lib/db";
import { invalidateTenant } from "@/lib/services/cache";

const D = schema.tenantDomains;
const Body = z.object({ verified: z.boolean() });

/** Super Admin xác minh thủ công (đã kiểm tra quyền sở hữu ngoài hệ thống) hoặc thu hồi xác minh */
export const PATCH = withPlatform<{ id: string }>(async (req, ctx, { id }) => {
  const b = await parseBody(req, Body);
  const [d] = await db.update(D).set({ verifiedAt: b.verified ? new Date() : null }).where(eq(D.id, id)).returning();
  if (!d) throw new ApiError(404, "Không tìm thấy tên miền");
  invalidateTenant();
  await platformAudit(ctx, b.verified ? "domain.verify" : "domain.unverify", d.tenantId, { domain: d.domain });
  return ok(d);
});

export const DELETE = withPlatform<{ id: string }>(async (_req, ctx, { id }) => {
  const [d] = await db.delete(D).where(eq(D.id, id)).returning();
  if (!d) throw new ApiError(404, "Không tìm thấy tên miền");
  invalidateTenant();
  await platformAudit(ctx, "domain.delete", d.tenantId, { domain: d.domain });
  return ok({ id });
});
