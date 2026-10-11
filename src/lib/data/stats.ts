import { prisma } from '@/lib/prisma';

/** Ringkasan satu bulan. `month` = 0 (Januari) sampai 11 (Desember). */
export type MonthlyStat = {
  year: number;
  month: number;
  income: number; // total order yang SUDAH dibayar
  orders: number; // jumlah order yang sudah dibayar
  unpaidOrders: number; // order yang belum dibayar (tidak masuk pendapatan)
  unpaidAmount: number;
};

/**
 * Ringkasan per bulan dari seluruh order. TIDAK memeriksa peran: hanya boleh dipanggil dari fungsi
 * pengambil data yang sudah memanggil requireRole (Reports dan Dashboard).
 *
 * Prisma tidak bisa mengelompokkan per bulan atau menjumlahkan lewat relasi, jadi order diambil
 * seperlunya lalu dijumlahkan di server. Itu cukup untuk skala restoran.
 */
export async function computeMonthlyStats(): Promise<MonthlyStat[]> {
  const rows = await prisma.headerOrder.findMany({
    select: { date: true, payment: true, details: { select: { qty: true, price: true } } },
  });

  const byMonth = new Map<string, MonthlyStat>();
  for (const o of rows) {
    // tanggal disimpan sebagai tengah malam UTC (lihat dateToDb), jadi dibaca dengan getUTC*
    const year = o.date.getUTCFullYear();
    const month = o.date.getUTCMonth();
    const key = `${year}-${month}`;
    const stat = byMonth.get(key) ?? {
      year,
      month,
      income: 0,
      orders: 0,
      unpaidOrders: 0,
      unpaidAmount: 0,
    };

    const total = o.details.reduce((sum, d) => sum + d.qty * d.price, 0);
    if (o.payment !== null) {
      stat.income += total;
      stat.orders += 1;
    } else {
      stat.unpaidAmount += total;
      stat.unpaidOrders += 1;
    }
    byMonth.set(key, stat);
  }
  return [...byMonth.values()].sort((a, b) => a.year - b.year || a.month - b.month);
}
