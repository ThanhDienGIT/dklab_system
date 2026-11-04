import { z } from "zod";
import { audit, ok, parseBody, withAuth } from "@/lib/api";
import { schema } from "@/lib/db";
import { updateOwned } from "@/lib/services/crud";
import { optionalText } from "@/lib/validators";

const Body = z.object({ status: z.enum(["pending", "done"]), note: optionalText(1000) });

export const PATCH = withAuth<{ id: string }>("tax.manage", async (req, ctx, { id }) => {
  const b = await parseBody(req, Body);
  const row = await updateOwned(schema.taxTasks, id, ctx.tid, { status: b.status, note: b.note ?? null, doneAt: b.status === "done" ? new Date() : null });
  await audit(ctx, "tax.update", "tax_task", id, b);
  return ok(row);
});
