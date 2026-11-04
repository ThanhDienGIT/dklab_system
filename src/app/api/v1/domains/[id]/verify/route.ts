import { resolveTxt } from "node:dns/promises";
import { and, eq } from "drizzle-orm";
import { ApiError, audit, ok, withAuth } from "@/lib/api";
import { db, schema } from "@/lib/db";
import { invalidateTenant } from "@/lib/services/cache";

const D = schema.tenantDomains;

/** Xác minh sở hữu domain: tra bản ghi TXT _dklab-verify.<domain> = dklab-verify=<token> */
export const POST = withAuth<{ id: string }>("settings.manage", async (_req, ctx, { id }) => {
  const [d] = await db.select().from(D).where(and(eq(D.id, id), eq(D.tenantId, ctx.tid)));
  if (!d) throw new ApiError(404, "Không tìm thấy tên miền");
  if (d.verifiedAt) return ok({ verified: true });
  let records: string[] = [];
  try {
    records = (await resolveTxt(`_dklab-verify.${d.domain}`)).map((r) => r.join(""));
  } catch {
    records = [];
  }
  if (!records.includes(`dklab-verify=${d.verifyToken}`))
    throw new ApiError(422, `Chưa thấy bản ghi TXT _dklab-verify.${d.domain} = dklab-verify=${d.verifyToken}. DNS có thể mất vài phút để cập nhật.`);
  await db.update(D).set({ verifiedAt: new Date() }).where(eq(D.id, id));
  invalidateTenant();
  await audit(ctx, "domain.verify", "domain", id, { domain: d.domain });
  return ok({ verified: true });
}, { module: "custom_domain" });
