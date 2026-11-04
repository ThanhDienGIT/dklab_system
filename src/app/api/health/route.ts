import { hash } from "@node-rs/argon2";
import { connection } from "next/server";
import { db } from "@/lib/db";
import { sql } from "drizzle-orm";
import { dbEnvNames, resolveDatabaseUrl } from "@/lib/db/url";

/**
 * Tự chẩn đoán cấu hình khi deploy (Vercel / VPS).
 * Chỉ trả về đúng/sai + hướng dẫn, KHÔNG trả về giá trị biến môi trường.
 */
type Check = { name: string; ok: boolean; hint?: string };

export async function GET() {
  await connection();
  const checks: Check[] = [];
  const add = (name: string, ok: boolean, hint?: string) => checks.push({ name, ok, ...(ok ? {} : { hint }) });

  const secret = process.env.APP_SECRET ?? "";
  add("APP_SECRET", secret.length >= 32 && !/change-me/i.test(secret), "Thêm biến APP_SECRET (chuỗi ngẫu nhiên ≥ 32 ký tự) trong Settings → Environment Variables rồi Redeploy");

  const hasDbUrl = !!resolveDatabaseUrl();
  const names = dbEnvNames();
  add(
    "DATABASE_URL",
    hasDbUrl,
    `Môi trường hiện tại (${process.env.VERCEL_ENV ?? "?"}) chưa có chuỗi kết nối DB. ` +
      (names.length ? `Biến DB đang có: ${names.join(", ")}.` : "Không có biến DB nào: Storage → Neon → Connect, tick đủ Production + Preview, rồi Redeploy."),
  );

  let dbOk = false;
  if (hasDbUrl) {
    try {
      await db.execute(sql`select 1`);
      dbOk = true;
    } catch (e) {
      console.error("[health] db", e);
    }
    add("Kết nối database", dbOk, "Không kết nối được DB: kiểm tra DATABASE_URL (dùng chuỗi pooled của Neon, có ?sslmode=require)");
  }

  if (dbOk) {
    const [{ t }] = (await db.execute(sql`select to_regclass('public.tenants') is not null as t`)) as unknown as { t: boolean }[];
    add("Bảng dữ liệu (migration)", t, "Chưa có bảng: DB được gắn sau lần build. Vào Deployments → Redeploy (bỏ chọn 'Use existing Build Cache') để chạy migrate + seed");
    if (t) {
      const slug = process.env.DEFAULT_TENANT || "dulich_demo";
      const [{ n }] = (await db.execute(sql`select count(*)::int as n from users u join tenants t on t.id = u.tenant_id where t.slug = ${slug}`)) as unknown as { n: number }[];
      add(`Dữ liệu demo (tenant ${slug})`, n > 0, "Chưa có tài khoản: Redeploy để seed, hoặc chạy 'npm run db:migrate' với DATABASE_URL của Neon");
    }
  }

  try {
    await hash("health-check", { memoryCost: 1024, timeCost: 1, parallelism: 1 });
    add("Thư viện mã hóa mật khẩu (argon2)", true);
  } catch (e) {
    console.error("[health] argon2", e);
    add("Thư viện mã hóa mật khẩu (argon2)", false, "@node-rs/argon2 không chạy được trên môi trường này");
  }

  const ok = checks.every((c) => c.ok);
  return Response.json({ ok, checks }, { status: ok ? 200 : 503, headers: { "Cache-Control": "no-store" } });
}
