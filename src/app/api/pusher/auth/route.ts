import { auth } from '@/auth';
import { getPusher } from '@/lib/pusher';
import { userChannel } from '@/lib/pusher-shared';

export const dynamic = 'force-dynamic';

/**
 * Izin berlangganan kanal pribadi Pusher. Browser (pusher-js) mengirim socket_id dan channel_name;
 * izin HANYA diberikan untuk kanal milik pengguna yang login, sehingga tidak ada yang bisa
 * menyadap notifikasi karyawan lain. Rute /api tidak dilewati proxy.ts, jadi sesi diperiksa di sini.
 */
export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user) return new Response('Unauthorized', { status: 401 });

  const pusher = getPusher();
  if (!pusher) return new Response('Realtime is not configured', { status: 503 });

  const form = await req.formData();
  const socketId = String(form.get('socket_id') ?? '');
  const channel = String(form.get('channel_name') ?? '');
  if (!socketId || channel !== userChannel(session.user.id)) return new Response('Forbidden', { status: 403 });

  return Response.json(pusher.authorizeChannel(socketId, channel));
}
