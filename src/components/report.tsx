'use client';

import * as React from 'react';
import { Bar, BarChart, CartesianGrid, LabelList, XAxis, YAxis } from 'recharts';
import { BanknoteIcon, CalendarRangeIcon, ReceiptTextIcon, TrendingUpIcon } from 'lucide-react';

import { CategorySales } from '@/components/category-sales';
import { StatCards } from '@/components/stat-cards';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from '@/components/ui/chart';
import { Field, FieldError, FieldLabel } from '@/components/ui/field';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import type { MonthlyStat, ReportDefaults } from '@/lib/data/reports';
import { MONTHS, formatMillion, formatRupiah } from '@/lib/format';
import { emptySalesByCategory, sumSalesByCategory } from '@/lib/menu-categories';

const monthItems = MONTHS.map((m, i) => ({ value: String(i), label: m }));

// Warna batang memakai --primary (warna --chart-1 di tema ini terlalu pucat)
const chartConfig = { income: { label: 'Income', color: 'var(--primary)' } } satisfies ChartConfig;

type Range = { year: number; from: number; to: number };

/** Satu baris per bulan dalam rentang; bulan tanpa order tetap tampil dengan nilai 0. */
function monthlyRows(stats: MonthlyStat[], year: number, from: number, to: number) {
  const [start, end] = from <= to ? [from, to] : [to, from];
  return MONTHS.slice(start, end + 1).map((month, i) => {
    const stat = stats.find((s) => s.year === year && s.month === start + i);
    return {
      month,
      income: stat?.income ?? 0,
      orders: stat?.orders ?? 0,
      unpaidOrders: stat?.unpaidOrders ?? 0,
      unpaidAmount: stat?.unpaidAmount ?? 0,
      byCategory: stat?.byCategory ?? emptySalesByCategory(),
    };
  });
}

