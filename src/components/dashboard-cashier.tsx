'use client';

import * as React from 'react';
import Link from 'next/link';
import {
  BanknoteIcon,
  ClipboardListIcon,
  CircleCheckIcon,
  CreditCardIcon,
  HistoryIcon,
  ReceiptTextIcon,
  TrendingUpIcon,
  type LucideIcon,
} from 'lucide-react';

import { OrderStatusBadge } from '@/components/order-status-badge';
import { StatCards } from '@/components/stat-cards';
import { Badge } from '@/components/ui/badge';
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import type { CashierDashboardData } from '@/lib/data/dashboard';
import { formatDate, formatRupiah } from '@/lib/format';

const shortcuts: { href: string; title: string; description: string; icon: LucideIcon }[] = [
  {
    href: '/orders',
    title: 'New Order',
    description: 'Take an order from a guest',
    icon: ClipboardListIcon,
  },
  {
    href: '/payments',
    title: 'Take Payment',
    description: 'Collect payment for an order',
    icon: CreditCardIcon,
  },
  {
    href: '/order-history',
    title: 'Order History',
    description: 'Look up any past order',
    icon: HistoryIcon,
  },
];

export function CashierDashboard({ data }: { data: CashierDashboardData }) {
  // Semua angka dihitung server saat halaman dibuka dan disegarkan (revalidatePath) setiap ada order
  // baru, perubahan status dapur, atau pembayaran.
  const { unpaid, myRecent, mix, paidTotal } = data;

  return (
    <div className='flex flex-col gap-3 md:gap-3'>
      <StatCards
        items={[
          {
            label: 'Unpaid Orders',
            value: data.unpaidCount,
            icon: ReceiptTextIcon,
            badge: `${data.ready} ready to pay`,
            title: 'Waiting for payment',
            note: 'Kitchen may still be cooking',
          },
          {
            label: 'Outstanding',
            value: formatRupiah(data.outstanding),
            icon: BanknoteIcon,
            badge: `${data.unpaidCount} orders`,
            title: 'Still to be collected',
            note: 'Sum of all unpaid orders',
          },
          {
            label: 'My Orders',
            value: data.myOrders,
            icon: ClipboardListIcon,
            badge: `${data.myPaid} paid`,
            title: 'Orders you created',
            note: `Taken by ${data.name || 'you'}`,
          },
          {
            label: 'My Revenue',
            value: formatRupiah(data.myRevenue),
            icon: TrendingUpIcon,
            badge: data.myPaid
              ? `${formatRupiah(Math.round(data.myRevenue / data.myPaid))} avg`
              : 'No sales yet',
            title: 'From your paid orders',
            note: 'Average value per order shown above',
          },
        ]}
      />

      {/* Pintasan */}
      <div className='grid gap-3 sm:grid-cols-3'>
        {shortcuts.map(({ href, title, description, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            className='flex items-center gap-3 rounded-lg border bg-card p-4 transition-colors hover:bg-muted/50 focus-visible:outline-2 focus-visible:outline-offset-2'
          >
            <div className='flex size-10 shrink-0 items-center justify-center rounded-lg border bg-background'>
              <Icon className='size-5' />
            </div>
            <div className='flex min-w-0 flex-col'>
              <span className='font-medium'>{title}</span>
              <span className='text-sm text-muted-foreground'>{description}</span>
            </div>
          </Link>
        ))}
      </div>

      <div className='grid items-start gap-4 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]'>
        {/* Menunggu pembayaran */}
        <Card>
          <CardHeader>
            <CardTitle>Awaiting Payment</CardTitle>
            <CardDescription>Oldest unpaid orders first.</CardDescription>
            <CardAction>
              <Link href='/payments' className={buttonVariants({ size: 'sm' })}>
                Go to Payments
              </Link>
            </CardAction>
          </CardHeader>
          <CardContent>
            <ul className='flex flex-col gap-2'>
              {unpaid.length === 0 && (
                <li className='flex flex-col items-center gap-2 py-10 text-center text-sm text-muted-foreground'>
                  <CircleCheckIcon className='size-8 text-primary' />
                  <span className='font-medium text-foreground'>Everything is paid</span>
                  There are no unpaid orders right now.
                </li>
              )}

              {unpaid.map((o) => (
                <li key={o.orderId} className='flex flex-col gap-2 rounded-lg border p-3'>
                  <div className='flex items-center justify-between gap-2'>
                    <span className='font-mono text-sm font-medium'>{o.orderId}</span>
                    {o.done === o.itemCount ? (
                      <Badge variant='outline'>Kitchen done</Badge>
                    ) : (
                      <Badge variant='secondary'>
                        {o.done}/{o.itemCount} delivered
                      </Badge>
                    )}
                  </div>
                  <div className='flex items-center justify-between gap-2 text-sm'>
                    <span className='truncate text-muted-foreground'>
                      {o.memberName} · {formatDate(o.date)}
                    </span>
                    <span className='shrink-0 font-semibold tabular-nums'>
                      {formatRupiah(o.total)}
                    </span>
                  </div>
                </li>
              ))}
            </ul>
            {data.unpaidCount > unpaid.length && (
              <p className='mt-3 text-xs text-muted-foreground'>
                And {data.unpaidCount - unpaid.length} more unpaid{' '}
                {data.unpaidCount - unpaid.length === 1 ? 'order' : 'orders'} in Payments.
              </p>
            )}
          </CardContent>
        </Card>

        {/* Metode pembayaran */}
        <Card>
          <CardHeader>
            <CardTitle>Payment Methods</CardTitle>
            <CardDescription>How guests paid across {paidTotal} paid orders.</CardDescription>
          </CardHeader>
          <CardContent>
            <ul className='flex flex-col gap-4'>
              {mix.map(({ type, count }) => {
                const pct = paidTotal ? Math.round((count / paidTotal) * 100) : 0;
                return (
                  <li key={type} className='flex flex-col gap-1.5'>
                    <div className='flex items-baseline justify-between gap-2 text-sm'>
                      <span className='font-medium'>{type}</span>
                      <span className='text-muted-foreground tabular-nums'>
                        {count} orders · {pct}%
                      </span>
                    </div>
                    <div
                      role='progressbar'
                      aria-label={`${type} share of paid orders`}
                      aria-valuemin={0}
                      aria-valuemax={100}
                      aria-valuenow={pct}
                      className='h-1.5 overflow-hidden rounded-full bg-muted'
                    >
                      <div className='h-full bg-primary' style={{ width: `${pct}%` }} />
                    </div>
                  </li>
                );
              })}
            </ul>
          </CardContent>
        </Card>
      </div>

      {/* Order terbaru milik kasir ini */}
      <Card>
        <CardHeader>
          <CardTitle>My Recent Orders</CardTitle>
          <CardDescription>The latest orders you created.</CardDescription>
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
          {myRecent.length === 0 ? (
            <p className='py-8 text-center text-sm text-muted-foreground'>
              You have not created any orders yet. Start with New Order.
            </p>
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
                  {myRecent.map((o) => (
                    <TableRow key={o.orderId}>
                      <TableCell className='font-mono'>{o.orderId}</TableCell>
                      <TableCell>{o.memberName}</TableCell>
                      <TableCell>{formatDate(o.date)}</TableCell>
                      <TableCell className='text-right tabular-nums'>
                        {formatRupiah(o.total)}
                      </TableCell>
                      <TableCell>
                        <OrderStatusBadge phase={o.phase} />
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
