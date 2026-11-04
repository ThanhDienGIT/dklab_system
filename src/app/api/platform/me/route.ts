import { ok } from "@/lib/api";
import { withPlatform } from "@/lib/auth/platform";

export const GET = withPlatform(async (_req, ctx) => ok({ id: ctx.sub, name: ctx.name, username: ctx.username }));
