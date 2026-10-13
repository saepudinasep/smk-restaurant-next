import type { ItemStatus } from '@/generated/prisma/client';
import { requireRole } from '@/lib/auth-guard';
import { dateToUi } from '@/lib/mappers';
import { prisma } from '@/lib/prisma';
import { unpaidWhere } from '@/lib/prisma-filters';

export type PaymentItem = {
  detailId: string;
  menuName: string;
  photo: string;
  qty: number;
  price: number; // harga saat order (snapshot)
  status: ItemStatus;
};

export type PaymentOrder = {
  orderId: string; // kode order, mis. 2026100008
  memberId: string; // kode member, mis. M0000001
  memberName: string;
  date: string; // YYYY-MM-DD
  items: PaymentItem[];
  total: number;
};

export async function getPaymentsPageData() {
  await requireRole('Cashier');

  const rows = await prisma.headerOrder.findMany({
    where: unpaidWhere, // belum dibayar (payment null ATAU tidak ada)
    orderBy: { orderCode: 'asc' }, // terlama dulu
    include: {
      member: { select: { memberCode: true, name: true } },
      details: {
        orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
        include: { menu: { select: { name: true, photo: true } } },
      },
    },
  });

  const orders: PaymentOrder[] = rows.map((o) => {
    const items = o.details.map((d) => ({
      detailId: d.id,
      menuName: d.menu.name,
      photo: d.menu.photo,
      qty: d.qty,
      price: d.price,
      status: d.status,
    }));
    return {
      orderId: o.orderCode,
      memberId: o.member.memberCode,
      memberName: o.member.name,
      date: dateToUi(o.date),
      items,
      total: items.reduce((sum, i) => sum + i.qty * i.price, 0),
    };
  });

  return { orders };
}
