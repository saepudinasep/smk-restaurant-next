'use client';

import * as React from 'react';
import Link from 'next/link';
import { Area, AreaChart, CartesianGrid, XAxis, YAxis } from 'recharts';
import { BanknoteIcon, ClockIcon, ReceiptTextIcon, UsersIcon } from 'lucide-react';

import { MenuPhoto } from '@/components/menu-photo';
import { StatCards } from '@/components/stat-cards';
import { Badge } from '@/components/ui/badge';
import { buttonVariants } from '@/components/ui/button';
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from '@/components/ui/chart';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  MONTHS,
  detailOrders,
  detailsOf,
  formatDate,
  formatMillion,
  formatRupiah,
  getMember,
  getMenu,
  headerOrders,
  incomeByMonth,
  members,
  menus,
  orderTotal,
  type HeaderOrder,
} from '@/lib/dummy-data';
import { useFakeLoad } from '@/lib/fake-api';

// Warna memakai --primary (warna --chart-1 di tema ini terlalu pucat)
const chartConfig = { income: { label: 'Income', color: 'var(--primary)' } } satisfies ChartConfig;

/** Status satu order untuk daftar "Recent Orders". */
function orderState(h: HeaderOrder): { label: string; variant: 'default' | 'secondary' | 'outline' } {
  if (h.payment !== null) return { label: 'Paid', variant: 'default' };
  const list = detailsOf(h.orderId);
  return list.every((d) => d.status === 'Deliver')
    ? { label: 'Awaiting payment', variant: 'outline' }
    : { label: 'In kitchen', variant: 'secondary' };
}

