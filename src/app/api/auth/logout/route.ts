import { NextResponse, type NextRequest } from "next/server";
import { REFRESH_COOKIE } from "@/lib/auth/jwt";
import { clearAuthCookies, revokeByRefresh } from "@/lib/auth/session";

export async function POST(req: NextRequest) {
  const token = req.cookies.get(REFRESH_COOKIE)?.value;
  if (token) await revokeByRefresh(token).catch(() => {});
  const res = NextResponse.json({ ok: true, data: null });
  clearAuthCookies(res);
  return res;
}
