import 'server-only';

import webpush from 'web-push';

import { prisma } from '@/lib/prisma';

export type PushPayload = {
  title: string;
  body: string;
  url: string; // halaman yang dibuka saat notifikasi diklik
  requireInteraction?: boolean; // tetap tampil sampai ditutup (mis. order baru untuk Chef yang sedang memasak)
};

export const isWebPushConfigured = () =>
  Boolean(process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY && process.env.VAPID_SUBJECT);

let ready = false;
function init() {
  if (ready) return true;
  if (!isWebPushConfigured()) return false;
  webpush.setVapidDetails(
    process.env.VAPID_SUBJECT!,
    process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!,
    process.env.VAPID_PRIVATE_KEY!,
  );
  ready = true;
  return true;
}

/**
 * Mengirim web push ke semua perangkat yang didaftarkan karyawan-karyawan itu.
 * Mengembalikan jumlah perangkat yang berhasil dikirimi. Langganan yang sudah tidak berlaku
 * (browser dihapus / izin dicabut: status 404 atau 410) dibersihkan otomatis.
 */
export async function sendWebPush(employeeIds: string[], payload: PushPayload): Promise<number> {
  if (employeeIds.length === 0 || !init()) return 0;

  const subs = await prisma.pushSubscription.findMany({ where: { employeeId: { in: employeeIds } } });
  const body = JSON.stringify(payload);
  let sent = 0;

  await Promise.allSettled(
    subs.map(async (s) => {
      try {
        await webpush.sendNotification({ endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } }, body, {
          TTL: 60 * 60, // dibuang bila perangkat tetap offline lebih dari 1 jam
          urgency: 'high',
        });
        sent += 1;
      } catch (e) {
        const status = (e as { statusCode?: number }).statusCode;
        if (status === 404 || status === 410) await prisma.pushSubscription.delete({ where: { id: s.id } }).catch(() => {});
        else console.error('Web push failed', status ?? e);
      }
    }),
  );
  return sent;
}
