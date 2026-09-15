<div align="center">
  <img src="client/src/assets/logo.png" alt="Timur Satrancı logosu" width="140" />
  <h1>♟️ Timur Satrancı</h1>
  <p><strong>Eğitim, kültür ve dijital deneyim odaklı satranç platformu</strong></p>
  <p>
    <a href="https://www.teknofest.org/"><img src="https://img.shields.io/badge/TEKNOFEST-2026-blue?style=for-the-badge" alt="TEKNOFEST 2026" /></a>
    <img src="https://img.shields.io/badge/Kategori-Eğitim%2C%20Kültür%20%26%20Dijital%20Deneyim-orange?style=for-the-badge" alt="Kategori" />
    <img src="https://img.shields.io/badge/Derece-Finalist-gold?style=for-the-badge" alt="Finalist" />
  </p>
  <p>
    <img src="https://img.shields.io/badge/React-18-61dafb?logo=react&logoColor=white" alt="React 18" />
    <img src="https://img.shields.io/badge/Vite-5-646cff?logo=vite&logoColor=white" alt="Vite 5" />
    <img src="https://img.shields.io/badge/TypeScript-5.2-3178c6?logo=typescript&logoColor=white" alt="TypeScript 5.2" />
    <img src="https://img.shields.io/badge/Tailwind_CSS-3.4-06b6d4?logo=tailwindcss&logoColor=white" alt="Tailwind CSS 3.4" />
    <img src="https://img.shields.io/badge/Supabase-Realtime-3ecf8e?logo=supabase&logoColor=white" alt="Supabase Realtime" />
  </p>
</div>

---

> **2026 TEKNOFEST İnsanlık Yararına Teknolojiler Yarışması — Eğitim, Kültür ve Dijital Deneyim Kategorisi Finalist Projesi**

---

## 📌 Proje Hakkında

**Timur Satrancı**, satranç öğrenme ve oynama deneyimini dijital ortamda geliştirmeyi amaçlayan bir platformdur. Timur dönemine dayanan bu tarihi satranç varyantı; **10×11'lik ana gövde + 2 hisar cebi = 112 kare**, **17 figür + 11 piyade = 28 taşlık** ordular, rok ve geçerken almanın olmadığı, patın galibiyet sayıldığı kendine özgü kurallar bütünüyle kadim strateji oyununu modern web dünyasına taşır.

Proje; satrancın eğitimsel ve kültürel değerini teknolojiyle buluşturarak kullanıcıların satrançla daha etkileşimli, erişilebilir ve keyifli bir şekilde ilgilenmesine katkı sağlamayı hedeflemektedir.

Platform, **2026 TEKNOFEST İnsanlık Yararına Teknolojiler Yarışması Eğitim, Kültür ve Dijital Deneyim Kategorisi** kapsamında geliştirilmiş ve **finale kalmıştır**.

## 🎯 Projenin Amacı

- Satranç eğitimini dijital araçlarla desteklemek.
- Kullanıcıların satrançla etkileşimini artırmak.
- Satranç kültürünün ve stratejik düşünme becerilerinin gelişimine katkı sağlamak.
- Eğitim ve dijital deneyimi bir araya getiren yenilikçi bir platform oluşturmak.
- Tarihi bir strateji oyununu modern teknolojiyle geniş kitlelere ulaştırmak.

## 🏆 TEKNOFEST 2026

| Bilgi | Detay |
|-------|-------|
| **Yarışma** | İnsanlık Yararına Teknolojiler Yarışması |
| **Kategori** | Eğitim, Kültür ve Dijital Deneyim |
| **Derece** | 🏅 Finalist |

## 👥 Takım Bilgileri

| Bilgi | Detay |
|-------|-------|
| **Takım Adı** | ŞÖHAL TECH |
| **Okul** | Etimesgut Şehit Ömer Halisdemir Anadolu Lisesi |
| **Proje** | Timur Satrancı |
| **Geliştirici** | Hakan Celep |

---

## ✨ Platform Özellikleri

### ♟️ Oyun Modları

- **Bota Karşı** — tek motor + 5 zorluk profili (Çok Kolay → Uzman); zayıf seviyeler insan-vari hata yapar, asla rastgele oynamaz
- **Ekranda Oyna** — aynı cihazda iki kişilik yerel oyun (tahta döndürme seçeneğiyle)
- **Arkadaşla Oyna** — 6 haneli oda koduyla gerçek zamanlı çevrim içi maç (Supabase Realtime, kayıtsız anonim kimlik)
- **Turnuva** — arena eşleşme + puan durumu altyapısıyla canlı turnuva listesi
- **Dizilim Editörü** — başlangıç taş dizimini özelleştirme (doğrulama + FEN/JSON dışa aktarma)
- Canlı maç HUD'ı (hamle geçmişi, alınan taşlar, ses kontrolü), terfi ve hisar rozetleri

