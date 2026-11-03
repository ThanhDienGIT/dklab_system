import { z } from "zod";
import { ApiError } from "../api";
import { ALL_PERMISSIONS } from "@/modules/registry";

export const RoleBody = z.object({
  name: z.string().trim().min(2, "Nhập tên vai trò").max(60),
  description: z.string().trim().max(200).optional().nullable(),
  permissions: z.array(z.string()).default([]),
});

export function validatePerms(perms: string[]) {
  const keys = new Set(ALL_PERMISSIONS.map((p) => p.key));
  for (const p of perms) {
    const [k, scope] = p.split(":");
    if (!keys.has(k) || (scope && !["own", "branch", "tenant"].includes(scope))) throw new ApiError(422, `Quyền không hợp lệ: ${p}`);
  }
}

