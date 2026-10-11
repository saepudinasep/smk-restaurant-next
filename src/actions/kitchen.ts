'use server';

import { revalidatePath } from 'next/cache';

import type { ActionResult } from '@/actions/result';
import { requireRole } from '@/lib/auth-guard';
import { notifyEmployees } from '@/lib/notify';
import { prisma } from '@/lib/prisma';
import { dishStatusSchema } from '@/lib/validations';

/** Chef mengubah status satu atau beberapa menu (Pending, Cooking, Deliver). */
export async function updateDishStatus(input: unknown): Promise<ActionResult> {
  await requireRole('Chef');

  const parsed = dishStatusSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message };
  const { detailIds, status } = parsed.data;
  const ids = [...new Set(detailIds)];

  try {
    // Semua menu harus ada; bila ada yang hilang (mis. order dihapus), jangan mengubah sebagian
    const before = await prisma.detailOrder.findMany({
      where: { id: { in: ids } },
      select: { status: true, orderId: true },
    });
    if (before.length !== ids.length)
      return { ok: false, error: 'Some dishes were not found. Refresh the page and try again.' };

    await prisma.detailOrder.updateMany({ where: { id: { in: ids } }, data: { status } });

    // Order yang baru saja SELESAI diantar seluruhnya (dan belum dibayar): beri tahu kasir pembuatnya
    if (status === 'Deliver') {
      const touched = [
        ...new Set(before.filter((d) => d.status !== 'Deliver').map((d) => d.orderId)),
      ];
      for (const orderId of touched) {
        const remaining = await prisma.detailOrder.count({
          where: { orderId, status: { not: 'Deliver' } },
        });
        if (remaining > 0) continue;
        const order = await prisma.headerOrder.findUnique({
          where: { id: orderId },
          select: { orderCode: true, employeeId: true, payment: true },
        });
        if (order && order.payment === null)
          await notifyEmployees([order.employeeId], {
            type: 'kitchen',
            title: 'Order ready to be paid',
            message: `All dishes of order ${order.orderCode} have been delivered. It is waiting for payment.`,
          });
      }
    }
  } catch (e) {
    console.error(e);
    return { ok: false, error: 'The status could not be saved. Please try again.' };
  }

  for (const path of ['/view-orders', '/payments', '/order-history', '/dashboard'])
    revalidatePath(path);
  return { ok: true };
}
