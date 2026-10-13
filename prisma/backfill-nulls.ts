/**
 * Membersihkan dokumen LAMA yang field opsionalnya tidak ada (unset): order yang dibuat lewat halaman Orders
 * sebelum perbaikan (payment, bank) dan notifikasi (readAt). Sekali jalan, tidak menghapus data,
 * dan aman diulang.
 *
 * TIDAK WAJIB: kode aplikasi sekarang sudah menangani dokumen seperti itu (lib/prisma-filters.ts).
 * Skrip ini hanya merapikan data supaya konsisten. Jalankan: npx tsx prisma/backfill-nulls.ts
 */
import 'dotenv/config';

import { PrismaClient } from '../src/generated/prisma/client';

const prisma = new PrismaClient();

type UpdateResult = { n?: number; nModified?: number };

async function fix(collection: string, missingField: string, set: Record<string, null>) {
  const result = (await prisma.$runCommandRaw({
    update: collection,
    updates: [{ q: { [missingField]: { $exists: false } }, u: { $set: set }, multi: true }],
  })) as unknown as UpdateResult;
  console.log(`  ${collection}.${missingField}: ${result.nModified ?? 0} dokumen diperbaiki (dari ${result.n ?? 0} yang cocok)`);
}

async function main() {
  console.log('Mengisi null eksplisit pada field opsional yang hilang...');
  await fix('HeaderOrder', 'payment', { payment: null, bank: null }); // order belum dibayar
  await fix('Notification', 'readAt', { readAt: null }); // notifikasi belum dibaca
  console.log('Selesai.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
