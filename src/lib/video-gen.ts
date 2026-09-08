import { hilmanStorage } from "./storage";

/**
 * HilmanAI Gerçek Video Üretimi — Pollinations text-to-video (anahtarlı).
 *
 * SAHTE VİDEO YOKTUR: anahtar yoksa veya üretim başarısızsa çağrıcı
 * dürüst bir bilgi mesajı göstermelidir, asla örnek dosya "üretilmiş"
 * gibi sunulmamalıdır.
 */

export type VideoGenOutcome =
  | { ok: true; fileId: string; engine: string; durationSec: number }
  | { ok: false; reason: "no_key" | "http_error" | "bad_content" | "timeout" | "error" };

async function fetchWithTimeout(url: string, init: RequestInit, timeoutMs: number): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

const VIDEO_MODELS = ["alibaba/wan-2.2-fast", "alibaba/wan-2.6"];

export async function generateRealVideo(
  promptEn: string,
  seed: number,
  durationSec = 4
): Promise<VideoGenOutcome> {
  const key = (process.env.POLLINATIONS_API_KEY || "").trim();
  if (!key) return { ok: false, reason: "no_key" };

  const cleanPrompt = promptEn.slice(0, 400);
  for (const model of VIDEO_MODELS) {
    try {
      const url =
        `https://gen.pollinations.ai/video/${encodeURIComponent(cleanPrompt)}` +
        `?model=${encodeURIComponent(model)}&duration=${durationSec}&seed=${seed}`;
      const resp = await fetchWithTimeout(
        url,
        { headers: { Authorization: `Bearer ${key}` } },
        100000
      );
      if (!resp.ok) continue;
      const ct = resp.headers.get("content-type") || "";
      if (!ct.includes("video") && !ct.includes("mp4")) continue;
      const buf = Buffer.from(await resp.arrayBuffer());
      if (buf.length < 50_000) continue;
      const fileId = hilmanStorage.saveGeneratedFile(`hilman-${Date.now()}-${seed}.mp4`, buf);
      return { ok: true, fileId, engine: model, durationSec };
    } catch (e: any) {
      console.warn(`[HilmanAI] Video ${model} error:`, e.message);
    }
  }
  return { ok: false, reason: "error" };
}

export function videoUnavailableMessage(reason: VideoGenOutcome & { ok: false }): string {
  if (reason.reason === "no_key") {
    return (
      `🎬 Bu sahne için **gerçek video üretimi** şu an kapalı, çünkü video motoru anahtarı sunucuda tanımlı değil.\n\n` +
      `Sana yine de sahnenin **gerçek AI poster görselini** yukarıda ürettim. Video üretimini açmak için yöneticinin sunucuya \`POLLINATIONS_API_KEY\` eklemesi yeterli — ardından aynı cümleyle tekrar dene, sahnenin gerçek videosunu üreteyim.`
    );
  }
  return (
    `🎬 Video motoru şu an cevap vermedi (yoğunluk veya bağlantı sorunu olabilir).\n\n` +
    `Sahnenin **poster görseli** yukarıda hazır. Birazdan **"Tekrar dene"** ile aynı sahneyi yeniden üretmeyi deneyebilirsin — kuyruk boşalınca gerçek videon gelir.`
  );
}
