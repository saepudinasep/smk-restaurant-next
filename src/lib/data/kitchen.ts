import type { ItemStatus } from '@/generated/prisma/client';
import { requireRole } from '@/lib/auth-guard';
import { dateToUi } from '@/lib/mappers';
import { prisma } from '@/lib/prisma';

export type KitchenItem = {
  detailId: string;
  menuName: string;
  photo: string;
  qty: number;
  status: ItemStatus;
};

export type KitchenOrder = {
  orderId: string; // kode order, mis. 2026100008
  memberName: string;
  date: string; // YYYY-MM-DD
  cashierName: string;
  items: KitchenItem[];
};

/** Order yang baru selesai tetap tampil (berlabel Done) selama beberapa menit supaya tidak tiba-tiba hilang dari layar dapur. */
export const RECENTLY_DONE_MINUTES = 10;

export async function getKitchenPageData() {
  await requireRole('Chef');

  const since = new Date(Date.now() - RECENTLY_DONE_MINUTES * 60_000);

  const rows = await prisma.headerOrder.findMany({
    where: {
      OR: [
        { details: { some: { status: { not: 'Deliver' } } } }, // masih ada menu yang belum diantar
        { details: { some: { updatedAt: { gte: since } } } }, // baru saja selesai / diubah
      ],
    },
    orderBy: { orderCode: 'asc' }, // terlama dulu (FIFO)
    include: {
      member: { select: { name: true } },
      employee: { select: { name: true } },
      details: {
        orderBy: [{ createdAt: 'asc' }, { id: 'asc' }], // urutan menu seperti saat order dibuat
        include: { menu: { select: { name: true, photo: true } } },
      },
    },
  });

  const orders: KitchenOrder[] = rows.map((o) => ({
    orderId: o.orderCode,
    memberName: o.member.name,
    date: dateToUi(o.date),
    cashierName: o.employee.name,
    items: o.details.map((d) => ({
      detailId: d.id,
      menuName: d.menu.name,
      photo: d.menu.photo,
      qty: d.qty,
      status: d.status,
    })),
  }));

  return { orders };
}
