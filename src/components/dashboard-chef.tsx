'use client';

import * as React from 'react';
import Link from 'next/link';
import { ChefHatIcon, CircleCheckIcon, ClockIcon, FlameIcon, ReceiptTextIcon } from 'lucide-react';

import { MenuPhoto } from '@/components/menu-photo';
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
import type { ChefDashboardData } from '@/lib/data/dashboard';
import { formatDate } from '@/lib/format';

export function ChefDashboard({ data }: { data: ChefDashboardData }) {
  // Semua angka dihitung server saat halaman dibuka dan disegarkan (revalidatePath) setiap ada order
  // baru atau status menu berubah.
  const { queue, queueTotal, prep } = data;
  const prepMax = prep[0]?.total ?? 1;

  return (
    <div className='flex flex-col gap-3 md:gap-3'>
      <StatCards
        items={[
          {
            label: 'Open Orders',
            value: data.openOrders,
            icon: ReceiptTextIcon,
            badge: data.openOrders ? 'In the queue' : 'All clear',
            title: 'Waiting for the kitchen',
            note: 'Orders with dishes not yet delivered',
          },
          {
            label: 'Pending Dishes',
            value: data.pendingItems,
            icon: ClockIcon,
            badge: `${data.pendingPortions} portions`,
            title: 'Not started yet',
            note: 'Dishes waiting to be cooked',
          },
          {
            label: 'Cooking Dishes',
            value: data.cookingItems,
            icon: FlameIcon,
            badge: `${data.cookingPortions} portions`,
            title: 'Currently being cooked',
            note: 'Deliver them when they are ready',
          },
          {
            label: 'Portions to Cook',
            value: data.portionsToCook,
            icon: ChefHatIcon,
            badge: `${data.menusToPrep} menus`,
            title: 'Pending and cooking',
            note: 'Total portions left to deliver',
          },
        ]}
      />

      <div className='grid items-start gap-4 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]'>
        {/* Antrian order */}
        <Card>
          <CardHeader>
            <CardTitle>Order Queue</CardTitle>
            <CardDescription>Oldest orders first.</CardDescription>
            <CardAction>
              <Link href='/view-orders' className={buttonVariants({ size: 'sm' })}>
                Open View Orders
              </Link>
            </CardAction>
          </CardHeader>
          <CardContent>
            <ul className='flex flex-col gap-2'>
              {queue.length === 0 && (
                <li className='flex flex-col items-center gap-2 py-10 text-center text-sm text-muted-foreground'>
                  <CircleCheckIcon className='size-8 text-primary' />
                  <span className='font-medium text-foreground'>The kitchen is all caught up</span>
                  There are no open orders right now.
                </li>
              )}

              {queue.map((o) => (
                <li key={o.orderId} className='flex flex-col gap-2 rounded-lg border p-3'>
                  <div className='flex items-center justify-between gap-2'>
                    <span className='font-mono text-sm font-medium'>{o.orderId}</span>
                    <Badge variant={o.started ? 'default' : 'secondary'}>
                      {o.started ? 'In progress' : 'Pending'}
                    </Badge>
                  </div>
                  <p className='truncate text-sm text-muted-foreground'>{o.dishes}</p>
                  <div className='flex items-center justify-between gap-2 text-xs text-muted-foreground'>
                    <span className='truncate'>
                      {o.memberName} · {formatDate(o.date)}
                    </span>
                    <span className='shrink-0 tabular-nums'>
                      {o.done}/{o.total} delivered
                    </span>
                  </div>
                </li>
              ))}
            </ul>
            {queueTotal > queue.length && (
              <p className='mt-3 text-xs text-muted-foreground'>
                And {queueTotal - queue.length} more open{' '}
                {queueTotal - queue.length === 1 ? 'order' : 'orders'} in View Orders.
              </p>
            )}
          </CardContent>
        </Card>

        {/* Daftar siapkan */}
        <Card>
          <CardHeader>
            <CardTitle>Prep List</CardTitle>
            <CardDescription>Portions still to deliver, per menu.</CardDescription>
          </CardHeader>
          <CardContent>
            <ol className='flex flex-col gap-4'>
              {prep.length === 0 && (
                <li className='py-6 text-center text-sm text-muted-foreground'>
                  Nothing to prepare.
                </li>
              )}
              {prep.map((p) => (
                <li key={p.menuId} className='flex items-center gap-3'>
                  <MenuPhoto menu={{ name: p.name, photo: p.photo }} />
                  <div className='flex min-w-0 flex-1 flex-col gap-1'>
                    <div className='flex items-baseline justify-between gap-2'>
                      <span className='truncate text-sm font-medium'>{p.name}</span>
                      <span className='shrink-0 text-sm font-semibold tabular-nums'>{p.total}</span>
                    </div>
                    <div
                      role='progressbar'
                      aria-label={`${p.name} portions left`}
                      aria-valuemin={0}
                      aria-valuemax={prepMax}
                      aria-valuenow={p.total}
                      className='h-1.5 overflow-hidden rounded-full bg-muted'
                    >
                      <div
                        className='h-full bg-primary'
                        style={{ width: `${(p.total / prepMax) * 100}%` }}
                      />
                    </div>
                    <span className='text-xs text-muted-foreground tabular-nums'>
                      {p.pending} pending · {p.cooking} cooking
                    </span>
                  </div>
                </li>
              ))}
            </ol>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
