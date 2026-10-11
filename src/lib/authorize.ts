import { compare } from 'bcryptjs';
import { z } from 'zod';

import { prisma } from '@/lib/prisma';

// Batas panjang mengikuti data dictionary: Email 50, Password 50.
// Email disimpan huruf kecil (dinormalkan saat seed dan saat karyawan dibuat), jadi di sini
// juga diubah ke huruf kecil agar login tidak peka huruf besar-kecil.
const credentialsSchema = z.object({
  email: z.string().trim().toLowerCase().min(1).max(50),
  password: z.string().min(1).max(50),
});

// Hash bcrypt "palsu": dipakai agar waktu respons sama baik email ada maupun tidak
// (mempersulit penebakan email lewat selisih waktu).
const DUMMY_HASH = '$2b$10$oSjq1sgjEA25IBEcqfQcRuMu4MBi0iyPykZZOHLlXgym7UhRCx1kS';

/** Memeriksa email + password. Mengembalikan data user untuk sesi, atau null bila gagal. */
export async function authorizeCredentials(raw: unknown) {
  const parsed = credentialsSchema.safeParse(raw);
  if (!parsed.success) return null;
  const { email, password } = parsed.data;

  const employee = await prisma.employee.findUnique({ where: { email } });

  const valid = await compare(password, employee?.password ?? DUMMY_HASH);
  if (!employee || !valid) return null;

  return {
    id: employee.id,
    employeeCode: employee.employeeCode,
    role: employee.position,
    name: employee.name,
    email: employee.email,
  };
}
