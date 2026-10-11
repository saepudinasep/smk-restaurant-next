'use server';

import { revalidatePath } from 'next/cache';

import type { PayOrderResult } from '@/actions/result';
import type { Bank } from '@/generated/prisma/client';
import { requireRole } from '@/lib/auth-guard';
import { formatRupiah } from '@/lib/format';
import { paymentToDb } from '@/lib/mappers';
import { notifyRoles } from '@/lib/notify';
import { prisma } from '@/lib/prisma';
import { payBaseSchema, payCardSchema, payCashSchema } from '@/lib/validations';

const ALREADY_PAID = 'This order has already been paid.';

/**
 * Kasir menyimpan pembayaran satu order. Total SELALU dihitung server dari harga di database;
 * dari browser hanya diterima order, tipe pembayaran, bank (kartu) atau uang diterima (tunai).
 */
export async function payOrder(input: unknown): Promise<PayOrderResult> {
  await requireRole('Cashier');

  const base = payBaseSchema.safeParse(input);
  if (!base.success) return { ok: false, error: base.error.issues[0].message };
  const { orderId, payment } = base.data;

  // Isian sesuai tipe: tunai butuh uang diterima, kartu butuh bank
  let bank: Bank | null = null;
  let received: number | null = null;
  if (payment === 'Cash') {
    const cash = payCashSchema.safeParse(input);
    if (!cash.success) return { ok: false, error: cash.error.issues[0].message };
    received = cash.data.received;
  } else {
    const card = payCardSchema.safeParse(input);
    if (!card.success) return { ok: false, error: card.error.issues[0].message };
    bank = card.data.bank;
  }

  try {
    const order = await prisma.headerOrder.findUnique({
      where: { orderCode: orderId },
      select: { id: true, payment: true, details: { select: { qty: true, price: true } } },
    });
    if (!order) return { ok: false, error: 'Order not found. Refresh the page and try again.' };
    if (order.payment !== null) return { ok: false, error: ALREADY_PAID };

    const total = order.details.reduce((sum, d) => sum + d.qty * d.price, 0);
    if (received !== null && received < total)
      return { ok: false, error: 'Amount received is less than the total.' };

    // Hanya berhasil bila order MASIH belum dibayar saat ditulis. Bila dua kasir membayar order yang sama
    // bersamaan, hanya satu yang lolos (count = 0 untuk yang kedua) sehingga tidak ada pembayaran ganda.
    const { count } = await prisma.headerOrder.updateMany({
      where: { id: order.id, payment: null },
      data: { payment: paymentToDb[payment], bank },
    });
    if (count === 0) return { ok: false, error: ALREADY_PAID };

    for (const path of ['/payments', '/order-history', '/dashboard', '/reports'])
      revalidatePath(path);

    await notifyRoles(['Admin'], {
      type: 'payment',
      title: 'Payment received',
      message: `Order ${orderId} was paid with ${payment}${bank ? ` (${bank})` : ''}, ${formatRupiah(total)}.`,
    });
    return { ok: true, total, change: received === null ? null : received - total };
  } catch (e) {
    console.error(e);
    return { ok: false, error: 'The payment could not be saved. Please try again.' };
  }
}