export function Report({
  stats,
  years,
  defaults,
}: {
  stats: MonthlyStat[];
  years: number[];
  defaults: ReportDefaults;
}) {
  // Data datang dari server (props) sebagai ringkasan per bulan; rentang diolah di browser, jadi Generate instan.
  // Angka mengikuti kondisi saat halaman dibuka; muat ulang halaman untuk data terbaru.
  const [year, setYear] = React.useState(String(defaults.year));
  const [from, setFrom] = React.useState(String(defaults.from));
  const [to, setTo] = React.useState(String(defaults.to));
  const [applied, setApplied] = React.useState<Range>(defaults);

  const invalidRange = Number(from) > Number(to);

  const generate = () => {
    if (invalidRange) return;
    setApplied({ year: Number(year), from: Number(from), to: Number(to) });
  };

  const rows = monthlyRows(stats, applied.year, applied.from, applied.to);
  const totalIncome = rows.reduce((sum, r) => sum + r.income, 0);
  const categorySales = sumSalesByCategory(rows.map((r) => r.byCategory));
  const totalOrders = rows.reduce((sum, r) => sum + r.orders, 0);
  const average = totalOrders ? Math.round(totalIncome / totalOrders) : 0;
  const best = rows.reduce((b, r) => (r.income > b.income ? r : b), rows[0]);

  // Order yang belum dibayar pada periode yang sama tidak masuk pendapatan
  const unpaidCount = rows.reduce((sum, r) => sum + r.unpaidOrders, 0);
  const unpaidAmount = rows.reduce((sum, r) => sum + r.unpaidAmount, 0);

  const rangeLabel =
    applied.from === applied.to
      ? `${MONTHS[applied.from]} ${applied.year}`
      : `${MONTHS[applied.from].slice(0, 3)} - ${MONTHS[applied.to].slice(0, 3)} ${applied.year}`;

  const chartData = rows.map((r) => ({ ...r, short: r.month.slice(0, 3) }));

  return (
    <div className='flex flex-col gap-3 md:gap-3'>
      {/* Filter */}
      <Card>
        <CardHeader>
          <CardTitle>Report Period</CardTitle>
          <CardDescription>Choose the months to include, then generate the report.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className='flex flex-wrap items-start gap-4'>
            <Field className='w-32'>
              <FieldLabel>Year</FieldLabel>
              <Select
                items={years.map((y) => ({ value: String(y), label: String(y) }))}
                value={year}
                onValueChange={(v) => v && setYear(v)}
              >
                <SelectTrigger className='w-full' aria-label='Year'>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {years.map((y) => (
                    <SelectItem key={y} value={String(y)}>
                      {y}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>

            <Field className='w-44'>
              <FieldLabel>From</FieldLabel>
              <Select items={monthItems} value={from} onValueChange={(v) => v && setFrom(v)}>
                <SelectTrigger className='w-full' aria-label='From month'>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {MONTHS.map((m, i) => (
                    <SelectItem key={m} value={String(i)}>
                      {m}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>

            <Field className='w-44' data-invalid={invalidRange}>
              <FieldLabel>To</FieldLabel>
              <Select items={monthItems} value={to} onValueChange={(v) => v && setTo(v)}>
                <SelectTrigger className='w-full' aria-label='To month' aria-invalid={invalidRange}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {MONTHS.map((m, i) => (
                    <SelectItem key={m} value={String(i)}>
                      {m}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {invalidRange && (
                <FieldError>&ldquo;From&rdquo; cannot be after &ldquo;To&rdquo;.</FieldError>
              )}
            </Field>

            <Button className='mt-[1.625rem]' disabled={invalidRange} onClick={generate}>
              Generate
            </Button>
          </div>
        </CardContent>
      </Card>

      <StatCards
        items={[
          {
            label: 'Total Income',
            value: formatRupiah(totalIncome),
            icon: BanknoteIcon,
            badge: rangeLabel,
            title: 'Paid orders only',
            note: 'Income from the selected period',
          },
          {
            label: 'Paid Orders',
            value: totalOrders,
            icon: ReceiptTextIcon,
            badge: `${rows.length} ${rows.length === 1 ? 'month' : 'months'}`,
            title: 'Orders already paid',
            note: unpaidCount
              ? `${unpaidCount} more still unpaid`
              : 'No unpaid orders in this period',
          },
          {
            label: 'Average Order',
            value: formatRupiah(average),
            icon: TrendingUpIcon,
            badge: 'per order',
            title: 'Mean value of a paid order',
            note: 'Total income / paid orders',
          },
          {
            label: 'Best Month',
            value: totalIncome > 0 ? best.month : '-',
            icon: CalendarRangeIcon,
            badge: totalIncome > 0 ? formatMillion(best.income) : '-',
            title: 'Highest income',
            note: totalIncome > 0 ? `${best.orders} paid orders` : 'No income yet',
          },
        ]}
      />

      <div className='grid items-start gap-4 lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]'>
        {/* Tabel */}
        <Card>
          <CardHeader>
            <CardTitle>Income by Month</CardTitle>
            <CardDescription>{rangeLabel}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className='overflow-hidden rounded-lg border'>
              <Table>
                <TableHeader className='bg-muted'>
                  <TableRow>
                    <TableHead>Month</TableHead>
                    <TableHead className='text-right'>Orders</TableHead>
                    <TableHead className='text-right'>Income</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.map((r) => (
                    <TableRow key={r.month}>
                      <TableCell className='font-medium'>{r.month}</TableCell>
                      <TableCell className='text-right tabular-nums'>{r.orders}</TableCell>
                      <TableCell className='text-right tabular-nums'>
                        {formatRupiah(r.income)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
                <TableFooter>
                  <TableRow>
                    <TableCell className='font-medium'>Total</TableCell>
                    <TableCell className='text-right font-medium tabular-nums'>
                      {totalOrders}
                    </TableCell>
                    <TableCell className='text-right font-semibold tabular-nums'>
                      {formatRupiah(totalIncome)}
                    </TableCell>
                  </TableRow>
                </TableFooter>
              </Table>
            </div>
            {unpaidCount > 0 && (
              <p className='mt-3 text-xs text-muted-foreground'>
                {unpaidCount} unpaid {unpaidCount === 1 ? 'order' : 'orders'} (
                {formatRupiah(unpaidAmount)}) in this period are not counted.
              </p>
            )}
          </CardContent>
        </Card>

        {/* Chart */}
        <Card>
          <CardHeader>
            <CardTitle>Income in Million</CardTitle>
            <CardDescription>Monthly income in millions of Rupiah (jt).</CardDescription>
          </CardHeader>
          <CardContent>
            <ChartContainer config={chartConfig} className='aspect-auto h-72 w-full'>
              <BarChart data={chartData} margin={{ top: 24, right: 8, left: 0, bottom: 0 }}>
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
                <Bar dataKey='income' fill='var(--color-income)' radius={4}>
                  <LabelList
                    dataKey='income'
                    position='top'
                    className='fill-foreground'
                    fontSize={12}
                    formatter={(v: unknown) => formatMillion(Number(v))}
                  />
                </Bar>
              </BarChart>
            </ChartContainer>
          </CardContent>
        </Card>
      </div>

      {/* Penjualan per kategori menu */}
      <Card>
        <CardHeader>
          <CardTitle>Sales by Category</CardTitle>
          <CardDescription>
            Food, drinks and desserts, {rangeLabel} (paid orders only).
          </CardDescription>
        </CardHeader>
        <CardContent>
          <CategorySales items={categorySales} />
        </CardContent>
      </Card>
    </div>
  );
}
