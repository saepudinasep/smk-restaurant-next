'use server';

import { z } from 'zod';

import type { ActionResult, TestPushResult } from '@/actions/result';
import { ROLES } from '@/lib/access';
import { requireRole } from '@/lib/auth-guard';
import { prisma } from '@/lib/prisma';
import { isWebPushConfigured, sendWebPush } from '@/lib/webpush';

const subscriptionSchema = z.object({
  endpoint: z.url().max(1000).refine((u) => u.startsWith('https://'), 'Push endpoint must use https.'),
  keys: z.object({ p256dh: z.string().min(1).max(200), auth: z.string().min(1).max(100) }),
  userAgent: z.string().max(300).optional(),
});

/**
 * Mendaftarkan browser/perangkat ini untuk web push atas nama pengguna yang login.
 * Bila browser yang sama sebelumnya milik karyawan lain (perangkat bersama), langganannya dipindahkan
 * ke pengguna sekarang, sehingga notifikasi orang lain tidak muncul di perangkat ini.
 */
export async function savePushSubscription(input: unknown): Promise<ActionResult> {
  const me = await requireRole(...ROLES);
  const parsed = subscriptionSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: 'This browser sent an invalid push subscription.' };
  const { endpoint, keys, userAgent } = parsed.data;

  try {
    await prisma.pushSubscription.upsert({
      where: { endpoint },
      create: { employeeId: me.id, endpoint, p256dh: keys.p256dh, auth: keys.auth, userAgent },
      update: { employeeId: me.id, p256dh: keys.p256dh, auth: keys.auth, userAgent },
    });
  } catch (e) {
    console.error(e);
    return { ok: false, error: 'Could not save the push subscription. Please try again.' };
  }
  return { ok: true };
}

/** Mencabut pendaftaran browser ini (hanya milik pengguna yang login). Dipanggil saat mematikan push dan saat logout. */
export async function removePushSubscription(input: unknown): Promise<ActionResult> {
  const me = await requireRole(...ROLES);
  const parsed = z.object({ endpoint: z.string().min(1).max(1000) }).safeParse(input);
  if (!parsed.success) return { ok: false, error: 'Invalid push subscription.' };

  await prisma.pushSubscription.deleteMany({ where: { endpoint: parsed.data.endpoint, employeeId: me.id } });
  return { ok: true };
}

/** Mengirim satu notifikasi uji ke semua perangkat milik pengguna ini, untuk memastikan web push bekerja. */
export async function sendTestPush(): Promise<TestPushResult> {
  const me = await requireRole(...ROLES);
  if (!isWebPushConfigured())
    return { ok: false, error: 'Web push is not configured on the server (VAPID keys are missing).' };

  const sent = await sendWebPush([me.id], {
    title: 'Test notification',
    body: 'Web push works on this device.',
    url: '/notifications',
  });
  return { ok: true, sent };
}
