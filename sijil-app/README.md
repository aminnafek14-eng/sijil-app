# SijilOnline — Sistem Janaan Sijil Automatik

Portal jana sijil digital. Admin upload gambar sijil (PNG/JPG), sistem tulis nama peserta atas gambar. Pengguna masukkan No. IC → muat turun sijil terus.

**Stack:** React + Vite · Supabase (auth, database, storage) · Cloudflare Pages

---

## Cara Setup (30 minit)

### Langkah 1 — Supabase

1. Pergi ke [supabase.com](https://supabase.com) → New Project
2. Buka **SQL Editor** → tampal dan jalankan fail `supabase/migrations/001_init.sql`
3. Pergi ke **Project Settings → API**
4. Salin **Project URL** dan **anon public key**

### Langkah 2 — Akaun Admin

1. Dalam Supabase Dashboard → **Authentication → Users**
2. Klik **Invite user** → masukkan emel admin
3. Admin akan terima emel jemputan untuk tetapkan kata laluan

### Langkah 3 — Persediaan Tempatan

```bash
git clone <repo-anda>
cd sijil-app

# Pasang pakej
npm install

# Salin dan isi nilai env
cp .env.example .env
# Edit .env dengan URL dan key Supabase anda

# Jalankan secara tempatan
npm run dev
```

### Langkah 4 — Deploy ke Cloudflare Pages

1. Push kod ke GitHub
2. Pergi ke [Cloudflare Dashboard](https://dash.cloudflare.com) → **Pages → Create a project**
3. Connect GitHub repo
4. Tetapan build:
   - **Build command:** `npm run build`
   - **Output directory:** `dist`
5. Tambah **Environment Variables:**
   ```
   VITE_SUPABASE_URL     = https://xxx.supabase.co
   VITE_SUPABASE_ANON_KEY = eyJ...
   ```
6. Klik **Save and Deploy** ✓

---

## Cara Guna

### Admin

1. Pergi ke `https://domain-anda.pages.dev/admin`
2. Log masuk dengan emel yang telah didaftarkan
3. Klik **Program Baharu** → isi nama dan tarikh
4. Dalam editor program:
   - Tab **Template**: Upload gambar sijil PNG/JPG
   - Laraskan kedudukan nama (geser slider atau klik terus pada pratonton)
   - Pilih saiz, fon, dan warna teks
5. Tab **Peserta**: Tambah peserta (seorang-seorang atau upload CSV)
6. Salin pautan portal: `https://domain-anda.pages.dev/jana/{program-id}`
7. Kongsi pautan kepada peserta

### Format CSV Peserta

```csv
nama,no_ic
Ahmad Faris bin Ramli,900215-01-1234
Nurul Ain binti Johari,950322-02-5678
```

### Pengguna / Peserta

1. Buka pautan yang dikongsi penganjur
2. Masukkan No. Kad Pengenalan
3. Klik **Jana Sijil Saya**
4. Muat turun PNG atau cetak terus

---

## Struktur Fail

```
sijil-app/
├── index.html
├── vite.config.js
├── public/
│   └── _redirects              ← Cloudflare Pages routing
├── src/
│   ├── main.jsx
│   ├── App.jsx                 ← Routing utama
│   ├── index.css               ← Gaya global
│   ├── lib/
│   │   ├── supabase.js         ← Semua panggilan Supabase
│   │   └── certCanvas.js       ← Enjin jana sijil (Canvas API)
│   └── pages/
│       ├── AdminLogin.jsx
│       ├── AdminDashboard.jsx
│       ├── ProgramEditor.jsx   ← Upload template + urus peserta
│       └── UserPortal.jsx      ← Portal pengguna jana sijil
└── supabase/
    └── migrations/
        └── 001_init.sql        ← Schema DB + RLS + Storage policies
```

---

## Cara Kerja Janaan Sijil

```
Pengguna masukkan IC
        ↓
Supabase RPC: check_recipient()
        ↓
Layak? → Ambil template_url dari programs table
        ↓
Canvas API: lukis gambar + tulis nama atas gambar
        ↓
toBlob() → muat turun sebagai PNG
        ↓
Supabase RPC: mark_cert_generated() — rekod masa jana
```

Tiada fail disimpan di server — sijil dijana 100% di browser pengguna.

---

## Kos Anggaran

| Perkhidmatan | Pelan Free |
|---|---|
| Cloudflare Pages | ✓ Percuma (unlimited deploy) |
| Supabase | ✓ Percuma sehingga 500MB DB + 1GB storage |
| Domain .my | ~RM40/tahun (pilihan) |

Sesuai untuk acara ~1,000 peserta sebulan tanpa kos langsung.
