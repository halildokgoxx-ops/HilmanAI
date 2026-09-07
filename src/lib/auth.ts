import crypto from "crypto";
import { NextRequest, NextResponse } from "next/server";

/**
 * HilmanAI Auth — Google Identity Services (GIS) + HMAC imzalı session cookie.
 *
 * Akış:
 *  1. Kullanıcı login ekranındaki resmi Google butonuna basar (GIS JS kütüphanesi).
 *  2. Google, imzalı bir ID Token (JWT) üretir.
 *  3. Frontend token'ı POST /api/auth/google ile backende gönderir.
 *  4. Backend token'ı Google'a doğrulatır (tokeninfo), kullanıcıyı storage'a
 *     kaydeder ve httpOnly `hilman_session` cookie'si basar.
 *  5. Sonraki isteklerde cookie HMAC ile doğrulanır. Ek bağımlılık yok.
 */

export interface SessionUser {
  email: string;
  name: string;
  picture?: string | null;
  isAdmin: boolean;
  exp: number; // epoch ms
}

const SESSION_COOKIE = "hilman_session";
const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 gün

export function getAdminEmail(): string {
  return (process.env.ADMIN_EMAIL || "halildokgox@gmail.com").trim().toLowerCase();
}

export function isAdminEmail(email: string): boolean {
  return email.trim().toLowerCase() === getAdminEmail();
}

export function getGoogleClientId(): string {
  return (process.env.GOOGLE_CLIENT_ID || "").trim();
}

function getAuthSecret(): string {
  const s = (process.env.AUTH_SECRET || "").trim();
  if (s && s.length >= 16) return s;
  // Yalnızca yerel geliştirme kolaylığı — production'da mutlaka AUTH_SECRET verilmeli.
  if (process.env.NODE_ENV === "production") {
    throw new Error("AUTH_SECRET ortam değişkeni zorunludur.");
  }
  console.warn("[auth] AUTH_SECRET tanımlı değil, geçici geliştirme anahtarı kullanılıyor.");
  return "hilman-dev-secret-change-me";
}

function b64urlEncode(buf: Buffer): string {
  return buf.toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function b64urlDecode(s: string): Buffer {
  const padded = s.replace(/-/g, "+").replace(/_/g, "/");
  return Buffer.from(padded, "base64");
}

/** Session payload'unu imzala -> cookie değeri */
export function signSession(user: Omit<SessionUser, "exp" | "isAdmin"> & { isAdmin?: boolean }): string {
  const payload: SessionUser = {
    email: user.email.trim().toLowerCase(),
    name: user.name,
    picture: user.picture || null,
    isAdmin: user.isAdmin ?? isAdminEmail(user.email),
    exp: Date.now() + SESSION_TTL_MS,
  };
  const body = b64urlEncode(Buffer.from(JSON.stringify(payload), "utf-8"));
  const sig = b64urlEncode(
    crypto.createHmac("sha256", getAuthSecret()).update(body).digest()
  );
  return `${body}.${sig}`;
}

/** Cookie değerini doğrula -> kullanıcı veya null */
export function verifySessionCookie(cookieValue: string | null | undefined): SessionUser | null {
  if (!cookieValue) return null;
  const parts = cookieValue.split(".");
  if (parts.length !== 2) return null;
  const [body, sig] = parts;
  let expected: string;
  try {
    expected = b64urlEncode(crypto.createHmac("sha256", getAuthSecret()).update(body).digest());
  } catch {
    return null;
  }
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;
  try {
    const payload = JSON.parse(b64urlDecode(body).toString("utf-8")) as SessionUser;
    if (!payload.email || !payload.exp || payload.exp < Date.now()) return null;
    return {
      ...payload,
      email: payload.email.trim().toLowerCase(),
      isAdmin: isAdminEmail(payload.email),
    };
  } catch {
    return null;
  }
}

function parseCookies(header: string | null): Record<string, string> {
  const out: Record<string, string> = {};
  if (!header) return out;
  for (const part of header.split(";")) {
    const idx = part.indexOf("=");
    if (idx === -1) continue;
    const k = part.slice(0, idx).trim();
    const v = part.slice(idx + 1).trim();
    if (k) out[k] = decodeURIComponent(v);
  }
  return out;
}

/** Request'ten oturum kullanıcısını çıkar (yoksa null) */
export function getSessionUser(req: NextRequest | Request): SessionUser | null {
  const header = req.headers.get("cookie");
  const cookies = parseCookies(header);
  return verifySessionCookie(cookies[SESSION_COOKIE]);
}

export function sessionCookieHeader(signed: string): string {
  const secure = process.env.NODE_ENV === "production" ? "; Secure" : "";
  const maxAge = Math.floor(SESSION_TTL_MS / 1000);
  return `${SESSION_COOKIE}=${encodeURIComponent(signed)}; Path=/; HttpOnly; SameSite=Lax${secure}; Max-Age=${maxAge}`;
}

export function clearSessionCookieHeader(): string {
  return `${SESSION_COOKIE}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0`;
}

export interface GoogleIdInfo {
  email: string;
  name: string;
  picture?: string;
  emailVerified: boolean;
}

/**
 * Google ID Token'ı Google'a doğrulat.
 * Ek kütüphanesiz en güvenilir yöntem: oauth2.googleapis.com/tokeninfo
 */
export async function verifyGoogleIdToken(idToken: string): Promise<GoogleIdInfo> {
  const clientId = getGoogleClientId();
  if (!clientId) {
    throw new Error("GOOGLE_CLIENT_ID tanımlı değil. Kurulum için README'deki adımları izleyin.");
  }
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 10000);
  try {
    const resp = await fetch(
      `https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(idToken)}`,
      { signal: controller.signal }
    );
    if (!resp.ok) {
      throw new Error("Google kimliği doğrulanamadı (token geçersiz veya süresi dolmuş).");
    }
    const data = await resp.json();
    if (data.aud !== clientId) {
      throw new Error("Google kimliği bu uygulamaya ait değil (audience uyuşmazlığı).");
    }
    const expSec = Number(data.exp || 0);
    if (!expSec || expSec * 1000 < Date.now()) {
      throw new Error("Google oturumunun süresi dolmuş. Tekrar giriş yapın.");
    }
    const email = String(data.email || "").trim().toLowerCase();
    if (!email) throw new Error("Google hesabından e-posta alınamadı.");
    if (data.email_verified !== "true" && data.email_verified !== true) {
      throw new Error("Google e-postası doğrulanmamış.");
    }
    return {
      email,
      name: String(data.name || email.split("@")[0]),
      picture: data.picture ? String(data.picture) : undefined,
      emailVerified: true,
    };
  } finally {
    clearTimeout(timer);
  }
}

/** 401 JSON yanıtı */
export function unauthorized(message = "Giriş gerekli. Lütfen Google ile giriş yapın.") {
  return NextResponse.json({ success: false, error: message }, { status: 401 });
}

/** 403 JSON yanıtı */
export function forbidden(message = "Bu işlem için admin yetkisi gerekli.") {
  return NextResponse.json({ success: false, error: message }, { status: 403 });
}
