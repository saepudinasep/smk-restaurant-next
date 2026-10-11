import { ROLES } from '@/lib/access';
import { requireRole } from '@/lib/auth-guard';
import { dateTimeInRestaurant } from '@/lib/mappers';
import type { AppNotification } from '@/lib/notifications';
import { prisma } from '@/lib/prisma';

/** Notifikasi milik pengguna yang login (terbaru dulu, maksimal 200). */
export async function getNotificationsPageData() {
  const me = await requireRole(...ROLES);

  const rows = await prisma.notification.findMany({
    where: { recipientId: me.id },
    orderBy: { createdAt: 'desc' },
    take: 200,
  });

  const notifications: AppNotification[] = rows.map((n) => ({
    id: n.id,
    type: n.type,
    title: n.title,
    message: n.message,
    ...dateTimeInRestaurant(n.createdAt),
    read: n.readAt !== null,
  }));

  return { notifications };
}
