import { requireRole } from '@/lib/auth-guard';
import { computeMonthlyStats, type MonthlyStat } from '@/lib/data/stats';
import { todayInRestaurant } from '@/lib/mappers';

export type { MonthlyStat };
export type ReportDefaults = { year: number; from: number; to: number };

export async function getReportPageData() {
  await requireRole('Admin');

  const stats = await computeMonthlyStats();

  // Pilihan tahun: tahun yang punya order terbayar (terbaru dulu); bila belum ada, tahun ini
  const years = [...new Set(stats.filter((s) => s.orders > 0).map((s) => s.year))].sort(
    (a, b) => b - a,
  );
  if (years.length === 0) years.push(Number(todayInRestaurant().slice(0, 4)));

  // Periode awal: Januari sampai bulan terakhir yang punya order terbayar di tahun terbaru
  const year = years[0];
  const last = Math.max(
    0,
    ...stats.filter((s) => s.year === year && s.orders > 0).map((s) => s.month),
  );
  const defaults: ReportDefaults = { year, from: 0, to: last };

  return { stats, years, defaults };
}
