'use client';

import { formatRupiah } from '@/lib/format';
import { CATEGORY_TAB_LABEL, type MenuCategory } from '@/lib/menu-categories';

/** Penjualan per kategori menu: pendapatan, porsi, dan porsi terhadap total, lengkap dengan bar perbandingan. */
export function CategorySales({
  items,
}: {
  items: { category: MenuCategory; income: number; portions: number }[];
}) {
  const total = items.reduce((sum, i) => sum + i.income, 0);

  if (total === 0) {
    return (
      <p className='py-6 text-center text-sm text-muted-foreground'>
        No paid orders in this period yet.
      </p>
    );
  }

  return (
    <ul className='flex flex-col gap-4'>
      {items.map(({ category, income, portions }) => {
        const pct = Math.round((income / total) * 100);
        return (
          <li key={category} className='flex flex-col gap-1.5'>
            <div className='flex items-baseline justify-between gap-2 text-sm'>
              <span className='font-medium'>{CATEGORY_TAB_LABEL[category]}</span>
              <span className='shrink-0 font-semibold tabular-nums'>{formatRupiah(income)}</span>
            </div>
            <div
              role='progressbar'
              aria-label={`${CATEGORY_TAB_LABEL[category]} share of sales`}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={pct}
              className='h-1.5 overflow-hidden rounded-full bg-muted'
            >
              <div className='h-full bg-primary' style={{ width: `${pct}%` }} />
            </div>
            <span className='text-xs text-muted-foreground tabular-nums'>
              {pct}% of sales &middot; {portions} {portions === 1 ? 'portion' : 'portions'}
            </span>
          </li>
        );
      })}
    </ul>
  );
}
