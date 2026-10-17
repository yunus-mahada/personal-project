# 🚀 Personal Project — Management Hub

Aplikasi manajemen proyek personal & produktivitas eksekutif **Personal Project** dengan arsitektur **PWA (Offline-First)**, pelacakan Goal-Project-Task (Eisenhower Matrix), kalender time-blocking, analitik performa, dan sinkronisasi cloud dengan **Supabase**.

---

## 💻 1. Cara Menjalankan di Localhost (CMD / PowerShell)

### Prasyarat
- **Node.js** (v18 ke atas, disarankan v20+)
- **NPM** (sudah otomatis terpasang bersama Node.js)

### Langkah-langkah di CMD atau PowerShell:
1. Buka CMD atau PowerShell di folder proyek ini:
   ```powershell
   cd "c:\Users\DATA ANALYST - MHD\. Aplikasi Webbase\Project Management - MHD"
   ```

2. Pasang semua dependensi proyek (hanya perlu sekali):
   ```powershell
   npm install
   ```

3. Jalankan server pengembangan lokal (Dev Server):
   ```powershell
   npm run dev
   ```

4. Buka browser dan akses alamat berikut:
   ```
   http://localhost:3000
   ```

### Perintah Tambahan:
- **Build untuk Production:** `npm run build`
- **Preview Hasil Build Production:** `npm run preview`
- **Pemeriksaan Tipe TypeScript:** `npm run lint`

---

## 🗄️ 2. Cara Setting ke Supabase (Database Cloud)

Aplikasi ini dapat berjalan 100% offline menggunakan IndexedDB browser, dan dapat dihubungkan ke **Supabase** untuk sinkronisasi awan.

### Langkah Setup Supabase:
1. **Buat Akun & Proyek:**
   - Kunjungi [https://supabase.com](https://supabase.com) dan buat proyek baru (misal: `mahada-pm`).
2. **Jalankan Skrip Tabel Database:**
   - Di dashboard Supabase, buka menu **SQL Editor** (ikon terminal/SQL di menu kiri).
   - Klik **New Query**.
   - Buka file [supabase/schema.sql](supabase/schema.sql) di proyek ini, salin seluruh kodenya, lalu tempel ke SQL Editor Supabase.
   - Klik tombol **Run** (hijau) sampai muncul status *Success*.
3. **Ambil Kredensial API:**
   - Masuk ke menu **Project Settings** (ikon roda gigi di kiri bawah) → **API**.
   - Salin **Project URL** (contoh: `https://xxxxxx.supabase.co`).
   - Salin **anon public key** (token panjang di bagian Project API keys).
4. **Masukkan ke file `.env` lokal:**
   Buka file `.env` di proyek Anda dan masukkan nilainya:
   ```env
   VITE_SUPABASE_URL=https://proyek-anda.supabase.co
   VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6...
   ```
5. **Uji Koneksi:**
   Buka aplikasi di browser → Masuk ke menu **Pengaturan (Settings)** → Pada kartu **Supabase Cloud Database**, klik tombol **Tes Koneksi Cloud** atau **Unggah Data Lokal ke Supabase (Push)**.

---

## 🐙 3. Cara Setting & Upload ke GitHub

Pastikan Anda sudah memiliki akun di [GitHub.com](https://github.com) dan Git terpasang di komputer Anda.

### Langkah-langkah Push ke GitHub:

1. **Buat Repositori Baru di GitHub:**
   - Buka [https://github.com/new](https://github.com/new).
   - Isi *Repository name* (misal: `project-management-mhd`).
   - Pilih *Private* (disarankan untuk data bisnis personal) atau *Public*.
   - **Jangan** centang "Add a README file" atau .gitignore (karena sudah ada di lokal).
   - Klik **Create repository**.

2. **Jalankan Perintah Git di CMD / PowerShell:**
   ```powershell
   # 1. Tambahkan semua file yang sudah siap ke git
   git add .

   # 2. Buat commit pertama
   git commit -m "feat: initial commit ready for supabase, github, and vercel"

   # 3. Ubah nama branch utama menjadi main
   git branch -M main

   # 4. Hubungkan remote repository GitHub (ganti URL dengan URL repo Anda)
   git remote add origin https://github.com/USERNAME-ANDA/project-management-mhd.git

   # 5. Push ke GitHub
   git push -u origin main
   ```

> 🔒 *Catatan Keamanan:* File `.env` yang berisi rahasia API key sudah otomatis dikecualikan oleh [.gitignore](.gitignore) sehingga tidak akan terunggah ke GitHub publik.

---

## ⚡ 4. Cara Deploy ke Vercel

Proyek ini sudah dilengkapi file konfigurasi [vercel.json](vercel.json) dengan aturan *Single Page Application (SPA) Rewrites* agar routing halaman dan refresh tidak mengalami error 404.

### Langkah Deploy di Vercel:
1. Masuk ke [https://vercel.com](https://vercel.com) menggunakan akun GitHub Anda.
2. Klik tombol **Add New...** → **Project**.
3. Pilih repositori GitHub yang baru saja Anda push (`project-management-mhd`) dan klik **Import**.
4. Di bagian konfigurasi proyek:
   - **Framework Preset:** `Vite` (terdeteksi otomatis)
   - **Root Directory:** `./`
   - **Build Command:** `npm run build`
   - **Output Directory:** `dist`
5. **Tambahkan Environment Variables (Penting):**
   Buka menu dropdown **Environment Variables** dan tambahkan:
   - Name: `VITE_SUPABASE_URL` | Value: *(URL Supabase Anda)*
   - Name: `VITE_SUPABASE_ANON_KEY` | Value: *(Anon Key Supabase Anda)*
   - *(Opsional)* Name: `APP_URL` | Value: *(URL domain Vercel Anda)*
6. Klik tombol **Deploy**.
7. Dalam kurun waktu 1-2 menit, aplikasi Anda akan live dengan URL seperti `https://project-management-mhd.vercel.app`!
