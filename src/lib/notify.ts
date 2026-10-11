import 'server-only';

import type { NotificationType, Position } from '@/generated/prisma/client';
import { prisma } from '@/lib/prisma';

type Payload = { type: NotificationType; title: string; message: string };

/**
 * Membuat notifikasi untuk beberapa penerima. Kegagalan di sini TIDAK PERNAH menggagalkan operasi utama
 * (order, pembayaran, dan seterusnya): hanya dicatat di log.
 */
async function createFor(recipientIds: string[], payload: Payload) {
  const ids = [...new Set(recipientIds)];
  if (ids.length === 0) return;
  try {
    await prisma.notification.createMany({
      data: ids.map((recipientId) => ({ recipientId, ...payload })),
    });
    // Titik penghubung realtime sungguhan: di sini bisa memanggil layanan push (mis. Pusher/Ably)
    // dengan `ids` sebagai penerima. Sekarang browser cukup memeriksa jumlah belum dibaca secara berkala.
  } catch (e) {
    console.error('Notification could not be created', e);
  }
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
