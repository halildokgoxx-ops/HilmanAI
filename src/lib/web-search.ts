/**
 * HilmanAI Web Search & Live Research Module
 * 
 * Gerçek zamanlı internet araması yaparak en güncel bilgileri,
 * sınav tarihlerini, haberleri, döviz/hava durumu ve güncel gerçekleri
 * HilmanAI LLM motoruna besler.
 */

export interface SearchResultItem {
  title: string;
  snippet: string;
  url: string;
}

function decodeHtmlEntities(str: string): string {
  return str
    .replace(/&#x27;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, " ")
    .replace(/&#x([0-9a-fA-F]+);/g, (_, code) => String.fromCharCode(parseInt(code, 16)))
    .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(parseInt(code, 10)));
}

export async function searchWeb(query: string, maxResults = 4): Promise<SearchResultItem[]> {
  try {
    const cleanQuery = query
      .replace(/^(internette ara|araştır|araştırma yap|google'da ara|webde ara)[:\s]*/gi, "")
      .trim();

    if (!cleanQuery) return [];

    const url = `https://html.duckduckgo.com/html/?q=${encodeURIComponent(cleanQuery)}`;
    
    // 3.5 saniye zaman aşımı ile hızlı fetch
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 3500);

    const res = await fetch(url, {
      signal: controller.signal,
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
        "Accept-Language": "tr-TR,tr;q=0.9,en-US;q=0.8,en;q=0.7",
      },
    });

    clearTimeout(timeout);

    if (!res.ok) return [];

    const html = await res.text();
    const results: SearchResultItem[] = [];

    // DuckDuckGo HTML formatındaki sonuçları ayrıştır
    const resultBlockRegex = /<div class="result__body">([\s\S]*?)<\/div>/g;
    let blockMatch;

    while ((blockMatch = resultBlockRegex.exec(html)) !== null && results.length < maxResults) {
      const block = blockMatch[1];

      // Title & Link
      const titleMatch = block.match(/<a class="result__url"[^>]*href="([^"]*)"[^>]*>([\s\S]*?)<\/a>/) ||
                         block.match(/<a class="result__snippet[^>]*href="([^"]*)"[^>]*>([\s\S]*?)<\/a>/);
      const mainLinkMatch = block.match(/<a class="result__a"[^>]*href="([^"]*)"[^>]*>([\s\S]*?)<\/a>/);

      const title = mainLinkMatch ? decodeHtmlEntities(mainLinkMatch[2].replace(/<[^>]+>/g, "").trim()) : "";
      let link = mainLinkMatch ? mainLinkMatch[1] : "";

      // DDG link yönlendirmesini temizle
      if (link.includes("uddg=")) {
        const extracted = link.split("uddg=")[1]?.split("&")[0];
        if (extracted) {
          try {
            link = decodeURIComponent(extracted);
          } catch {
            // ignore
          }
        }
      }

      // Snippet
      const snippetMatch = block.match(/<a class="result__snippet[^>]*>([\s\S]*?)<\/a>/);
      const snippet = snippetMatch ? decodeHtmlEntities(snippetMatch[1].replace(/<[^>]+>/g, "").trim()) : "";

      if (title && snippet) {
        results.push({
          title,
          snippet,
          url: link || "https://duckduckgo.com/?q=" + encodeURIComponent(cleanQuery),
        });
      }
    }

    // Eğer blok ayrıştırması yetersizse basit snippet regex dene
    if (results.length === 0) {
      const snippetRegex = /<a class="result__snippet[^>]*>([\s\S]*?)<\/a>/g;
      let sMatch;
      while ((sMatch = snippetRegex.exec(html)) !== null && results.length < maxResults) {
        const snip = decodeHtmlEntities(sMatch[1].replace(/<[^>]+>/g, "").trim());
        if (snip.length > 20) {
          results.push({
            title: `Arama Sonucu ${results.length + 1}`,
            snippet: snip,
            url: "https://duckduckgo.com/?q=" + encodeURIComponent(cleanQuery),
          });
        }
      }
    }

    return results;
  } catch (err: any) {
    console.warn("[HilmanAI WebSearch] Search error:", err.message);
    return [];
  }
}

export function shouldPerformWebSearch(query: string, category: string): boolean {
  if (category === "image" || category === "video" || category === "vision") {
    return false;
  }

  const q = query.toLowerCase().trim();

  // 1. Düzeltme, itiraz veya bağlam takibi ifadeleri ASLA dış aramaya gitmemeli!
  const correctionPhrases = [
    "sormadım",
    "sormadim",
    "tarih sormadım",
    "tarihini sormadım",
    "tarihini sormadımki",
    "onu sormadım",
    "bunu sormadım",
    "yanlış anladın",
    "yanlis anladin",
    "öyle değil",
    "oyle degil",
    "başka bir şey",
    "ne alaka",
    "alakası yok",
    "onu demedim",
    "bunu demedim",
    "saçmalama",
    "sacmalama",
  ];
  if (correctionPhrases.some((p) => q.includes(p))) {
    return false;
  }

  // 2. Basit selamlaşma veya sohbet
  if (
    q === "selam" ||
    q === "merhaba" ||
    q === "naber" ||
    q === "nasılsın" ||
    q === "sen kimsin" ||
    q.length < 4
  ) {
    return false;
  }

  // 3. Çalışma tavsiyesi, taktik, ders programı soruları yerel zeka ile çözülmeli
  if (
    q.includes("ne çalışmalıyım") ||
    q.includes("nasıl çalışmalıyım") ||
    q.includes("nasıl çalışılır") ||
    q.includes("çalışma taktik") ||
    q.includes("ders programı") ||
    q.includes("tavsiye ver") ||
    q.includes("konuları neler")
  ) {
    return false;
  }

  // 4. Kullanıcı açıkça internetten araştırma istiyorsa
  if (
    q.includes("araştır") ||
    q.includes("internette") ||
    q.includes("google") ||
    q.includes("haber") ||
    q.includes("son dakika") ||
    q.includes("güncel")
  ) {
    return true;
  }

  // 5. Tarih, zaman, anlık borsa, maç skoru vb. güncel dış veriler
  const searchTriggers = [
    "ne zaman",
    "ne zman",
    "kaç tl",
    "kaç dolar",
    "dolar",
    "euro",
    "borsa",
    "hava durumu",
    "seçim sonuçları",
    "maç sonucu",
    "maç kaç kaç",
    "vizyon tarihi",
    "çıkış tarihi",
    "yayınlandı mı",
    "açıklandı mı",
    "taban puanları",
  ];

  return searchTriggers.some((trigger) => q.includes(trigger));
}
