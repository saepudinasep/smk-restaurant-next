'use client';

import * as React from 'react';
import Link from 'next/link';
import { Area, AreaChart, CartesianGrid, XAxis, YAxis } from 'recharts';
import { BanknoteIcon, ClockIcon, ReceiptTextIcon, UsersIcon } from 'lucide-react';

import { MenuPhoto } from '@/components/menu-photo';
import { OrderStatusBadge } from '@/components/order-status-badge';
import { StatCards } from '@/components/stat-cards';
import { buttonVariants } from '@/components/ui/button';
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from '@/components/ui/chart';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import type { AdminDashboardData } from '@/lib/data/dashboard';
import { MONTHS, formatDate, formatRupiah } from '@/lib/format';

// Warna memakai --primary (warna --chart-1 di tema ini terlalu pucat)
const chartConfig = { income: { label: 'Income', color: 'var(--primary)' } } satisfies ChartConfig;

export function AdminDashboard({ data }: { data: AdminDashboardData }) {
  // Semua angka dihitung server saat halaman dibuka dan disegarkan (revalidatePath) setiap ada order,
  // perubahan status dapur, atau pembayaran baru.
  const {
    revenue,
    paidOrders,
    unpaidOrders,
    outstanding,
    totalOrders,
    memberCount,
    activeMembers,
    menuCount,
    latestYear,
    lastMonth,
    top,
    recent,
  } = data;

  const monthly = data.monthly.map((r) => ({
    income: r.income,
    month: MONTHS[r.monthIndex],
    short: MONTHS[r.monthIndex].slice(0, 3),
  }));
  const topQty = top[0]?.qty ?? 1;

  return (
    <div className='flex flex-col gap-3 md:gap-3'>
      <StatCards
        items={[
          {
            label: 'Total Revenue',
            value: formatRupiah(revenue),
            icon: BanknoteIcon,
            badge: `${paidOrders} paid orders`,
            title: 'Income from paid orders',
            note: `Since ${MONTHS[0]} ${latestYear}`,
          },
          {
            label: 'Total Orders',
            value: totalOrders,
            icon: ReceiptTextIcon,
            badge: `${unpaidOrders} unpaid`,
            title: 'All orders recorded',
            note: `${menuCount} dishes on the menu`,
          },
          {
            label: 'Outstanding',
            value: formatRupiah(outstanding),
            icon: ClockIcon,
            badge: `${unpaidOrders} orders`,
            title: 'Waiting for payment',
            note: 'Not yet counted as revenue',
          },
          {
            label: 'Members',
            value: memberCount,
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
              <Link href='/reports' className={buttonVariants({ variant: 'outline', size: 'sm' })}>
                View report
              </Link>
            </CardAction>
          </CardHeader>
          <CardContent>
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
                  tickFormatter={(v: number) =>
                    String(Math.round(v / 100000) / 10).replace('.', ',')
                  }
                />
                <ChartTooltip
                  cursor={false}
                  content={
                    <ChartTooltipContent
                      labelFormatter={(_, payload) => payload?.[0]?.payload?.month}
                      formatter={(value) => (
                        <span className='font-mono font-medium tabular-nums'>
                          {formatRupiah(Number(value))}
                        </span>
                      )}
                    />
                  }
                />
                <Area
                  dataKey='income'
                  type='monotone'
                  fill='url(#fillIncome)'
                  stroke='var(--color-income)'
                  strokeWidth={2}
                />
              </AreaChart>
            </ChartContainer>
          </CardContent>
        </Card>

        {/* Menu terlaris */}
        <Card>
          <CardHeader>
            <CardTitle>Top Menus</CardTitle>
            <CardDescription>Most ordered dishes (portions).</CardDescription>
          </CardHeader>
          <CardContent>
            {top.length === 0 ? (
              <p className='py-8 text-center text-sm text-muted-foreground'>No orders yet.</p>
            ) : (
              <ol className='flex flex-col gap-4'>
                {top.map((t, i) => (
                  <li key={t.menu.menuId} className='flex items-center gap-3'>
                    <span className='w-4 text-sm font-medium text-muted-foreground tabular-nums'>
                      {i + 1}
                    </span>
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
                        <div
                          className='h-full bg-primary'
                          style={{ width: `${(t.qty / topQty) * 100}%` }}
                        />
                      </div>
                      <span className='text-xs text-muted-foreground tabular-nums'>
                        {formatRupiah(t.revenue)}
                      </span>
                    </div>
                  </li>
                ))}
              </ol>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Order terbaru */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Orders</CardTitle>
          <CardDescription>The latest orders and where they stand.</CardDescription>
          <CardAction>
            <Link
              href='/order-history'
              className={buttonVariants({ variant: 'outline', size: 'sm' })}
            >
              View all
            </Link>
          </CardAction>
        </CardHeader>
        <CardContent>
          {recent.length === 0 ? (
            <p className='py-8 text-center text-sm text-muted-foreground'>No orders yet.</p>
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
                  {recent.map((h) => (
                    <TableRow key={h.orderId}>
                      <TableCell className='font-mono'>{h.orderId}</TableCell>
                      <TableCell>{h.memberName}</TableCell>
                      <TableCell>{formatDate(h.date)}</TableCell>
                      <TableCell className='text-right tabular-nums'>
                        {formatRupiah(h.total)}
                      </TableCell>
                      <TableCell>
                        <OrderStatusBadge phase={h.phase} />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
