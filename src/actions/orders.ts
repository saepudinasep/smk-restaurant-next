'use server';

import { revalidatePath } from 'next/cache';

import type { CreateOrderResult } from '@/actions/result';
import { Prisma } from '@/generated/prisma/client';
import { requireRole } from '@/lib/auth-guard';
import { nextOrderCode } from '@/lib/codes';
import { notifyRoles } from '@/lib/notify';
import { dateToDb, todayInRestaurant } from '@/lib/mappers';
import { prisma } from '@/lib/prisma';
import { orderSchema } from '@/lib/validations';

/**
 * Kasir membuat order: satu HeaderOrder + beberapa DetailOrder dalam SATU operasi (atomik, lewat
 * nested create). Dari browser hanya diterima member dan daftar (menu, qty); harga, tanggal, kasir,
 * dan kode order SELALU ditentukan server.
 */
export async function createOrder(input: unknown): Promise<CreateOrderResult> {
  const me = await requireRole('Cashier');

  const parsed = orderSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message };
  const { memberId, items } = parsed.data;

  const [member, menus] = await Promise.all([
    prisma.member.findUnique({ where: { memberCode: memberId }, select: { id: true, name: true } }),
    prisma.menu.findMany({
      where: { menuNumber: { in: items.map((i) => i.menuId) } },
      select: { id: true, menuNumber: true, price: true },
    }),
  ]);
  if (!member) return { ok: false, error: 'Member not found. Refresh the page and try again.' };

  const menuByNumber = new Map(menus.map((m) => [m.menuNumber, m]));
  if (items.some((i) => !menuByNumber.has(i.menuId)))
    return {
      ok: false,
      error: 'A menu in this order is no longer available. Refresh the page and try again.',
    };

  // Harga diambil dari database lalu disalin ke rincian (snapshot): tidak ikut berubah bila harga menu diubah nanti
  const lines = items.map((i) => {
    const menu = menuByNumber.get(i.menuId)!;
    return { menuId: menu.id, qty: i.qty, price: menu.price };
  });
  const total = lines.reduce((sum, l) => sum + l.qty * l.price, 0);

  const today = todayInRestaurant();

  // Kode order dibuat di server (urutan + 1 pada bulan itu). Bila dua kasir menyimpan bersamaan,
  // indeks unik menolak yang kedua dan dicoba lagi dengan nomor baru.
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const prefix = today.slice(0, 7).replace('-', '');
      const latest = await prisma.headerOrder.findFirst({
        where: { orderCode: { startsWith: prefix } },
        orderBy: { orderCode: 'desc' },
        select: { orderCode: true },
      });
      const orderCode = nextOrderCode(today, latest ? [latest.orderCode] : []);

      await prisma.headerOrder.create({
        data: {
          orderCode,
          employeeId: me.id,
          memberId: member.id,
          date: dateToDb(today),
          // payment & bank dikosongkan: terisi saat form Payment disimpan
          details: { create: lines }, // status awal Pending (default schema)
        },
      });

      // Halaman yang menampilkan order ikut disegarkan
      for (const path of ['/view-orders', '/payments', '/order-history', '/dashboard'])
        revalidatePath(path);

      const portions = items.reduce((s, i) => s + i.qty, 0);
      // Semua Chef diberi tahu ada order baru (gagal membuat notifikasi tidak menggagalkan order)
      await notifyRoles(['Chef'], {
        type: 'order',
        title: 'New order placed',
        message: `Order ${orderCode} was placed for ${member.name}. ${portions} ${portions === 1 ? 'portion is' : 'portions are'} waiting for the kitchen.`,
      });
      return { ok: true, orderId: orderCode, total, items: portions };
    } catch (e) {
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') continue; // kode bentrok
      console.error(e);
      return { ok: false, error: 'The order could not be saved. Please try again.' };
    }
  }
  return { ok: false, error: 'Could not generate an order ID. Please try again.' };
}
