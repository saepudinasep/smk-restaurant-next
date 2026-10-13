'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';

import type { ActionResult } from '@/actions/result';
import { ROLES } from '@/lib/access';
import { requireRole } from '@/lib/auth-guard';
import { prisma } from '@/lib/prisma';
import { unreadWhere } from '@/lib/prisma-filters';

// id notifikasi = ObjectId MongoDB (24 karakter heksadesimal)
const idSchema = z.string().regex(/^[0-9a-f]{24}$/, 'Invalid notification.');
const NOT_FOUND = 'Notification not found. It may have been deleted.';

// Setiap query selalu dibatasi `recipientId: me.id`: pengguna hanya bisa mengubah notifikasinya sendiri.

export async function setNotificationRead(id: unknown, read: boolean): Promise<ActionResult> {
  const me = await requireRole(...ROLES);
  const parsed = idSchema.safeParse(id);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message };

  const own = await prisma.notification.findFirst({
    where: { id: parsed.data, recipientId: me.id },
    select: { id: true },
  });
  if (!own) return { ok: false, error: NOT_FOUND };

  await prisma.notification.update({
    where: { id: own.id },
    data: { readAt: read ? new Date() : null },
  });
  revalidatePath('/notifications');
  return { ok: true };
}

export async function markAllNotificationsRead(): Promise<ActionResult> {
  const me = await requireRole(...ROLES);
  await prisma.notification.updateMany({
    where: { recipientId: me.id, ...unreadWhere },
    data: { readAt: new Date() },
  });
  revalidatePath('/notifications');
  return { ok: true };
}

export async function deleteNotification(id: unknown): Promise<ActionResult> {
  const me = await requireRole(...ROLES);
  const parsed = idSchema.safeParse(id);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message };

  const own = await prisma.notification.findFirst({
    where: { id: parsed.data, recipientId: me.id },
    select: { id: true },
  });
  if (!own) return { ok: false, error: NOT_FOUND };

  await prisma.notification.delete({ where: { id: own.id } });
  revalidatePath('/notifications');
  return { ok: true };
}