### 🌐 Çevrim İçi (Online)

- Oda kurma / kodla katılma, canlı hamle senkronizasyonu, yeniden bağlanınca geçmişten kurtarma
- Beraberlik teklifi, geri alma teklifi, rövanş, terk/iptal protokolü
- **ELO** — yalnızca çevrim içi maçlarda (başlangıç 1200, ilk 10 maç K=40); isim yanında rozet

### 🔍 Analiz

- **Oyun İncelemesi** — maç sonu derinlemesine analiz (sabit derinlik 4, Web Worker'da, iptal edilebilir, ilerleme çubuklu): hamle sınıfları, doğruluk %, üstünlük grafiği, koç yorumları, en-iyi-hamle önizlemesi ve "sen dene" modu
- **Kendi Kendine Analiz** — serbest sandbox: canlı konum değerlendirmesi, varyasyon ağacı (çatal-korumalı, önizlemeli)
- Taşlar her ekranda izleyiciye dönüktür (online/bot/inceleme dahil)

### 🎓 Öğrenme Modülü

Seviyelendirme rehberine sadık, ilerleme takibi yapan interaktif eğitim:

| Seviye | İçerik |
|--------|--------|
| 1–6 | Toplam **25 ders**, **70 bulmaca**, **4650 XP** |

- Taş rehberi (12 figür: hareket, değer, terfi), kural kartları, yol haritası
- Uyarlanabilir bulmaca seçimi (seri/streak bonusu), ders detayı: konu anlatımı + bulmaca kartları + XP rozetleri

### 📚 Satranç Eğitimine Yönelik İçerikler

- 6 seviyeli yapılandırılmış müfredat
- Etkileşimli bulmacalar ve pratik senaryoları
- Kademeli ilerleme sistemi (XP + rozet)
- Kullanıcı odaklı öğrenme ve anında geri bildirim

### 🎨 Tasarım

- Koyu yeşil + krem renk dili, ana menüde su yeşili neon vurgu
- Phosphor ikon seti, mobile-first responsive arayüz (360px → 1280px+, masaüstü kenar çubuğu düzeni)
- URL tabanlı sayfalar (`/oyna`, `/bot`, `/ogren`… — İngilizce yollar, tarayıcı Geri/İleri destekli, reload'suz)
- Tasarım kararlarının tamamı: [`docs/tasarim-plani.md`](docs/tasarim-plani.md)

---

## 🛠️ Kullanılan Teknolojiler

| Katman | Teknoloji |
|--------|-----------|
| **Programlama Dili** | TypeScript 5.2 |
| **Ön Yüz (Frontend)** | React 18, Tailwind CSS 3.4, Phosphor Icons |
| **Derleme / Build** | Vite 5 |
| **Satranç Motoru** | El yapımı negamax + alpha-beta + iterative deepening + transposition table (Zobrist), Web Worker |
| **Çevrim İçi / Backend** | Supabase (Postgres + Realtime `postgres_changes`) |
| **Durum Yönetimi** | React hooks + localStorage (öğrenme ilerlemesi, anonim oyuncu kimliği) |
| **Test** | `tsc` + node tabanlı birim testleri (~397 test: kurallar, motor, bot, analiz, ELO, turnuva) |
| **Büyük Asset'ler** | Git LFS (`*.png`, `*.jpg`, Unity dosyaları) |
| **Dağıtım** | Vercel |

---

## 🚀 Kurulum

### Gereksinimler

- **Node.js 18+**
- npm (Node.js ile birlikte gelir)

### Hızlı Başlangıç

```bash
cd client
npm install
npm run dev      # geliştirme sunucusu (http://localhost:3000)
```

### 🌐 Çevrim İçi Oyun Kurulumu (Arkadaşla Oyna + ELO + Turnuva)

Oda kodlu online maç Supabase (Postgres + Realtime) kullanır. Bu adım atlanırsa uygulamanın geri kalanı çalışır, yalnızca çevrim içi özellikler pasif kalır.

**Seçenek A — Supabase CLI (önerilen):**

```bash
npm install -g supabase
supabase login
cd client
supabase link --project-ref <proje-ref>
supabase db push   # supabase/migrations içindeki tüm şemaları basar
```

**Seçenek B — SQL Editor (manuel):**

1. [supabase.com](https://supabase.com) adresinde proje oluşturun (region: Frankfurt önerilir).
2. Önce [`supabase/schema.sql`](supabase/schema.sql), ardından [`supabase/migrations`](supabase/migrations) içindeki `01_*.sql` → `05_*.sql` dosyalarını sırayla çalıştırın (tablolar + Realtime yayını + RLS politikaları).
3. **Settings → API** kısmından `Project URL` ve `anon/public key` değerlerini alıp `client/.env` dosyası oluşturun:

```env
VITE_SUPABASE_URL=https://xxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGci...
```

> `.env` dosyası gizlidir ve commit edilmez (bkz. `.env.example`).

### Üretim Derlemesi

```bash
npm run build    # önce tsc tip denetimi, sonra vite build → dist/
npm run preview  # derleme çıktısını önizleme
npm run test     # birim testleri (tsc ile derlenip node'da koşar)
```

---

## 🗂️ Proje Yapısı

```
Timur-Satranc-/
├── client/                       # Web istemcisi (asıl ürün)
│   ├── src/
│   │   ├── assets/               # Logo, taş görselleri, tahta dokuları (tüm görseller burada)
│   │   ├── components/           # Ekranlar (MainMenu, PlayMenu, BotSelect, Learn…)
│   │   │   ├── board/ game/ learn/ review/ desktop/
│   │   ├── core/                 # Oyun çekirdeği (tek doğruluk kaynağı)
│   │   │   ├── rules/            # Hamle üretimi (pipeline), make/undo, oyun sonu
│   │   │   ├── position/ move/ notation/ setup/
│   │   │   ├── online/           # Oda + hamle + protokol + rating servisleri
│   │   │   ├── rating/           # ELO hesaplama (saf fonksiyonlar)
│   │   │   ├── tournament/       # Arena eşleşme + puan durumu
│   │   │   └── material/         # Taş değerleri (motorla tek tablo)
│   │   ├── engine/               # Satranç motoru (arama + değerlendirme + TT)
│   │   ├── bot/                  # 5 zorluk profili + profilli hamle seçimi
│   │   ├── analyzer/ analysis/   # Hamle/oyun analizi, eşikler, rapor, koç açıklamaları
│   │   ├── worker/               # Web Worker protokolü + istemcisi (bot + analiz)
│   │   ├── hooks/                # useGame, useOnlineGame, useReviewAnalysis…
│   │   ├── lib/                  # supabaseClient, auth (anonim kimlik), router
│   │   ├── learn/                # Öğrenme içeriği + ilerleme + bulmaca seçici
│   │   ├── types/                # Paylaşılan TypeScript tipleri
│   │   └── views/                # ScreenPlayView, BotPlayView, OnlinePlayView,
│   │                             # GameReviewView, SelfAnalysisView, SetupEditorView
│   ├── .env.example              # Supabase ortam değişkeni şablonu (.env commit edilmez)
│   ├── index.html
│   └── package.json
├── supabase/
│   ├── schema.sql            # Ana şema (tablolar + Realtime + RLS)
│   └── migrations/           # 01_baseline → 05_rls_hardening (CLI ile basılır)
├── docs/
│   ├── tasarim-plani.md          # Tema ve tasarım kararları
│   └── timursatranci-mimari.md   # Sistem mimarisi referans dokümanı (v1 + v2 hedefi)
└── README.md
```

---

## 🧭 Mimari İlkeler

- **Tek doğruluk kaynağı:** tüm hamle mantığı `core/rules` içindedir; UI, motor ve analiz aynı çekirdeği kullanır. Taş dizimi ve kurallar dondurulmuştur (bkz. `client/docs/frozen-rules.md`).
- **Tek motor, çok profil:** bot ve analizör aynı engine'i kullanır; zorluk profille, derinlik ihtiyaca göre ayarlanır.
- **Ana thread bloklanmaz:** ağır hesap (bot + oyun incelemesi) Web Worker'da koşar, iptal edilebilir.
- **ELO yalnızca online'dadır;** bot zorluğunu kullanıcı seçer.
- **Supabase yoksa uygulama çalışmaya devam eder** — yalnızca çevrim içi özellikler devre dışı kalır.

---

## 🗺️ Yol Haritası

- ✅ Oda kodlu online arkadaş maçı (teklif/rövanş protokolü + yeniden bağlanma)
- ✅ Online ELO + turnuva arena altyapısı
- ✅ Worker tabanlı derin oyun incelemesi + serbest analiz varyasyonları
- 🔲 Online v2: süre kontrolü, rövanş akışı iyileştirme
- 🔲 Ek ders ve bulmaca içerikleri

---

## 📸 Proje Görselleri

> Platformun arayüz görüntüleri ve proje tanıtım görselleri bu bölümde paylaşılacaktır.

---

## 📄 Lisans

Bu proje [MIT Lisansı](LICENSE) ile lisanslanmıştır.

---

<div align="center">

### Geliştiren

**Hakan Celep**

**ŞÖHAL TECH** · Etimesgut Şehit Ömer Halisdemir Anadolu Lisesi

🏆 **2026 TEKNOFEST İnsanlık Yararına Teknolojiler Yarışması — Finalist Projesi**

</div>
