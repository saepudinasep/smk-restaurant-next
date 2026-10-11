/**
 * Membuat akun Admin pertama. AMAN dijalankan di produksi: tidak menghapus apa pun dan tidak
 * melakukan apa-apa bila email itu sudah terdaftar.
 *
 * Jalankan:  npm run create-admin
 * Membaca dari .env / lingkungan:
 *   ADMIN_EMAIL, ADMIN_PASSWORD (wajib), ADMIN_NAME, ADMIN_HANDPHONE (opsional)
 */
import 'dotenv/config';

import { hash } from 'bcryptjs';

import { PrismaClient } from '../src/generated/prisma/client';
import { nextEmployeeCode } from '../src/lib/codes';
import { isStrongPassword } from '../src/lib/password-rules';

const prisma = new PrismaClient();

function fail(message: string): never {
  console.error(`Gagal: ${message}`);
  process.exit(1);
}

async function main() {
  const email = (process.env.ADMIN_EMAIL ?? '').trim().toLowerCase();
  const password = process.env.ADMIN_PASSWORD ?? '';
  const name = (process.env.ADMIN_NAME ?? 'Administrator').trim();
  const handphone = (process.env.ADMIN_HANDPHONE ?? '0800000000000').trim();

  // Batas mengikuti data dictionary: Email 50, Name 100, Handphone 10-13 digit
  if (!email || email.length > 50 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
    fail('ADMIN_EMAIL wajib diisi dengan email yang valid (maksimal 50 karakter).');
  if (!name || name.length > 100) fail('ADMIN_NAME wajib diisi (maksimal 100 karakter).');
  if (!/^\d{10,13}$/.test(handphone)) fail('ADMIN_HANDPHONE harus 10-13 digit angka.');
  // Untuk akun Admin di produksi, password minimal 8 karakter selain aturan besar-kecil-angka
  if (password.length < 8 || !isStrongPassword(password))
    fail('ADMIN_PASSWORD minimal 8 karakter dan wajib mengandung huruf besar, huruf kecil, dan angka (maksimal 50).');

  const existing = await prisma.employee.findUnique({ where: { email }, select: { employeeCode: true, position: true } });
  if (existing) {
    console.log(`Tidak ada yang dibuat: ${email} sudah terdaftar (${existing.employeeCode}, ${existing.position}).`);
    return;
  }

  const latest = await prisma.employee.findFirst({ orderBy: { employeeCode: 'desc' }, select: { employeeCode: true } });
  const created = await prisma.employee.create({
    data: {
      employeeCode: nextEmployeeCode(latest ? [latest.employeeCode] : []),
      name,
      email,
      password: await hash(password, 10),
      handphone,
      position: 'Admin',
    },
    select: { employeeCode: true },
  });

  console.log(`Admin dibuat: ${created.employeeCode} (${email}). Ganti password dan nomor handphone lewat halaman Account.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
