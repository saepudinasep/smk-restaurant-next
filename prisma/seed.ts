/**
 * Seed data awal dari prisma/seed-data.ts ke MongoDB.
 * Jalankan: npx prisma db seed
 *
 * PERINGATAN: skrip ini MENGHAPUS semua data di koleksi terkait lalu mengisinya ulang.
 * Prisma memakai transaksi MongoDB, jadi butuh replica set. MongoDB Atlas (termasuk M0 gratis)
 * sudah replica set.
 */
import { hash } from 'bcryptjs';
import * as readline from 'node:readline/promises';

import { PrismaClient } from '../src/generated/prisma/client';
import * as d from './seed-data';

const prisma = new PrismaClient();

// Password awal (HANYA untuk dev/demo, wajib diganti lewat halaman Account).
const DEFAULT_PASSWORD = process.env.SEED_DEFAULT_PASSWORD ?? 'Smk12345';

// Nilai di UI -> nama enum di schema (nama enum tidak boleh berspasi)
const paymentType = {
  Cash: 'Cash',
  'Credit Card': 'CreditCard',
  'Debit Card': 'DebitCard',
} as const;

const date = (iso: string) => new Date(`${iso}T00:00:00.000Z`);

async function reset() {
  // urutan: tabel anak dulu agar tidak melanggar relasi
  await prisma.notification.deleteMany();
  await prisma.detailOrder.deleteMany();
  await prisma.headerOrder.deleteMany();
  await prisma.menu.deleteMany();
  await prisma.member.deleteMany();
  await prisma.employee.deleteMany();
}

/**
 * Seed MENGHAPUS semua data di database tujuan. Sebelum mulai, nama database ditampilkan dan harus
 * diketik ulang (atau isi SEED_CONFIRM dengan nama database itu untuk menjalankannya tanpa pertanyaan).
 * Ini mencegah tidak sengaja menghapus database produksi bila DATABASE_URL tertukar.
 */
async function confirmTarget() {
  let host = '(tidak dikenal)';
  let dbName = '(tanpa nama)';
  try {
    const url = new URL(process.env.DATABASE_URL ?? '');
    host = url.host;
    dbName = url.pathname.replace(/^\//, '') || dbName;
  } catch {
    // DATABASE_URL tidak bisa dibaca; Prisma akan gagal sendiri nanti
  }
  if (process.env.SEED_CONFIRM === dbName) return;

  console.log(`Seed akan MENGHAPUS semua data di database "${dbName}" pada ${host}.`);
  if (!process.stdin.isTTY) {
    console.error(`Terminal tidak interaktif. Isi SEED_CONFIRM="${dbName}" untuk melanjutkan.`);
    process.exit(1);
  }
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  const answer = await rl.question(`Ketik nama database (${dbName}) untuk melanjutkan: `);
  rl.close();
  if (answer.trim() !== dbName) {
    console.log('Dibatalkan. Tidak ada data yang diubah.');
    process.exit(1);
  }
}

async function main() {
  await confirmTarget();
  console.log('Menghapus data lama...');
  await reset();

  const passwordHash = await hash(DEFAULT_PASSWORD, 10);

  // --- karyawan (sekaligus akun login) ---
  const employeeIds = new Map<string, string>(); // EmployeeID (E00001) -> ObjectId
  for (const e of d.employees) {
    const row = await prisma.employee.create({
      data: {
        employeeCode: e.employeeId,
        name: e.name,
        email: e.email,
        password: passwordHash,
        handphone: e.handphone,
        position: e.position,
      },
    });
    employeeIds.set(e.employeeId, row.id);
  }

  // --- notifikasi sambutan untuk tiap karyawan (belum dibaca) ---
  await prisma.notification.createMany({
    data: [...employeeIds.values()].map((recipientId) => ({
      recipientId,
      type: 'system' as const,
      title: 'Welcome to SMK Restaurant',
      message:
        'Your account has been created. Change the default password and review your details in Account.',
    })),
  });

  // --- member ---
  const memberIds = new Map<string, string>(); // MemberID (M0000001) -> ObjectId
  for (const m of d.members) {
    const row = await prisma.member.create({
      data: {
        memberCode: m.memberId,
        name: m.name,
        email: m.email,
        handphone: m.handphone,
        joinDate: date(m.joinDate),
      },
    });
    memberIds.set(m.memberId, row.id);
  }

  // --- menu (foto = path di /public/menus) ---
  const menuIds = new Map<number, string>(); // MenuID (1..12) -> ObjectId
  for (const m of d.menus) {
    const row = await prisma.menu.create({
      data: {
        menuNumber: m.menuId,
        name: m.name,
        price: m.price,
        category: m.category,
        photo: `/menus/${m.photo}`,
      },
    });
    menuIds.set(m.menuId, row.id);
  }

  // --- order ---
  await prisma.headerOrder.createMany({
    data: d.headerOrders.map((h) => ({
      orderCode: h.orderId,
      employeeId: employeeIds.get(h.employeeId)!,
      memberId: memberIds.get(h.memberId)!,
      date: date(h.date),
      payment: h.payment ? paymentType[h.payment] : null,
      bank: h.bank,
    })),
  });
  const orderIds = new Map(
    (await prisma.headerOrder.findMany({ select: { id: true, orderCode: true } })).map((o) => [
      o.orderCode,
      o.id,
    ]),
  );

  await prisma.detailOrder.createMany({
    data: d.detailOrders.map((x) => ({
      orderId: orderIds.get(x.orderId)!,
      menuId: menuIds.get(x.menuId)!,
      qty: x.qty,
      price: x.price,
      status: x.status,
    })),
  });

  console.log('Selesai:');
  console.log(`  ${await prisma.employee.count()} karyawan`);
  console.log(`  ${await prisma.member.count()} member`);
  console.log(`  ${await prisma.menu.count()} menu`);
  console.log(`  ${await prisma.notification.count()} notifikasi`);
  console.log(
    `  ${await prisma.headerOrder.count()} order, ${await prisma.detailOrder.count()} rincian order`,
  );
  console.log(`Login contoh: ${d.employees[0].email} / ${DEFAULT_PASSWORD}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
