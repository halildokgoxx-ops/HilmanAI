# HilmanAI v1 Beta — Çok Modlu Yapay Zeka Platformu

Türkçe, çok modlu (metin • kod • vision • resim • video) yapay zeka sohbet platformu.
Next.js 16 + React 19 + TailwindCSS 4. Google ile giriş zorunlu, geçmişler hesap bazlı,
admin paneli yalnızca admin hesabına görünür.

## Özellikler

- **Google ile güvenli giriş** — resmi Google Identity Services butonu, ID Token sunucuda
  Google'a doğrulatılır, oturum HMAC imzalı httpOnly çerezle tutulur. Ek auth bağımlılığı yok.
- **Hesap bazlı geçmiş** — her kullanıcının sohbetleri yalnızca kendi Google hesabına kaydedilir,
  kimse başkasının geçmişini göremez.
- **Admin kilidi** — Admin Paneli + motor ayarları yalnızca `ADMIN_EMAIL` hesabına görünür/açıktır.
- **Gerçek API anahtarları** — hesap başına en fazla 3 `hilman_...` anahtarı, kullanım sayacı
  (`usageCount`) ve son kullanım damgasıyla. OpenAI uyumlu (`/api/v1/chat/completions`) ve
  Gemini uyumlu (`/api/v1/generate-content`) uçlar.
- **Koruma katmanları** — rate limiting (abuse koruması), kullanıcı kotası + VIP muafiyeti,
  güvenlik başlıkları (HSTS, nosniff, DENY), istek boyut sınırları, bozuk veriye karşı
  yedekli JSON storage.
- **Modern sohbet UX'i** — takip sorusu çipleri, markdown tablo renderi, kod kopyalama +
  canlı önizleme, yanıt süresi göstergesi, tarih gruplu kenar çubuğu, sohbet arama,
  dışa aktarma (md/txt/json).
- **Otonom çekirdek** — harici LLM anahtarı yoksa bile çalışan çevrimdışı zekâ + canlı web
  araştırması (DuckDuckGo), Pollinations ile resim, sinematik video stüdyosu.
- **Render'a hazır** — `render.yaml` Blueprint + `Dockerfile` + `/api/health` sağlık kontrolü.
- **Yasal sayfalar** — `/privacy` ve `/terms` (Google OAuth yayınlama onayı için gerekli).

## Hızlı Başlangıç (yerel)

```bash
npm ci
cp .env.example .env   # Windows: copy .env.example .env
# .env içine GOOGLE_CLIENT_ID yazın (aşağıdaki bölüme bakın)
npm run dev            # http://localhost:3000
```

## Google ile Giriş Kurulumu (5 dakika, ücretsiz)

Google butonunun çalışması için bir **OAuth 2.0 İstemci Kimliği** gerekir.
Eskiden repoda hazır bir kimlik **yoktu** — bu adımlarla kendiniz oluşturun:

1. [Google Cloud Console](https://console.cloud.google.com/) → yeni proje oluşturun
   (örn. `HilmanAI`).
2. **API'ler ve Hizmetler → OAuth izin ekranı** → User Type: **Harici** → yayınlama durumu
   testte kalabilir. Uygulama adı, destek e-postası girin. Kapsam (scope) eklemenize gerek yok
   (yalnızca temel profil: e-posta, ad, fotoğraf).
3. **İstemciler (Clients) → İstemci oluştur → Uygulama türü: Web uygulaması.**
4. **Yetkili JavaScript kaynakları** kısmına şunları ekleyin:
   - `http://localhost:3000` (yerel test)
   - `https://SIZIN-ADRESINIZ.onrender.com` (Render adresiniz — deploy sonrası)
5. Oluşan **İstemci Kimliği** (`...apps.googleusercontent.com`) değerini kopyalayın.
6. `.env` dosyanıza yazın: `GOOGLE_CLIENT_ID=...`
7. Uygulamayı herkese açmadan önce Google, **gizlilik politikası URL'si** ister:
   `https://SIZIN-ADRESINIZ.onrender.com/privacy` (bu repoda hazır).

> `GOOGLE_CLIENT_ID` herkese açık bir değerdir (JS origin allowlist ile korunur) ama yine de
> `.env` içinde tutun, koda gömmeyin.

## Ortam Değişkenleri

| Değişken | Zorunlu | Açıklama |
|---|---|---|
| `GOOGLE_CLIENT_ID` | Evet | Google OAuth istemci kimliği |
| `AUTH_SECRET` | Evet (prod) | Oturum imzalama anahtarı (`openssl rand -base64 32`) |
| `ADMIN_EMAIL` | Hayır | Admin hesabı (varsayılan `halildokgox@gmail.com`) |
| `DATA_DIR` | Hayır | JSON storage dizini (Render diski: `/var/hilman-data`) |
| `HF_TOKEN` / `GEMINI_API_KEY` / `GROQ_API_KEY` / `OPENROUTER_API_KEY` | Hayır | Harici LLM (yoksa otonom çekirdek) |

## Render'da Yayınlama

1. Repo Render'a bağlıyken **New + → Blueprint** → `render.yaml` otomatik okunur.
2. Dashboard'da `GOOGLE_CLIENT_ID` değerini girin (`AUTH_SECRET` otomatik üretilir).
3. Deploy sonrası adresinizi Google Cloud Console'daki **Yetkili JavaScript kaynaklarına**
   ekleyin (bir üst bölüm, adım 4).
4. **Kalıcı geçmiş uyarısı:** free planda disk yoktur; restart/deploy'da `data/*.json`
   sıfırlanır. Kalıcı geçmiş için planı yükseltip `render.yaml` içindeki `disk` bloğunu
   aktif edin (uygulama `DATA_DIR` üzerinden diski kullanır).

Alternatif: `Dockerfile` ile herhangi bir Docker hostuna da kurulabilir.

## Geliştirici API'si

```bash
# Anahtarı sitedeki "API Keys" panelinden oluşturun (hesap başına max 3)
curl https://SIZIN-ADRESINIZ.onrender.com/api/v1/chat/completions \
  -H "Authorization: Bearer hilman_..." \
  -H "Content-Type: application/json" \
  -d '{"messages":[{"role":"user","content":"Merhaba!"}]}'
```

- `POST /api/v1/chat/completions` — OpenAI formatı
- `POST /api/v1/generate-content` — Gemini formatı
- `GET /api/health` — sağlık kontrolü (Render healthCheck)

## Güvenlik Notları

- `.env` ve `data/*.json` **asla** repoya eklenmez (`.gitignore` ile korumalı).
- Oturum çerezi httpOnly + HMAC imzalıdır; Google ID Token her girişte Google'a doğrulatılır.
- Sohbet/anahtar/sil işlemlerinde sahiplik kontrolü vardır; admin rotaları 403 korumalıdır.
- ⚠️ **Eski Python sürümünde (`server.py`) public repoya gömülü bir Groq anahtarı vardı.**
  O anahtarı [Groq Console](https://console.groq.com/) üzerinden **iptal edip yenileyin** —
  git geçmişinden silinmiş sayılmaz.

## Komutlar

```bash
npm run dev        # geliştirme
npm run build      # production derleme
npm start          # production çalıştırma (yerel)
npm run typecheck  # tip kontrolü
npm run lint       # eslint
```
