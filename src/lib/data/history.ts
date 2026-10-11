import type { ItemStatus } from '@/generated/prisma/client';
import { requireRole } from '@/lib/auth-guard';
import { dateToUi, paymentToUi } from '@/lib/mappers';
import { prisma } from '@/lib/prisma';

/** Posisi sebuah order: sudah dibayar, menunggu dibayar (dapur selesai), atau masih di dapur. */
export type OrderPhase = 'paid' | 'awaiting' | 'kitchen';

/** Fase dari status bayar dan status tiap menu. Dipakai juga oleh Dashboard. */
export const phaseOf = (paid: boolean, items: { status: ItemStatus }[]): OrderPhase =>
  paid ? 'paid' : items.every((i) => i.status === 'Deliver') ? 'awaiting' : 'kitchen';

export type HistoryItem = {
  detailId: string;
  menuName: string;
  photo: string;
  qty: number;
  price: number; // harga saat order (snapshot)
  status: ItemStatus;
};

export type HistoryOrder = {
  orderId: string; // kode order, mis. 2026100008
  memberId: string; // kode member
  memberName: string;
  employeeName: string; // kasir pembuat order
  date: string; // YYYY-MM-DD
  payment: 'Cash' | 'Credit Card' | 'Debit Card' | null;
  bank: string | null;
  items: HistoryItem[];
  total: number;
  phase: OrderPhase;
};

export async function getOrderHistoryPageData() {
  await requireRole('Admin', 'Cashier');

  const rows = await prisma.headerOrder.findMany({
    orderBy: { orderCode: 'desc' }, // terbaru dulu (kode berurutan menurut bulan lalu nomor urut)
    include: {
      member: { select: { memberCode: true, name: true } },
      employee: { select: { name: true } },
      details: {
        orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
        include: { menu: { select: { name: true, photo: true } } },
      },
    },
  });

  const orders: HistoryOrder[] = rows.map((o) => {
    const items: HistoryItem[] = o.details.map((d) => ({
      detailId: d.id,
      menuName: d.menu.name,
      photo: d.menu.photo,
      qty: d.qty,
      price: d.price,
      status: d.status,
    }));
    const phase = phaseOf(o.payment !== null, items);

    return {
      orderId: o.orderCode,
      memberId: o.member.memberCode,
      memberName: o.member.name,
      employeeName: o.employee.name,
      date: dateToUi(o.date),
      payment: o.payment ? paymentToUi[o.payment] : null,
      bank: o.bank,
      items,
      total: items.reduce((sum, i) => sum + i.qty * i.price, 0),
      phase,
    };
  });

  return { orders };
}
