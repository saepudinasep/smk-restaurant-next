import PusherClient from 'pusher-js';

// NEXT_PUBLIC_* dibaca saat build, jadi setelah mengubahnya aplikasi harus dibangun/deploy ulang.
const KEY = process.env.NEXT_PUBLIC_PUSHER_KEY;
const CLUSTER = process.env.NEXT_PUBLIC_PUSHER_CLUSTER;

/** Apakah realtime (Pusher) dikonfigurasi? Bila tidak, halaman memakai pemeriksaan berkala sebagai cadangan. */
export const isRealtimeConfigured = () => Boolean(KEY && CLUSTER);

let client: PusherClient | null | undefined;

/** Satu koneksi Pusher untuk seluruh aplikasi; null bila belum dikonfigurasi. */
export function getPusherClient(): PusherClient | null {
  if (client !== undefined) return client;
  client =
    KEY && CLUSTER
      ? new PusherClient(KEY, {
          cluster: CLUSTER,
          // kanal pribadi: server memeriksa sesi sebelum mengizinkan (lihat /api/pusher/auth)
          channelAuthorization: { endpoint: '/api/pusher/auth', transport: 'ajax' },
        })
      : null;
  return client;
}
