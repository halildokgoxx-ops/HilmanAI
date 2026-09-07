import { NextRequest, NextResponse } from "next/server";

/**
 * HilmanAI Rate Limiter — hafif, bağımlılıksız kayan pencere (sliding window).
 * Tek instance varsayar (Render free plan). Ölçeklenirse Redis'e taşınmalı.
 */

interface Bucket {
  hits: number[];
}

const buckets = new Map<string, Bucket>();

// Periyodik temizlik (10 dakikada bir, şişmeyi önler)
const CLEANUP_MS = 10 * 60 * 1000;
let lastCleanup = Date.now();

function cleanup(now: number) {
  if (now - lastCleanup < CLEANUP_MS) return;
  lastCleanup = now;
  for (const [k, b] of buckets) {
    if (b.hits.length === 0 || now - b.hits[b.hits.length - 1] > 15 * 60 * 1000) {
      buckets.delete(k);
    }
  }
}

function clientKey(req: NextRequest): string {
  const fwd = req.headers.get("x-forwarded-for");
  const ip = (fwd ? fwd.split(",")[0].trim() : null) || "unknown";
  return ip;
}

export interface RateLimitOptions {
  /** Pencere süresi (ms) */
  windowMs: number;
  /** Pencere başına izin */
  max: number;
  /** Anahtar öneki (uç başına ayrı kova) */
  prefix: string;
}

/**
 * Limiti aşarsa 429 NextResponse döndürür, aşmazsa null.
 * Başarılı isteklerde standart RateLimit-* başlıklarını eklemek isteyenler
 * `addHeaders(res)` ile ekleyebilir — sadelik için sayaç yanıta gömülmez.
 */
export function checkRateLimit(
  req: NextRequest,
  opts: RateLimitOptions
): NextResponse | null {
  const now = Date.now();
  cleanup(now);
  const key = `${opts.prefix}:${clientKey(req)}`;
  let bucket = buckets.get(key);
  if (!bucket) {
    bucket = { hits: [] };
    buckets.set(key, bucket);
  }
  // Pencere dışındakileri at
  while (bucket.hits.length > 0 && now - bucket.hits[0] > opts.windowMs) {
    bucket.hits.shift();
  }
  if (bucket.hits.length >= opts.max) {
    const retryAfter = Math.ceil((bucket.hits[0] + opts.windowMs - now) / 1000);
    return NextResponse.json(
      {
        success: false,
        error: "Çok fazla istek gönderdiniz. Lütfen biraz bekleyip tekrar deneyin.",
      },
      {
        status: 429,
        headers: { "Retry-After": String(Math.max(1, retryAfter)) },
      }
    );
  }
  bucket.hits.push(now);
  return null;
}

/** Sıkı uçlar için hazır profiller */
export const RATE_PROFILES = {
  chat: { windowMs: 60_000, max: 20, prefix: "chat" }, // dk'da 20 sohbet
  v1: { windowMs: 60_000, max: 60, prefix: "v1" }, // dk'da 60 API çağrısı
  auth: { windowMs: 60_000, max: 30, prefix: "auth" }, // dk'da 30 giriş denemesi
  keysWrite: { windowMs: 60_000, max: 10, prefix: "keysw" }, // dk'da 10 anahtar işlemi
} satisfies Record<string, RateLimitOptions>;
