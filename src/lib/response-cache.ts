/**
 * HilmanAI Yanıt Önbelleği — kota dostu katman.
 *
 * Mantık: biri sorunca ÖNCE AI cevaplar, cevap DATABASE'e kaydedilir.
 * Aynı soru tekrar gelince model HİÇ çalışmaz, kayıttan anında döner.
 *
 * - Anahtar: kategori + mod + normalize soru + sistem-prompt özeti
 *   (kişisel talimatı farklı kullanıcının cevabı karışmaz)
 * - Süre: 6 saat (güncel bilgiler bayatlamasın)
 * - Üst sınır: 300 kayıt (eskiler otomatik silinir)
 * - Kapsam dışı: resim/video/vision (her seferinde farklı üretilir),
 *   dosya ekli istekler, hatalar.
 * - Kalıcılık: hilman_storage.json (qaCache) — restart'ta uçmaz.
 *
 * GEÇİCİ SİSTEM: VDS/dedicated altyapıya geçilince QA_CACHE_ENABLED=false
 * yapman yeterli — kodun geri kalanına dokunmaya gerek yok.
 */

export const QA_CACHE_ENABLED = true;

export const QA_CACHE_TTL_MS = 6 * 60 * 60 * 1000;
export const QA_CACHE_MAX = 300;

export interface CachedResponse {
  content: string;
  reasoning: string;
  tokensUsed: number;
  mediaType: "text";
  searchResults: Array<{ title: string; snippet: string; url: string }> | null;
  followUps: string[];
  source: string | null;
  codeSnippet: { code: string; language: string; title: string } | null;
  createdAt: number;
}

export function hashStr(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return h;
}

export function buildCacheKey(
  category: string,
  mode: string,
  normalizedPrompt: string,
  systemFingerprint: string
): string {
  return `v1|${category}|${mode}|${normalizedPrompt}|${hashStr(systemFingerprint)}`;
}
