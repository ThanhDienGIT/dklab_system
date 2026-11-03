import { NextResponse, type NextRequest } from "next/server";
import { REFRESH_COOKIE } from "@/lib/auth/jwt";
import { clearAuthCookies, refresh, setAuthCookies } from "@/lib/auth/session";
import { fail } from "@/lib/api";

export async function POST(req: NextRequest) {
  try {
    let token = req.cookies.get(REFRESH_COOKIE)?.value;
    if (!token) {
      // App mobile/POS gửi refresh token trong body
      const body = await req.json().catch(() => null);
      token = body?.refreshToken;
    }
    if (!token) {
      const res = NextResponse.json({ ok: false, error: "Chưa đăng nhập" }, { status: 401 });
      clearAuthCookies(res);
      return res;
    }
    const r = await refresh(token);
    if (r.kind === "stale") return NextResponse.json({ ok: true, data: { retry: true } });
    if (r.kind === "invalid") {
      const res = NextResponse.json({ ok: false, error: "Phiên đăng nhập đã hết hạn" }, { status: 401 });
      clearAuthCookies(res);
      return res;
    }
    const res = NextResponse.json({ ok: true, data: { refreshed: true } });
    setAuthCookies(res, r.tokens);
    return res;
  } catch (e) {
    return fail(e);
  }
}
