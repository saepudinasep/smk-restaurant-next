import { redirect } from 'next/navigation';

import { auth } from '@/auth';
import type { RoleName } from '@/lib/access';
import { prisma } from '@/lib/prisma';

export type { RoleName };

/**
 * Pastikan pengguna sudah login dan perannya termasuk `roles`.
 * Panggil di setiap Server Action dan fungsi pengambilan data: proxy.ts saja tidak cukup,
 * karena Server Action bisa dipanggil langsung tanpa membuka halamannya.
 *
 * Peran dibaca ULANG dari database (bukan hanya dari token sesi), sehingga karyawan yang
 * dihapus atau diturunkan perannya langsung kehilangan akses tanpa menunggu sesinya habis.
 */
export async function requireRole(...roles: RoleName[]) {
  const session = await auth();
  if (!session?.user) redirect('/login');

  const employee = await prisma.employee.findUnique({
    where: { id: session.user.id },
    select: { position: true },
  });
  if (!employee || !roles.includes(employee.position)) throw new Error('Forbidden');

  return { ...session.user, role: employee.position };
}
