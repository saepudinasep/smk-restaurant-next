'use client';

import * as React from 'react';
import { Bar, BarChart, CartesianGrid, LabelList, XAxis, YAxis } from 'recharts';
import { BanknoteIcon, CalendarRangeIcon, ReceiptTextIcon, TrendingUpIcon } from 'lucide-react';

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
import { Skeleton } from '@/components/ui/skeleton';
import { Spinner } from '@/components/ui/spinner';
import {
  Table,
  TableBody,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  MONTHS,
  formatMillion,
  formatRupiah,
  headerOrders,
  incomeByMonth,
  orderTotal,
} from '@/lib/dummy-data';
import { useFakeLoad, wait } from '@/lib/fake-api';

const monthItems = MONTHS.map((m, i) => ({ value: String(i), label: m }));

// Warna batang memakai --primary (warna --chart-1 di tema ini terlalu pucat)
const chartConfig = { income: { label: 'Income', color: 'var(--primary)' } } satisfies ChartConfig;

type Range = { year: number; from: number; to: number };

const yearOf = (date: string) => Number(date.slice(0, 4));
const monthOf = (date: string) => Number(date.slice(5, 7)) - 1;

/** Tahun yang punya order terbayar (terbaru dulu) dan bulan terakhir yang berisi order di tahun itu. */
function reportDefaults() {
  const paid = headerOrders.filter((h) => h.payment !== null);
  const years = [...new Set(paid.map((h) => yearOf(h.date)))].sort((a: number, b: number) => b - a);
  const year = years[0] ?? 2026;
  const last = Math.max(0, ...paid.filter((h) => yearOf(h.date) === year).map((h) => monthOf(h.date)));
  return { years: years.length ? years : [year], applied: { year, from: 0, to: last } as Range };
}

export function Report() {
  // Simulasi membaca data. Saat database siap: ganti dengan data dari server (props) seperti proyek pertama.
  const loading = useFakeLoad('report');

  const [defaults] = React.useState(reportDefaults);
  const [year, setYear] = React.useState(String(defaults.applied.year));
  const [from, setFrom] = React.useState(String(defaults.applied.from));
  const [to, setTo] = React.useState(String(defaults.applied.to));
  const [applied, setApplied] = React.useState<Range>(defaults.applied);
  const [generating, setGenerating] = React.useState(false);

  const invalidRange = Number(from) > Number(to);

  const generate = async () => {
    if (invalidRange) return;
    setGenerating(true);
    try {
      await wait(400);
      setApplied({ year: Number(year), from: Number(from), to: Number(to) });
    } finally {
      setGenerating(false);
    }
  };

  const rows = incomeByMonth(applied.from, applied.to, applied.year);
  const totalIncome = rows.reduce((sum, r) => sum + r.income, 0);
  const totalOrders = rows.reduce((sum, r) => sum + r.orders, 0);
  const average = totalOrders ? Math.round(totalIncome / totalOrders) : 0;
  const best = rows.reduce((b, r) => (r.income > b.income ? r : b), rows[0]);

  // Order yang belum dibayar pada periode yang sama tidak masuk pendapatan
  const unpaid = headerOrders.filter(
    (h) =>
      h.payment === null &&
      yearOf(h.date) === applied.year &&
      monthOf(h.date) >= applied.from &&
      monthOf(h.date) <= applied.to,
  );
  const unpaidAmount = unpaid.reduce((sum, h) => sum + orderTotal(h.orderId), 0);

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
                items={defaults.years.map((y) => ({ value: String(y), label: String(y) }))}
                value={year}
                onValueChange={(v) => v && setYear(v)}
              >
                <SelectTrigger className='w-full' aria-label='Year'>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {defaults.years.map((y) => (
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
              {invalidRange && <FieldError>&ldquo;From&rdquo; cannot be after &ldquo;To&rdquo;.</FieldError>}
            </Field>

            <Button className='mt-[1.625rem]' disabled={generating || loading || invalidRange} onClick={generate}>
              {generating && <Spinner />}
              {generating ? 'Generating...' : 'Generate'}
            </Button>
          </div>
        </CardContent>
      </Card>

      <StatCards
        loading={loading || generating}
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
            note: unpaid.length ? `${unpaid.length} more still unpaid` : 'No unpaid orders in this period',
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
            {loading || generating ? (
              <Skeleton className='h-64 w-full' />
            ) : (
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
                        <TableCell className='text-right tabular-nums'>{formatRupiah(r.income)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                  <TableFooter>
                    <TableRow>
                      <TableCell className='font-medium'>Total</TableCell>
                      <TableCell className='text-right font-medium tabular-nums'>{totalOrders}</TableCell>
                      <TableCell className='text-right font-semibold tabular-nums'>
                        {formatRupiah(totalIncome)}
                      </TableCell>
                    </TableRow>
                  </TableFooter>
                </Table>
              </div>
            )}
            {!loading && !generating && unpaid.length > 0 && (
              <p className='mt-3 text-xs text-muted-foreground'>
                {unpaid.length} unpaid {unpaid.length === 1 ? 'order' : 'orders'} ({formatRupiah(unpaidAmount)}) in this
                period are not counted.
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
            {loading || generating ? (
              <Skeleton className='h-72 w-full' />
            ) : (
              <ChartContainer config={chartConfig} className='aspect-auto h-72 w-full'>
                <BarChart data={chartData} margin={{ top: 24, right: 8, left: 0, bottom: 0 }}>
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
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
