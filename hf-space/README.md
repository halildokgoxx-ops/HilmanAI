---
title: HilmanAI-7B
emoji: 🤖
colorFrom: green
colorTo: blue
sdk: docker
app_port: 7860
pinned: false
---

# HilmanAI-7B — Kişisel Model Sunucusu

HilmanAI sitesinin **önce** sorduğu model. GGUF dosyasını indirir, OpenAI uyumlu `/v1` API açar.

## Kurulum (5 dakika, kartsız)

1. HuggingFace'te **New Space** → isim ver (örn. `HilmanAI-7B`) → **Docker** seç → donanım **CPU basic (ücretsiz)**.
2. Bu klasördeki 4 dosyayı yükle: `Dockerfile`, `requirements.txt`, `server.py`, `README.md`.
3. Space build alıp açılsın (ilk açılış model indirdiği için birkaç dakika sürer).
4. Adresi kopyala: `https://KULLANICI-ADIN-HilmanAI-7B.hf.space`
5. HilmanAI sitesinde **Admin Paneli → Motor Parametreleri → Senin Modelin** kısmına adresi yapıştır, kaydet.

## Notlar

- Space boşta uyur; ilk istekte uyanması 1-3 dk sürebilir. Site o sırada otomatik buluta düşer.
- Düzenli kullanımda sıcak tutmak için ücretsiz UptimeRobot ile 5 dakikada bir `/health` adresine ping at.
- `MODEL_URL` ortam değişkeniyle farklı GGUF verilebilir.
