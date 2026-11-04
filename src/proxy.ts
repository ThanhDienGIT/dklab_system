import { NextResponse, type NextRequest } from "next/server";

/**
 * Proxy (Next.js 16, thay cho middleware):
 *  - Nhận diện tenant theo Host => rewrite trang public sang /s/<tenantKey>/...
 *  - Gắn header x-tenant-key cho API (đăng nhập, đặt chỗ public)
 *  - Chặn /admin khi chưa đăng nhập (xác thực JWT thật sự nằm ở API)
 */
const DEFAULT_TENANT = process.env.DEFAULT_TENANT || "dulich_demo";
const ROOT_DOMAIN = process.env.ROOT_DOMAIN || "dklab.vn";
/** Chỉ bản demo mới cho đổi tenant bằng ?tenant= trên domain dùng chung */
const DEMO_MODE = process.env.DEMO_MODE === "1";
const SAFE_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);

/**
 * Chống CSRF cho API dùng cookie: request ghi (POST/PATCH/DELETE…) phải có Origin trùng Host.
 * - Origin khác host => 403 (kể cả subdomain cùng ROOT_DOMAIN, vì SameSite coi chúng là "cùng site")
 * - Không có Origin: chỉ chấp nhận khi KHÔNG mang cookie đăng nhập (app mobile / server gọi bằng Bearer)
 */
function csrfBlocked(req: NextRequest): boolean {
  if (SAFE_METHODS.has(req.method)) return false;
  const host = req.headers.get("host");
  const origin = req.headers.get("origin");
  if (origin) {
    try {
      return new URL(origin).host !== host;
    } catch {
      return true;
    }
  }
  const hasAuthCookie = req.cookies.has("dk_at") || req.cookies.has("dk_rt");
  return hasAuthCookie && !req.headers.get("authorization");
}

function tenantKey(req: NextRequest): string {
  // Cho phép xem thử tenant khác trên domain demo: ?tenant=slug (lưu cookie)
  const fromQuery = req.nextUrl.searchParams.get("tenant");
  const fromCookie = req.cookies.get("dk_tenant")?.value;
  const host = (req.headers.get("host") ?? "").toLowerCase().split(":")[0];
  const isShared = !host || host === "localhost" || host.endsWith(".vercel.app") || /^\d+\.\d+\.\d+\.\d+$/.test(host) || host === ROOT_DOMAIN || host === `www.${ROOT_DOMAIN}`;
  if (isShared) return (DEMO_MODE && (fromQuery || fromCookie)) || DEFAULT_TENANT;
  return `~${host}`;
}

const PASS_THROUGH = /^\/(_next|s\/|pay\/|favicon|robots|sitemap|.*\.[a-z0-9]+$)/i;

export function proxy(req: NextRequest) {
  const { pathname, searchParams } = req.nextUrl;
  const key = tenantKey(req);
  const headers = new Headers(req.headers);
  headers.set("x-tenant-key", key);

  const remember = (res: NextResponse) => {
    const q = searchParams.get("tenant");
    if (DEMO_MODE && q && /^[a-z0-9_-]{2,50}$/.test(q)) res.cookies.set("dk_tenant", q, { path: "/", sameSite: "lax", maxAge: 60 * 60 * 24 * 30 });
    return res;
  };

  if (pathname.startsWith("/api/")) {
    if (csrfBlocked(req)) return NextResponse.json({ ok: false, error: "Yêu cầu không hợp lệ (CSRF)" }, { status: 403 });
    return NextResponse.next({ request: { headers } });
  }

  // Trang quản trị nền tảng: tách riêng, bắt buộc đăng nhập Super Admin
  if (pathname === "/superdklab" || pathname.startsWith("/superdklab/")) {
    if (pathname !== "/superdklab/login" && !req.cookies.get("dk_pli")) {
      const url = req.nextUrl.clone();
      url.pathname = "/superdklab/login";
      url.search = "";
      return NextResponse.redirect(url);
    }
    const res = NextResponse.next({ request: { headers } });
    res.headers.set("X-Robots-Tag", "noindex, nofollow");
    return res;
  }

  if (pathname === "/admin" || pathname.startsWith("/admin/")) {
    if (!req.cookies.get("dk_li")) {
      const url = req.nextUrl.clone();
      url.pathname = "/login";
      url.search = `?next=${encodeURIComponent(pathname)}`;
      return NextResponse.redirect(url);
    }
    return NextResponse.next({ request: { headers } });
  }

  if (pathname === "/login" || PASS_THROUGH.test(pathname)) return remember(NextResponse.next({ request: { headers } }));

  // Trang public của tenant
  const url = req.nextUrl.clone();
  url.pathname = `/s/${encodeURIComponent(key)}${pathname === "/" ? "" : pathname}`;
  url.searchParams.delete("tenant");
  return remember(NextResponse.rewrite(url, { request: { headers } }));
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
