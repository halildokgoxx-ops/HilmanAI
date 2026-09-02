# HilmanAI 1.0 Zirve - Production Web Gateway

HilmanAI, 2026 yılının en gelişmiş Türkçe yapay zeka, derin akıl yürütme, 8K görsel üretim ve kodlama platformudur.

## 🚀 Özellikler

- **🔒 Tam Güvenlikli Reverse Proxy Gateway:** İstemci tarafında (F12, Network sekmesi, Sources) hiçbir iç HuggingFace linki veya tokeni görünmez. Tüm istekler sunucu üzerinden güvenle aktarılır.
- **✨ Çoklu Sayfa Mimarisi:**
  - `/` -> HilmanAI Zirve Chat & Vision Arayüzü
  - `/admin` -> Özel Şifreli Yönetici Kontrol Merkezi (`hilmanadmin` / `hilman2026`)
  - `/api` -> Geliştirici API Hub ve Token Üretici (`/api/v1/chat`)
  - `/privacy` -> Google OAuth Uyumlu Gizlilik Politikası
  - `/terms` -> Kullanım Koşulları
- **🌐 Google OAuth 2.0 Entegrasyonu:** Resmi Google Token Client API ile tek tıkla güvenli oturum açma, kullanıcı profil resmi (PP) ve isim senkronizasyonu.
- **🎨 8K Ultra HD Görsel Üretimi:** "Resim çiz" komutları ile yüksek çözünürlüklü görsel oluşturma.
- **⚡ Akıllı Model Seçimi:** Hızlı Mod (Flash), Düşünen Mod (Derin Akıl Yürütme), Pro Mod (Yazılım & Matematik).

---

## 🛠️ Kurulum ve Çalıştırma

### 1. Gereksinimleri Yükleyin
```bash
pip install -r requirements.txt
```

### 2. Sunucuyu Başlatın
```bash
python server.py
```
Sunucu varsayılan olarak `http://localhost:7860` üzerinde çalışmaya başlayacaktır.

---

## 🔑 Geliştirici API Kullanımı

```python
hilman_api_key = "hilman-live-xxxxxxxx"
model = "hilman-v1-beta"

import requests

url = "https://hilmanbey-hilmanai-v1-beta.hf.space/api/v1/chat"
headers = {
    "Content-Type": "application/json",
    "Authorization": f"Bearer {hilman_api_key}",
}
payload = {
    "model": model,
    "messages": [
        {"role": "system", "content": "Sen HilmanAI'sın."},
        {"role": "user", "content": "Merhaba!"},
    ],
}

response = requests.post(url, json=payload, headers=headers)
print(response.json())
```

---

## 📄 Lisans
© 2026 HilmanAI Platformu. Tüm hakları saklıdır.
