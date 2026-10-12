import 'server-only';

import Pusher from 'pusher';

import { NOTIFICATION_EVENT, userChannel, type RealtimePayload } from '@/lib/pusher-shared';

export const isPusherConfigured = () =>
  Boolean(
    process.env.PUSHER_APP_ID &&
      process.env.PUSHER_SECRET &&
      process.env.NEXT_PUBLIC_PUSHER_KEY &&
      process.env.NEXT_PUBLIC_PUSHER_CLUSTER,
  );

let instance: Pusher | null = null;

/** Klien Pusher untuk server; null bila belum dikonfigurasi (aplikasi tetap jalan, hanya tanpa realtime). */
export function getPusher(): Pusher | null {
  if (!isPusherConfigured()) return null;
  instance ??= new Pusher({
    appId: process.env.PUSHER_APP_ID!,
    key: process.env.NEXT_PUBLIC_PUSHER_KEY!,
    secret: process.env.PUSHER_SECRET!,
    cluster: process.env.NEXT_PUBLIC_PUSHER_CLUSTER!,
    useTLS: true,
  });
  return instance;
}

/** Menerbitkan satu kejadian ke kanal pribadi tiap penerima (Pusher menerima maksimal 100 kanal per panggilan). */
export async function publishRealtime(employeeIds: string[], payload: RealtimePayload) {
  const pusher = getPusher();
  if (!pusher || employeeIds.length === 0) return;
  const channels = employeeIds.map(userChannel);
  for (let i = 0; i < channels.length; i += 100) {
    await pusher.trigger(channels.slice(i, i + 100), NOTIFICATION_EVENT, payload);
  }
}
