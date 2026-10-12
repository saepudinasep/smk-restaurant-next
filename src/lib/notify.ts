import 'server-only';

import { after } from 'next/server';

import type { NotificationType, Position } from '@/generated/prisma/client';
import { prisma } from '@/lib/prisma';
import { publishRealtime } from '@/lib/pusher';
import { sendWebPush } from '@/lib/webpush';

type Payload = {
  type: NotificationType;
  title: string;
  message: string;
  url?: string; // halaman yang relevan; hanya untuk toast dan web push, tidak disimpan di database
};

// Web push hanya untuk kejadian operasional; sambutan dan ganti password cukup muncul di dalam aplikasi.
const PUSH_TYPES: NotificationType[] = ['order', 'kitchen', 'payment'];

/** Mengirim ke browser yang sedang terbuka (Pusher) dan ke perangkat yang tidak sedang membuka web (web push). */
async function deliver(ids: string[], payload: Payload) {
  const tasks: Promise<unknown>[] = [
    publishRealtime(ids, {
      type: payload.type,
      title: payload.title,
      message: payload.message,
      url: payload.url,
    }),
  ];
  if (PUSH_TYPES.includes(payload.type))
    tasks.push(
      sendWebPush(ids, {
        title: payload.title,
        body: payload.message,
        url: payload.url ?? '/notifications',
        requireInteraction: payload.type === 'order', // order baru tetap tampil agar tidak terlewat saat sibuk memasak
      }),
    );
  for (const r of await Promise.allSettled(tasks)) {
    if (r.status === 'rejected') console.error('Notification delivery failed', r.reason);
  }
}

/** Dijalankan SETELAH respons dikirim, supaya tombol di layar tidak menunggu layanan push. */
function schedule(task: () => Promise<void>) {
  try {
    after(task);
  } catch {
    void task(); // di luar konteks request (mis. skrip), jalankan langsung
  }
}

/**
 * Membuat notifikasi untuk beberapa penerima. Kegagalan di sini TIDAK PERNAH menggagalkan operasi utama
 * (order, pembayaran, dan seterusnya): hanya dicatat di log.
 */
async function createFor(recipientIds: string[], payload: Payload) {
  const ids = [...new Set(recipientIds)];
  if (ids.length === 0) return;

  const { url: _url, ...data } = payload;
  void _url;
  try {
    await prisma.notification.createMany({
      data: ids.map((recipientId) => ({ recipientId, ...data })),
    });
  } catch (e) {
    console.error('Notification could not be created', e);
    return;
  }
  schedule(() => deliver(ids, payload));
}

/** Notifikasi untuk semua karyawan dengan salah satu position yang diberikan. */
export async function notifyRoles(roles: Position[], payload: Payload) {
  try {
    const rows = await prisma.employee.findMany({
      where: { position: { in: roles } },
      select: { id: true },
    });
    await createFor(
      rows.map((r) => r.id),
      payload,
    );
  } catch (e) {
    console.error('Notification recipients could not be loaded', e);
  }
}

/** Notifikasi untuk karyawan tertentu (berdasarkan id database). */
export async function notifyEmployees(employeeIds: string[], payload: Payload) {
  await createFor(employeeIds, payload);
}
