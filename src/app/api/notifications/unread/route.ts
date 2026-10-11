import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

/**
 * Jumlah notifikasi belum dibaca milik pengguna yang login, untuk lonceng di header.
 * Rute /api tidak dilewati proxy.ts, jadi sesi diperiksa di sini.
 */
export async function GET() {
  const session = await auth();
  if (!session?.user) return Response.json({ count: 0 }, { status: 401 });

  const count = await prisma.notification.count({ where: { recipientId: session.user.id, readAt: null } });
  return Response.json({ count }, { headers: { 'Cache-Control': 'no-store' } });
}
