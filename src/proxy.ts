import { NextResponse, type NextRequest } from "next/server";

/**
 * Proxy (Next.js 16, thay cho middleware):
 *  - Nhận diện tenant theo Host => rewrite trang public sang /s/<tenantKey>/...
 *  - Gắn header x-tenant-key cho API (đăng nhập, đặt chỗ public)
 *  - Chặn /admin khi chưa đăng nhập (xác thực JWT thật sự nằm ở API)
 */
const DEFAULT_TENANT = process.env.DEFAULT_TENANT || "dulich_demo";
const ROOT_DOMAIN = process.env.ROOT_DOMAIN || "dklab.vn";

function tenantKey(req: NextRequest): string {
  // Cho phép xem thử tenant khác trên domain demo: ?tenant=slug (lưu cookie)
  const fromQuery = req.nextUrl.searchParams.get("tenant");
  const fromCookie = req.cookies.get("dk_tenant")?.value;
  const host = (req.headers.get("host") ?? "").toLowerCase().split(":")[0];
  const isShared = !host || host === "localhost" || host.endsWith(".vercel.app") || /^\d+\.\d+\.\d+\.\d+$/.test(host) || host === ROOT_DOMAIN || host === `www.${ROOT_DOMAIN}`;
  if (isShared) return fromQuery || fromCookie || DEFAULT_TENANT;
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
    if (q && /^[a-z0-9_-]{2,50}$/.test(q)) res.cookies.set("dk_tenant", q, { path: "/", sameSite: "lax", maxAge: 60 * 60 * 24 * 30 });
    return res;
  };

  if (pathname.startsWith("/api/")) return NextResponse.next({ request: { headers } });

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
