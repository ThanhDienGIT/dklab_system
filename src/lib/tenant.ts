import "server-only";
import { and, eq, isNotNull } from "drizzle-orm";
import { cacheLife, cacheTag } from "next/cache";
import { db, schema } from "./db";
import { DEFAULT_TENANT, ROOT_DOMAIN } from "./env";

export type PublicTenant = {
  id: string;
  slug: string;
  name: string;
  industry: string;
  status: string;
  settings: schema.TenantSettings;
};

/**
 * Proxy chuyển Host thành "khóa tenant":
 *  - "<slug>"   : subdomain của ROOT_DOMAIN hoặc tenant mặc định
 *  - "~<host>"  : domain riêng của khách, tra bảng tenant_domains
 */
export function tenantKeyFromHost(rawHost: string | null): string {
  const host = (rawHost ?? "").toLowerCase().split(":")[0];
  if (!host || host === "localhost" || host.endsWith(".vercel.app") || /^\d+\.\d+\.\d+\.\d+$/.test(host)) {
    return DEFAULT_TENANT;
  }
  if (host === ROOT_DOMAIN || host === `www.${ROOT_DOMAIN}`) return DEFAULT_TENANT;
  return `~${host}`;
}

async function findTenant(key: string): Promise<PublicTenant | null> {
  const cols = {
    id: schema.tenants.id,
    slug: schema.tenants.slug,
    name: schema.tenants.name,
    industry: schema.tenants.industry,
    status: schema.tenants.status,
    settings: schema.tenants.settings,
  };
  if (key.startsWith("~")) {
    const host = key.slice(1);
    // Subdomain của nền tảng: CHỈ định tuyến theo slug (không tra bảng domain => không ai chiếm được)
    if (host.endsWith(`.${ROOT_DOMAIN}`)) {
      const sub = host.slice(0, -(ROOT_DOMAIN.length + 1));
      if (!/^[a-z0-9-]{1,63}$/.test(sub)) return null;
      return (await findTenant(sub)) ?? (await findTenant(sub.replace(/-/g, "_")));
    }
    // Domain riêng: chỉ khi đã xác minh sở hữu qua DNS TXT
    const [byDomain] = await db
      .select(cols)
      .from(schema.tenantDomains)
      .innerJoin(schema.tenants, eq(schema.tenants.id, schema.tenantDomains.tenantId))
      .where(and(eq(schema.tenantDomains.domain, host), isNotNull(schema.tenantDomains.verifiedAt)))
      .limit(1);
    return byDomain ?? null;
  }
  if (!/^[a-z0-9_-]{1,63}$/.test(key)) return null;
  const [t] = await db.select(cols).from(schema.tenants).where(eq(schema.tenants.slug, key)).limit(1);
  return t ?? null;
}

/** Dùng cho trang public: cache phía server, xóa cache bằng tag "tenant:<key>" / "tenants". */
export async function getTenantCached(key: string): Promise<PublicTenant | null> {
  "use cache";
  cacheLife("hours");
  cacheTag("tenants", `tenant:${key}`);
  return findTenant(decodeURIComponent(key));
}

/** Dùng trong API (không cache) */
export const getTenantFresh = (key: string) => findTenant(key);

/** Thông tin public an toàn để gửi ra trình duyệt (bỏ cấu hình MISA). */
export function publicSettings(s: schema.TenantSettings) {
  return { brand: s.brand ?? {}, contact: s.contact ?? {}, company: s.company ?? {} };
}
