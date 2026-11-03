import { ApiError, ok, withAuth } from "@/lib/api";
import { loadInvoice } from "@/lib/services/invoices";

export const GET = withAuth<{ id: string }>("invoice.view", async (_req, ctx, { id }) => {
  const inv = await loadInvoice({ id, tenantId: ctx.tid });
  if (!inv) throw new ApiError(404, "Không tìm thấy hóa đơn");
  return ok(inv);
});
