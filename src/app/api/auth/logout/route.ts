import { NextResponse } from "next/server";
import { clearSessionCookieHeader } from "@/lib/auth";

/** POST -> session cookie'yi temizle */
export async function POST() {
  const res = NextResponse.json({ success: true });
  res.headers.set("Set-Cookie", clearSessionCookieHeader());
  return res;
}
