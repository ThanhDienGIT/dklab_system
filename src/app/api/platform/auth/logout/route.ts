import { NextResponse } from "next/server";
import { clearPlatformCookies } from "@/lib/auth/platform";

export async function POST() {
  const res = NextResponse.json({ ok: true, data: null });
  clearPlatformCookies(res);
  return res;
}
