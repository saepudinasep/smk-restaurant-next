/**
 * Mengisi `category` pada menu yang sudah ada di database SETELAH kolom kategori ditambahkan.
 * Sekali jalan, tidak menghapus data, dan hanya menyentuh menu yang belum punya kategori.
 *
 * Kenapa perlu: MongoDB tidak mengisi field baru ke dokumen lama, dan Prisma gagal membaca menu
 * tanpa `category`. Jalankan: npx tsx prisma/backfill-menu-category.ts
 *
 * Kategori ditebak dari nama (minuman: es/jus/teh/kopi/susu/air; dessert: puding/es campur/es krim/
 * pisang goreng/kue); selebihnya Food. Periksa hasilnya dan perbaiki lewat Manage Menu bila ada yang keliru.
 * (Alternatif tanpa skrip ini untuk database development: `npx prisma db seed` mengisi ulang semuanya.)
 */
import 'dotenv/config';

import { PrismaClient } from '../src/generated/prisma/client';

const prisma = new PrismaClient();

type RawMenu = { _id: { $oid: string }; name: string };
type Category = 'Food' | 'Drink' | 'Dessert';

const DESSERT = /(puding|es campur|es krim|pisang goreng|kue|cake|brownies)/i;
const DRINK = /(^es |\bes\b|jus|teh|kopi|susu|\bair\b|juice|tea|coffee)/i;

// Dessert diperiksa lebih dulu karena "Es Campur" juga berawalan "Es"
const guess = (name: string): Category =>
  DESSERT.test(name) ? 'Dessert' : DRINK.test(name) ? 'Drink' : 'Food';

async function main() {
  // find mentah: Prisma biasa akan gagal membaca dokumen yang belum punya field wajib
  const result = (await prisma.$runCommandRaw({
    find: 'Menu',
    filter: { category: { $exists: false } },
    projection: { name: 1 },
  })) as unknown as { cursor: { firstBatch: RawMenu[] } };

  const menus = result.cursor.firstBatch;
  if (menus.length === 0) {
    console.log('Semua menu sudah punya kategori. Tidak ada yang diubah.');
    return;
  }

  for (const m of menus) {
    const category = guess(m.name);
    await prisma.$runCommandRaw({
      update: 'Menu',
      updates: [{ q: { _id: { $oid: m._id.$oid } }, u: { $set: { category } } }],
    });
    console.log(`  ${m.name.padEnd(28)} -> ${category}`);
  }
  console.log(`Selesai: ${menus.length} menu diperbarui. Periksa kategorinya di Manage Menu.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