export function DashboardView() {
  // Simulasi membaca data. Saat database siap: ganti dengan data dari server (props) seperti proyek pertama.
  const loading = useFakeLoad('dashboard');

  // Semua angka dihitung dari data saat halaman dibuka, jadi ikut berubah setelah ada order / pembayaran baru.
  const paid = headerOrders.filter((h) => h.payment !== null);
  const unpaid = headerOrders.filter((h) => h.payment === null);
  const revenue = paid.reduce((sum, h) => sum + orderTotal(h.orderId), 0);
  const outstanding = unpaid.reduce((sum, h) => sum + orderTotal(h.orderId), 0);
  const activeMembers = new Set(headerOrders.map((h) => h.memberId)).size;

  // Chart pendapatan: Januari sampai bulan terakhir yang berisi order terbayar, pada tahun terbaru
  const latestYear = Math.max(0, ...paid.map((h) => Number(h.date.slice(0, 4)))) || 2026;
  const lastMonth = Math.max(
    0,
    ...paid.filter((h) => h.date.startsWith(String(latestYear))).map((h) => Number(h.date.slice(5, 7)) - 1),
  );
  const monthly = incomeByMonth(0, lastMonth, latestYear).map((r) => ({ ...r, short: r.month.slice(0, 3) }));

  // Menu terlaris berdasarkan jumlah porsi pada semua order
  const sold = new Map<number, { qty: number; revenue: number }>();
  for (const d of detailOrders) {
    const cur = sold.get(d.menuId) ?? { qty: 0, revenue: 0 };
    sold.set(d.menuId, { qty: cur.qty + d.qty, revenue: cur.revenue + d.qty * d.price });
  }
  const top = [...sold.entries()]
    .map(([menuId, v]) => ({ menu: getMenu(menuId), ...v }))
    .sort((a, b) => b.qty - a.qty)
    .slice(0, 5);
  const topQty = top[0]?.qty ?? 1;

  // 6 order terbaru (ID order berurutan menurut bulan lalu nomor urut)
  const recent = [...headerOrders].sort((a, b) => b.orderId.localeCompare(a.orderId)).slice(0, 6);

  return (
    <div className='flex flex-col gap-3 md:gap-3'>
      <StatCards
        loading={loading}
        items={[
          {
            label: 'Total Revenue',
            value: formatRupiah(revenue),
            icon: BanknoteIcon,
            badge: `${paid.length} paid orders`,
            title: 'Income from paid orders',
            note: `Since ${MONTHS[0]} ${latestYear}`,
          },
          {
            label: 'Total Orders',
            value: headerOrders.length,
            icon: ReceiptTextIcon,
            badge: `${unpaid.length} unpaid`,
            title: 'All orders recorded',
            note: `${menus.length} dishes on the menu`,
          },
          {
            label: 'Outstanding',
            value: formatRupiah(outstanding),
            icon: ClockIcon,
            badge: `${unpaid.length} orders`,
            title: 'Waiting for payment',
            note: 'Not yet counted as revenue',
          },
          {
            label: 'Members',
            value: members.length,
            icon: UsersIcon,
            badge: `${activeMembers} ordered`,
            title: 'Registered members',
            note: 'Members with at least one order',
          },
        ]}
      />

      <div className='grid items-start gap-4 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]'>
        {/* Pendapatan per bulan */}
        <Card>
          <CardHeader>
            <CardTitle>Monthly Income</CardTitle>
            <CardDescription>
              {MONTHS[0]} - {MONTHS[lastMonth]} {latestYear}, in millions of Rupiah
            </CardDescription>
            <CardAction>
              <Link href='/report' className={buttonVariants({ variant: 'outline', size: 'sm' })}>
                View report
              </Link>
            </CardAction>
          </CardHeader>
          <CardContent>
            {loading ? (
              <Skeleton className='h-64 w-full' />
            ) : (
              <ChartContainer config={chartConfig} className='aspect-auto h-64 w-full'>
                <AreaChart data={monthly} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id='fillIncome' x1='0' y1='0' x2='0' y2='1'>
                      <stop offset='5%' stopColor='var(--color-income)' stopOpacity={0.6} />
                      <stop offset='95%' stopColor='var(--color-income)' stopOpacity={0.05} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid vertical={false} />
                  <XAxis dataKey='short' tickLine={false} axisLine={false} tickMargin={8} />
                  <YAxis
                    width={44}
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(v: number) => String(Math.round(v / 100000) / 10).replace('.', ',')}
                  />
                  <ChartTooltip
                    cursor={false}
                    content={
                      <ChartTooltipContent
                        labelFormatter={(_, payload) => payload?.[0]?.payload?.month}
                        formatter={(value) => (
                          <span className='font-mono font-medium tabular-nums'>{formatRupiah(Number(value))}</span>
                        )}
                      />
                    }
                  />
                  <Area dataKey='income' type='monotone' fill='url(#fillIncome)' stroke='var(--color-income)' strokeWidth={2} />
                </AreaChart>
              </ChartContainer>
            )}
          </CardContent>
        </Card>

        {/* Menu terlaris */}
        <Card>
          <CardHeader>
            <CardTitle>Top Menus</CardTitle>
            <CardDescription>Most ordered dishes (portions).</CardDescription>
          </CardHeader>
          <CardContent>
            <ol className='flex flex-col gap-4'>
              {loading &&
                Array.from({ length: 5 }).map((_, i) => (
                  <li key={i} aria-busy='true'>
                    <Skeleton className='h-10 w-full' />
                  </li>
                ))}
              {!loading &&
                top.map((t, i) => (
                  <li key={t.menu.menuId} className='flex items-center gap-3'>
                    <span className='w-4 text-sm font-medium text-muted-foreground tabular-nums'>{i + 1}</span>
                    <MenuPhoto menu={t.menu} />
                    <div className='flex min-w-0 flex-1 flex-col gap-1'>
                      <div className='flex items-baseline justify-between gap-2'>
                        <span className='truncate text-sm font-medium'>{t.menu.name}</span>
                        <span className='shrink-0 text-sm tabular-nums'>{t.qty}</span>
                      </div>
                      <div
                        role='progressbar'
                        aria-label={`${t.menu.name} portions sold`}
                        aria-valuemin={0}
                        aria-valuemax={topQty}
                        aria-valuenow={t.qty}
                        className='h-1.5 overflow-hidden rounded-full bg-muted'
                      >
                        <div className='h-full bg-primary' style={{ width: `${(t.qty / topQty) * 100}%` }} />
                      </div>
                      <span className='text-xs text-muted-foreground tabular-nums'>{formatRupiah(t.revenue)}</span>
                    </div>
                  </li>
                ))}
            </ol>
          </CardContent>
        </Card>
      </div>

      {/* Order terbaru */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Orders</CardTitle>
          <CardDescription>The latest orders and where they stand.</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <Skeleton className='h-48 w-full' />
          ) : (
            <div className='overflow-hidden rounded-lg border'>
              <Table>
                <TableHeader className='bg-muted'>
                  <TableRow>
                    <TableHead>Order ID</TableHead>
                    <TableHead>Member</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead className='text-right'>Total</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {recent.map((h) => {
                    const state = orderState(h);
                    return (
                      <TableRow key={h.orderId}>
                        <TableCell className='font-mono'>{h.orderId}</TableCell>
                        <TableCell>{getMember(h.memberId).name}</TableCell>
                        <TableCell>{formatDate(h.date)}</TableCell>
                        <TableCell className='text-right tabular-nums'>{formatRupiah(orderTotal(h.orderId))}</TableCell>
                        <TableCell>
                          <Badge variant={state.variant}>{state.label}</Badge>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
