# SMK Restaurant

Aplikasi web untuk mengelola operasional restoran: pemesanan, pembayaran, dapur, menu, member, karyawan, laporan, dan notifikasi. Hak akses dibedakan berdasarkan peran **Admin**, **Cashier**, dan **Chef**.

## Fitur

- Dashboard dan navigasi berdasarkan peran pengguna.
- Pengelolaan karyawan, member, dan menu makanan/minuman/dessert.
- Pembuatan order, pemantauan status pesanan di dapur, riwayat, dan pembayaran tunai maupun kartu.
- Laporan penjualan dan notifikasi aplikasi.
- Notifikasi real-time melalui Pusher dan web push (jika dikonfigurasi).
- Unggah foto menu ke Cloudinary (jika dikonfigurasi).
- Proteksi bot Arcjet pada route halaman dan API, serta log akses route terstruktur di log server.

## Teknologi

- Next.js 16, React 19, dan TypeScript
- MongoDB dengan Prisma ORM
- NextAuth.js untuk autentikasi
- Tailwind CSS dan komponen UI berbasis shadcn
- Arcjet, Pusher, Cloudinary, dan Web Push untuk layanan pendukung

## Persyaratan

- Node.js 20.9 atau lebih baru
- npm
- Database MongoDB. MongoDB Atlas direkomendasikan; seed data menggunakan transaksi dan memerlukan replica set.

## Menjalankan secara lokal

1. Pasang dependensi:

   ```bash
   npm install
   ```

2. Buat file `.env` di root proyek dan isi variabel yang diperlukan. Jangan commit file ini.

   ```env
   DATABASE_URL="mongodb+srv://..."
   AUTH_SECRET="buat-secret-random-yang-kuat"
   ARCJET_KEY="ajkey_..."
   ```

   Buat nilai `AUTH_SECRET` yang kuat, misalnya dengan `openssl rand -base64 32`. Isi `DATABASE_URL` dengan connection string MongoDB dan `ARCJET_KEY` dengan API key dari [Arcjet dashboard](https://console.arcjet.com/).

3. Jalankan server pengembangan:

   ```bash
   npm run dev
   ```

4. Buka [http://localhost:3000](http://localhost:3000).

Saat instalasi, Prisma Client dibuat melalui skrip `postinstall`. Jika perlu membuat ulang secara manual, jalankan:

```bash
npx prisma generate
```

## Variabel environment

| Variabel | Kapan diperlukan | Kegunaan |
| --- | --- | --- |
| `DATABASE_URL` | Wajib | Connection string database MongoDB. |
| `AUTH_SECRET` | Wajib untuk autentikasi | Secret NextAuth untuk menandatangani sesi/token. |
| `ARCJET_KEY` | Wajib untuk request halaman/API | Mengaktifkan deteksi dan pemblokiran bot Arcjet. Bot terdeteksi ditolak secara default. |
| `CLOUDINARY_CLOUD_NAME` | Opsional | Cloud name untuk unggah foto menu. |
| `CLOUDINARY_API_KEY` | Opsional | API key Cloudinary. |
| `CLOUDINARY_API_SECRET` | Opsional | API secret Cloudinary. Simpan hanya di environment server. |
| `CLOUDINARY_FOLDER_MODE` | Opsional | Isi `fixed` untuk akun Cloudinary dengan mode folder lama; default `dynamic`. |
| `PUSHER_APP_ID` | Opsional | App ID Pusher untuk event real-time. |
| `PUSHER_SECRET` | Opsional | Secret Pusher. Simpan hanya di environment server. |
| `NEXT_PUBLIC_PUSHER_KEY` | Opsional | Key Pusher yang digunakan client dan server. |
| `NEXT_PUBLIC_PUSHER_CLUSTER` | Opsional | Cluster Pusher. |
| `NEXT_PUBLIC_VAPID_PUBLIC_KEY` | Opsional | Public key VAPID untuk web push. |
| `VAPID_PRIVATE_KEY` | Opsional | Private key VAPID. Simpan hanya di environment server. |
| `VAPID_SUBJECT` | Opsional | Identitas pengirim VAPID, biasanya URL `mailto:` atau situs. |
| `ADMIN_EMAIL`, `ADMIN_PASSWORD` | Untuk membuat admin pertama | Email dan password admin; password harus kuat. |
| `ADMIN_NAME`, `ADMIN_HANDPHONE` | Opsional saat membuat admin | Nama dan nomor telepon admin. |
| `SEED_DEFAULT_PASSWORD` | Opsional untuk seed demo | Password awal untuk akun-akun demo yang dibuat oleh seed. |
| `SEED_CONFIRM` | Hanya untuk konfirmasi seed non-interaktif | Nama database yang harus cocok sebelum seed menghapus data. |

Cloudinary, Pusher, dan Web Push tidak diperlukan untuk menjalankan fitur inti, tetapi fitur yang terkait tidak akan aktif tanpa konfigurasi layanannya.

## Database dan akun admin

Untuk membuat data demo:

```bash
npx prisma db seed
```

**Peringatan:** seed menghapus data pada koleksi terkait sebelum mengisinya kembali. Pastikan `DATABASE_URL` mengarah ke database pengembangan yang benar. Seed meminta konfirmasi nama database saat dijalankan di terminal interaktif; untuk eksekusi non-interaktif, atur `SEED_CONFIRM` ke nama database yang sama.

Untuk membuat akun Admin pertama tanpa menghapus atau mengubah data yang sudah ada, isi variabel `ADMIN_EMAIL` dan `ADMIN_PASSWORD` (serta `ADMIN_NAME` dan `ADMIN_HANDPHONE` bila diperlukan), kemudian jalankan:

```bash
npm run create-admin
```

Password admin minimal 8 karakter serta harus mengandung huruf besar, huruf kecil, dan angka. Jika email tersebut sudah terdaftar, skrip tidak membuat akun duplikat.

## Perintah yang tersedia

| Perintah | Kegunaan |
| --- | --- |
| `npm run dev` | Menjalankan server pengembangan. |
| `npm run lint` | Menjalankan ESLint. |
| `npm run build` | Membuat Prisma Client dan build produksi Next.js. |
| `npm run start` | Menjalankan build produksi. |
| `npx prisma generate` | Membuat Prisma Client. |
| `npx prisma db seed` | Mengisi ulang database dengan data demo; lihat peringatan di atas. |
| `npm run create-admin` | Membuat akun Admin pertama. |

## Proteksi bot dan pencatatan route

Arcjet memeriksa request halaman dan API dalam mode `LIVE`. Request yang dikenali sebagai bot diblokir dengan status `403`; aturan saat ini tidak mengizinkan bot terdeteksi. Jika kebijakan bot perlu diubah, sesuaikan konfigurasi di `src/lib/arcjet.ts`.

Aplikasi menulis log JSON berisi method HTTP, path route tanpa query string, dan keputusan Arcjet ke output server. Log tersebut dapat dilihat melalui log runtime/deployment. Pastikan `ARCJET_KEY` tersedia baik saat menjalankan lokal maupun di environment deployment.

## Deployment

Deploy sebagai aplikasi Next.js pada platform yang mendukung Next.js. Atur variabel environment yang diperlukan pada platform tersebut, terutama `DATABASE_URL`, `AUTH_SECRET`, dan `ARCJET_KEY`. Untuk mengaktifkan integrasi opsional, tambahkan juga variabel Cloudinary, Pusher, atau VAPID sesuai fitur yang digunakan.
