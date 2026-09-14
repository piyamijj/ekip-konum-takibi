# Ekip Konum Takibi

Rıza temelli, meşru bir ekip içi konum takibi uygulaması. Şirketinizdeki (siz dahil) 3-4 kişilik bir ekibin, **yalnızca kendi açık izniyle** paylaştığı canlı konumunu tek bir panoda (dashboard) görmenizi sağlar.

Bu uygulama **bir gözetim veya istihbarat aracı DEĞİLDİR**. Şunları KESİNLİKLE içermez ve içermeyecektir:

- OSINT / dijital ayak izi toplama (PhoneInfoga tarzı araçlar)
- Telefon numarasından konum tahmini
- Veri ihlali (breach) tarama
- "Risk skoru" hesaplama
- Kamuya açık veri kazıma (scraping)

Uygulama yalnızca, tarayıcısından **Geolocation API** izni açıkça veren cihazların konumunu gösterir. Her kullanıcı kendi paylaşımını istediği an açıp kapatabilir; paylaşım kapatıldığında son konum bilgisi sunucudan hemen silinir.

---

## İçindekiler

1. [Mimari Özeti](#mimari-özeti)
2. [Klasör Yapısı](#klasör-yapısı)
3. [Yerel Kurulum](#yerel-kurulum)
4. [Ortam Değişkenleri](#ortam-değişkenleri)
5. [Kullanım](#kullanım)
6. [Vercel KV Kurulumu (Kalıcı Veri Deposu)](#vercel-kv-kurulumu-kalıcı-veri-deposu)
7. [Gerçek Veritabanına Geçiş (Alternatif: Postgres/Supabase)](#gerçek-veritabanına-geçiş-alternatif-postgressupabase)
8. [Vercel'e Deploy](#vercele-deploy)
9. [Güvenlik ve Rıza İlkeleri](#güvenlik-ve-rıza-i̇lkeleri)
10. [ÖNEMLİ: API Anahtarlarınızı Rotate Edin](#önemli-api-anahtarlarınızı-rotate-edin)
11. [Sınırlamalar ve Yol Haritası](#sınırlamalar-ve-yol-haritası)

---

## Mimari Özeti

- **Next.js 14+ (App Router)**, **TypeScript**, **Tailwind CSS** (koyu tema).
- Her ekip üyesi telefonunda bu web uygulamasını açar (isteğe bağlı olarak **PWA** olarak ana ekrana ekleyebilir), `/join` sayfasından davet kodu + adını girer.
- Konum paylaşımını açtığında tarayıcının **yerleşik izin penceresi** çıkar; kullanıcı ne için izin verdiğini görür ve reddedebilir.
- İzin verildikten sonra cihaz, sayfa açıkken periyodik olarak (varsayılan 45 saniyede bir) `/api/location/update` uç noktasına kendi konumunu gönderir.
- Konumlar **Vercel KV (Redis)** üzerinde saklanır — sunucusuz (serverless) ortamda örnekler arası tutarlılık için gereklidir. Vercel KV bağlı değilse (örn. yerel geliştirmede), uygulama otomatik olarak bellek içi (in-memory) depolamaya düşer; her iki durumda da `lib/store.ts` aynı fonksiyonları kullanır, üst katmanlarda hiçbir fark yaratmaz.
- `/dashboard` sayfası, **OpenStreetMap + React-Leaflet** ile haritada her ekip üyesinin son bilinen konumunu, son güncelleme zamanını ve aktif/pasif durumunu gösterir.
- Kimlik doğrulama basittir: paylaşılan bir davet kodu + ad girişi ile kişi bazlı ayrım sağlanır (karmaşık kullanıcı/şifre sistemi yoktur).

---

## Klasör Yapısı

```
team-location-app/
├── app/
│   ├── page.tsx                     # Karşılama sayfası
│   ├── layout.tsx                   # Kök layout + PWA meta verileri
│   ├── globals.css                  # Tailwind + koyu tema stilleri
│   ├── join/
│   │   └── page.tsx                 # Katılım + izin/rıza akışı
│   ├── dashboard/
│   │   └── page.tsx                 # Harita + ekip listesi paneli
│   └── api/
│       ├── team/join/route.ts       # Davet kodu ile katılım
│       └── location/
│           ├── update/route.ts      # Konum güncelleme (POST)
│           ├── list/route.ts        # Tüm üyelerin son konumları (GET)
│           └── toggle/route.ts      # Paylaşımı aç/kapat (POST)
├── components/
│   └── TeamMap.tsx                  # React-Leaflet harita bileşeni
├── lib/
│   ├── config.ts                    # Davet kodu, ekip boyutu, aralıklar
│   ├── store.ts                     # Veri katmanı (bellek içi, DB'ye hazır)
│   └── types.ts                     # Paylaşılan TypeScript tipleri
├── public/
│   ├── manifest.json                # PWA manifest
│   └── icons/                       # PWA simgeleri
├── .env.local.example               # Ortam değişkeni şablonu (gerçek anahtar YOK)
├── .gitignore
├── package.json
├── tsconfig.json
├── tailwind.config.ts
├── postcss.config.js
└── next.config.mjs
```

---

## Yerel Kurulum

Gereksinimler: Node.js 18.18 veya üzeri, npm (veya yarn/pnpm).

```bash
# 1) Bağımlılıkları yükleyin
npm install

# 2) Ortam değişkenleri dosyanızı oluşturun
cp .env.local.example .env.local
# .env.local içindeki değerleri isteğinize göre düzenleyin (örn. davet kodu)

# 3) Geliştirme sunucusunu başlatın
npm run dev
```

Uygulama varsayılan olarak `http://localhost:3000` adresinde çalışır:

- `http://localhost:3000/join` → Ekibe katılma ve konum paylaşımı sayfası
- `http://localhost:3000/dashboard` → Canlı ekip konum panosu

> **Not:** Tarayıcılar, güvenlik nedeniyle Geolocation API'sini yalnızca `https://` veya `localhost` üzerinden çalıştırır. Yerel geliştirmede `localhost` kullanmak yeterlidir; gerçek cihazlarda test için mutlaka HTTPS (Vercel deploy sonrası otomatik sağlanır) gerekir.

---

## Ortam Değişkenleri

Tüm değişkenler `.env.local.example` dosyasında şablon olarak bulunur; **gerçek anahtar veya sır içermez**. `.env.local` dosyanızı oluşturduktan sonra kendi değerlerinizi girin.

| Değişken | Açıklama | Varsayılan |
|---|---|---|
| `INVITE_CODE` | Ekip üyelerinin `/join` sayfasında gireceği paylaşılan davet kodu | `EKIP2024` |
| `MAX_TEAM_MEMBERS` | İzin verilen maksimum ekip üyesi sayısı | `4` |
| `NEXT_PUBLIC_LOCATION_UPDATE_INTERVAL_MS` | Cihazın konumunu gönderme sıklığı (ms) | `45000` |
| `STALE_THRESHOLD_MS` | Bu süreden eski güncellemeler panoda "bayat/çevrimdışı" gösterilir (ms) | `120000` |
| `NEXT_PUBLIC_DASHBOARD_POLL_INTERVAL_MS` | Panonun sunucudan veri yenileme sıklığı (ms) | `15000` |
| `KV_REST_API_URL` / `KV_REST_API_TOKEN` | **Üretimde zorunlu.** Vercel KV bağlantı bilgileri — Vercel'de bir KV Store bağladığınızda otomatik eklenir, elle girmeniz gerekmez. Bkz. [Vercel KV Kurulumu](#vercel-kv-kurulumu-kalıcı-veri-deposu) | — (tanımsızsa bellek içi depolamaya düşer) |
| `POSTGRES_URL` / `POSTGRES_PRISMA_URL` / `POSTGRES_URL_NON_POOLING` | (Opsiyonel, alternatif) Vercel Postgres kullanacaksanız — bkz. [Gerçek Veritabanına Geçiş](#gerçek-veritabanına-geçiş-alternatif-postgressupabase) | — |
| `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY` / `SUPABASE_SERVICE_ROLE_KEY` | (Opsiyonel, alternatif) Supabase kullanacaksanız | — |

`INVITE_CODE` değerini üretim ortamında mutlaka varsayılandan farklı, tahmin edilmesi zor bir değere değiştirin.

> **Üretim için önemli:** `KV_REST_API_URL` / `KV_REST_API_TOKEN` tanımlı değilse uygulama bellek içi depolamaya düşer. Vercel'in sunucusuz ortamında bu, istekler farklı örneklere (instance) dağıldığında **verinin kaybolması veya tutarsız görünmesi** (örn. pano "Ekip Üyeleri (0)" gösterir, ya da konum paylaşımı birkaç saniye sonra kapanmış gibi davranır) anlamına gelir. Vercel'e deploy ederken KV Store bağlamak bu yüzden bir seçenek değil, **zorunlu bir adımdır** — aşağıdaki bölümü uygulayın.

---

## Kullanım

1. **Ekibe katılma:** Her ekip üyesi kendi telefonunda uygulamanın adresini açar, `/join` sayfasında adını ve sizin kendisine ilettiğiniz davet kodunu girer.
2. **Rıza ve izin:** Katılımdan sonra ekrana konum paylaşımının ne anlama geldiğini açıklayan bir bilgilendirme ve "Konum Paylaşımını Aç" butonu gelir. Butona bastığında tarayıcının **kendi native izin penceresi** açılır; kullanıcı izin verip vermeyeceğine kendisi karar verir.
3. **Paylaşım:** İzin verildiğinde, sayfa açık kaldığı sürece cihaz periyodik olarak konumunu sunucuya gönderir. Ekranda paylaşımın aktif olduğu ve son gönderim zamanı açıkça gösterilir.
4. **Paylaşımı kapatma:** Kullanıcı istediği an "Konum Paylaşımını Kapat" butonuna basarak paylaşımı durdurabilir. Kapatıldığı anda sunucudaki son konum kaydı silinir.
5. **Pano:** `/dashboard` sayfasında, paylaşımı açık olan üyelerin son konumları haritada, kişi listesi de yan panelde görüntülenir. Panoya erişim için ayrıca konum paylaşmak gerekmez — bir yöneticinin sadece panoyu izlemesi de mümkündür.
6. **Telefona yükleme (PWA):** Ekip üyeleri, tarayıcı menüsünden "Ana Ekrana Ekle" seçeneğiyle uygulamayı telefonlarına yükleyebilir; bu sayede simgesiyle uygulama gibi açılır (App Store/Play Store gerekmez).

---

## Vercel KV Kurulumu (Kalıcı Veri Deposu)

Uygulama, üyeleri ve konumları **Vercel KV (Redis tabanlı, ücretsiz katmanı yeterli)** üzerinde saklayacak şekilde yapılandırılmıştır. Bu adım **atlanamaz** — atlanırsa uygulama otomatik olarak bellek içi depolamaya düşer ve Vercel'in sunucusuz ortamında veriler örnekler arasında tutarsız görünür (bkz. yukarıdaki uyarı kutusu).

Kurulum, projeyi Vercel'e ilk deploy ettikten sonra yapılır (bkz. [Vercel'e Deploy](#vercele-deploy)):

1. Vercel Dashboard'da projenizi açın.
2. Üst menüden **Storage** sekmesine gidin.
3. **Create Database** → **KV** (Redis) seçin. Ücretsiz (Hobby) katman küçük bir ekip için fazlasıyla yeterlidir.
4. Veritabanına bir isim verin (örn. `ekip-konum-kv`) ve bölge (region) olarak projenizin kendi bölgesini seçin.
5. Oluşturduktan sonra **Connect Project** ile bu KV Store'u `ekip-konum-takibi` projenize bağlayın. Vercel bu adımda `KV_REST_API_URL` ve `KV_REST_API_TOKEN` ortam değişkenlerini **otomatik olarak** projenizin Production/Preview/Development ortamlarına ekler — elle bir şey girmenize gerek yoktur.
6. Vercel projenizde **Deployments** sekmesine gidip en son deploy'un yanındaki menüden **Redeploy** yapın (veya `main` branch'e boş bir commit push edin). Bu adım şarttır: KV bağlantısı yalnızca yeni bir deploy ile devreye girer, mevcut çalışan deploy'u otomatik güncellemez.
7. Redeploy tamamlandıktan sonra `/join` üzerinden katılıp konum paylaşımını açın; `/dashboard` artık üyeyi ve konumunu kalıcı ve tutarlı şekilde göstermelidir.

Yerel geliştirmede KV kullanmak isterseniz: adım 5'teki değerleri `vercel env pull .env.local` komutuyla yerel `.env.local` dosyanıza çekebilirsiniz; istemezseniz uygulama yerelde otomatik olarak bellek içi depolamaya düşmeye devam eder (geliştirme için sorun değildir).

---

## Gerçek Veritabanına Geçiş (Alternatif: Postgres/Supabase)

Vercel KV bu proje için varsayılan ve önerilen çözümdür. Ancak dilerseniz `lib/store.ts` içindeki fonksiyonları (`createMember`, `getMember`, `upsertLocation`, `listMembersWithLocations` vb.) aynı imzalarla koruyarak Postgres/Supabase gibi başka bir veritabanına da geçirebilirsiniz. API route dosyaları (`app/api/**/route.ts`) bu fonksiyonları çağırdığı için **hiçbir değişiklik gerektirmez**.

1. **Vercel Postgres veya Supabase (ücretsiz katman) seçin** ve projenizi oluşturun.
2. Bağlantı bilgilerini `.env.local` (yerelde) ve Vercel projonuzun **Environment Variables** panelinde (üretimde) tanımlayın.
3. `lib/store.ts` içindeki `hasKv` kontrolüne benzer şekilde, yeni backend'i kullanacak bir dal ekleyin ya da KV çağrılarının yerine geçirin.
4. Önerilen basit tablo şeması:

```sql
create table team_members (
  id text primary key,
  name text not null,
  joined_at timestamptz not null default now(),
  sharing_enabled boolean not null default false
);

create table member_locations (
  member_id text primary key references team_members(id) on delete cascade,
  latitude double precision not null,
  longitude double precision not null,
  accuracy double precision,
  updated_at timestamptz not null default now()
);
```

---

## Vercel'e Deploy

1. **GitHub'a yükleyin:** Bu proje klasörünü kendi GitHub reponuza push edin (aşağıdaki [Güvenlik ve Rıza İlkeleri](#güvenlik-ve-rıza-i̇lkeleri) bölümünü okuyun — `.env.local` asla commit edilmemelidir; `.gitignore` bunu zaten engeller).

   ```bash
   git init
   git add .
   git commit -m "İlk sürüm: Ekip Konum Takibi"
   git branch -M main
   git remote add origin <kendi-repo-adresiniz>
   git push -u origin main
   ```

2. **Vercel'de yeni proje oluşturun:** [vercel.com](https://vercel.com) üzerinden GitHub hesabınızla giriş yapın, "New Project" ile bu reponuzu seçin. Next.js projesi otomatik olarak algılanır, ek bir yapılandırma gerekmez.

3. **Ortam değişkenlerini girin:** Vercel proje ayarlarında **Settings → Environment Variables** kısmına, `.env.local.example` dosyasındaki değişkenleri (kendi gerçek değerlerinizle) tek tek ekleyin. En azından `INVITE_CODE` değerini üretim için değiştirmeniz önerilir.

4. **Deploy edin:** "Deploy" butonuna basın. Vercel projeyi otomatik olarak derler (`npm run build`) ve yayınlar. Deploy tamamlandığında size `https://<proje-adiniz>.vercel.app` gibi bir HTTPS adresi verilir — Geolocation API'nin çalışması için HTTPS zaten şarttır ve Vercel bunu otomatik sağlar.

5. **Ekiple paylaşın:** Verilen adresi ve belirlediğiniz davet kodunu ekip üyelerinizle paylaşın; her biri kendi telefonundan `/join` adresine girip katılabilir.

Her yeni `git push` işleminde Vercel otomatik olarak yeniden deploy eder.

---

## Güvenlik ve Rıza İlkeleri

Bu uygulama tasarım gereği şu ilkelere uyar:

- **Açık rıza:** Konum paylaşımı yalnızca kullanıcı tarayıcının izin penceresinde açıkça onay verdiğinde başlar. Hiçbir konum, izin olmadan toplanmaz veya tahmin edilmez.
- **Her zaman geri alınabilir:** Kullanıcı arayüzde her zaman görünür bir "Konum Paylaşımını Kapat" seçeneğine sahiptir. Kapatıldığında sunucudaki son konum kaydı hemen silinir; "gizlice" arka planda konum toplanmaz.
- **Şeffaflık:** Katılım ekranında, konum paylaşıldığında tam olarak ne olacağı (kimin görebileceği, ne sıklıkla gönderileceği) açıkça yazılıdır.
- **Kapsam sınırlaması:** Uygulama yalnızca GPS/tarayıcı konum izni verilen cihazların konumunu gösterir. OSINT, telefon numarasından konum çıkarımı, veri ihlali taraması, risk skorlama veya kamuya açık veri kazıma gibi özellikler bilerek **eklenmemiştir ve eklenmeyecektir**. Bu, bir gözetim/istihbarat aracı değil, rızaya dayalı bir ekip içi koordinasyon aracıdır.
- **Küçük, kapalı ekip:** `MAX_TEAM_MEMBERS` ile ekip boyutu kasıtlı olarak küçük tutulur (varsayılan 4); bu genel amaçlı bir izleme platformu değildir.
- **Sır yönetimi:** `.env.local` dosyası `.gitignore` içindedir ve asla GitHub'a gönderilmez. `.env.local.example` şablonunda hiçbir gerçek anahtar/sır bulunmaz — yalnızca alan adları ve güvenli varsayılan değerler vardır.

---

## ÖNEMLİ: API Anahtarlarınızı Rotate Edin

Bu proje geliştirilirken yaptığınız önceki yazışmalarda, bazı gerçek kimlik bilgilerini (Gemini API anahtarı, Groq API anahtarı, bir GitHub Personal Access Token'ı ve bir Vercel token'ı) açık metin olarak paylaştığınız tespit edildi.

**Bu anahtarlar bu projeye hiçbir şekilde eklenmedi, kullanılmadı veya koda yazılmadı.** Ancak bir sohbet ortamında açık metin olarak paylaşılmış olmaları, bu anahtarların artık güvenli kabul edilemeyeceği anlamına gelir.

Eğer bu anahtarları **henüz iptal edip yenilemediyseniz (rotate)**, lütfen mümkün olan en kısa sürede aşağıdaki adımları uygulayın:

1. **Gemini API anahtarı:** Google AI Studio / Google Cloud Console üzerinden mevcut anahtarı silin ve yeni bir anahtar oluşturun.
2. **Groq API anahtarı:** Groq Console üzerinden mevcut anahtarı iptal edin ve yeni bir anahtar oluşturun.
3. **GitHub Personal Access Token:** GitHub → Settings → Developer settings → Personal access tokens üzerinden mevcut token'ı iptal edin (revoke) ve gerekiyorsa yeni, en az yetkiye sahip bir token oluşturun.
4. **Vercel token:** Vercel → Account Settings → Tokens üzerinden mevcut token'ı silin ve gerekiyorsa yeni bir token oluşturun.

Yeni anahtarları yalnızca kendi `.env.local` dosyanızda veya Vercel projenizin Environment Variables panelinde saklayın — asla bir sohbette, kodda veya genel bir dosyada paylaşmayın.

---

## Sınırlamalar ve Yol Haritası

- Vercel KV bağlanmadan (yalnızca bellek içi depolamayla) üretimde kullanılması **önerilmez** — bkz. [Vercel KV Kurulumu](#vercel-kv-kurulumu-kalıcı-veri-deposu). Yerel geliştirmede bellek içi mod pratik ve yeterlidir.
- Konum yalnızca ilgili sayfa/PWA tarayıcıda açıkken gönderilir; tarayıcı tamamen kapatıldığında veya cihaz kilitlendiğinde periyodik gönderim durabilir (bu, tarayıcıların arka plan kısıtlamalarından kaynaklanır ve kasıtlı bir mahremiyet-dostu davranıştır — arka planda gizlice takip yapılmaz).
- Kimlik doğrulama basit tutulmuştur (davet kodu + ad); daha büyük veya daha resmi bir kurulum isterseniz gerçek bir kimlik doğrulama sistemi (ör. NextAuth) eklenebilir.
- Bu proje kasıtlı olarak küçük ve odaklı tutulmuştur; OSINT/gözetim yönünde herhangi bir genişletme talebi bu projenin amacı dışındadır ve uygulanmayacaktır.