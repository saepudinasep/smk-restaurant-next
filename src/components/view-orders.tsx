'use client';

import * as React from 'react';
import { ChefHatIcon, CircleCheckIcon, ClockIcon, FlameIcon, ReceiptTextIcon } from 'lucide-react';

import { MenuPhoto } from '@/components/menu-photo';
import { StatCards } from '@/components/stat-cards';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
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
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  ITEM_STATUSES,
  detailOrders,
  formatDate,
  getEmployee,
  getMember,
  getMenu,
  headerOrders,
  setDetailStatus,
  type DetailOrder,
  type ItemStatus,
} from '@/lib/dummy-data';
import { useFakeLoad, wait } from '@/lib/fake-api';

const statusItems = ITEM_STATUSES.map((s) => ({ value: s, label: s }));

/** Status gabungan satu order, dihitung dari status semua menunya. */
function orderStatus(details: DetailOrder[]): {
  label: string;
  variant: 'secondary' | 'default' | 'outline';
} {
  if (details.every((d) => d.status === 'Deliver')) return { label: 'Done', variant: 'outline' };
  if (details.every((d) => d.status === 'Pending'))
    return { label: 'Pending', variant: 'secondary' };
  return { label: 'In progress', variant: 'default' };
}

const statusDot: Record<ItemStatus, string> = {
  Pending: 'bg-muted-foreground/50',
  Cooking: 'bg-amber-500',
  Deliver: 'bg-emerald-500',
};

export function ViewOrders() {
  // Simulasi membaca data. Saat database siap: ganti dengan data dari server (props) seperti proyek pertama.
  const loading = useFakeLoad('view-orders');

  // Salinan lokal supaya UI ikut berubah; setiap perubahan juga ditulis ke dummy-data (pengganti UPDATE).
  const [details, setDetails] = React.useState<DetailOrder[]>(() =>
    detailOrders.map((d) => ({ ...d })),
  );

  // Antrian = order yang belum selesai saat halaman dibuka, urut dari yang terlama (FIFO).
  // Order yang baru selesai tetap tampil (berlabel Done) agar tidak tiba-tiba hilang dari layar chef.
  const [queue] = React.useState<string[]>(() =>
    headerOrders
      .filter((h) => detailOrders.some((d) => d.orderId === h.orderId && d.status !== 'Deliver'))
      .map((h) => h.orderId),
  );
  const [selectedId, setSelectedId] = React.useState<string>(() => queue[0] ?? '');
  const [saving, setSaving] = React.useState<Set<number>>(new Set());

  const detailsOf = (orderId: string) => details.filter((d) => d.orderId === orderId);

  const changeStatus = async (ids: number[], status: ItemStatus) => {
    setSaving((s) => new Set([...s, ...ids]));
    try {
      await wait(400);
      ids.forEach((id) => setDetailStatus(id, status));
      setDetails((list) => list.map((d) => (ids.includes(d.detailId) ? { ...d, status } : d)));
    } finally {
      setSaving((s) => {
        const next = new Set(s);
        ids.forEach((id) => next.delete(id));
        return next;
      });
    }
  };

  // Ringkasan hanya dari order yang masih dalam antrian
  const queued = details.filter((d) => queue.includes(d.orderId));
  const openOrders = queue.filter((id) => detailsOf(id).some((d) => d.status !== 'Deliver')).length;
  const pendingItems = queued.filter((d) => d.status === 'Pending').length;
  const cookingItems = queued.filter((d) => d.status === 'Cooking').length;

  const selected = selectedId ? headerOrders.find((h) => h.orderId === selectedId) : undefined;
  const selectedDetails = selected ? detailsOf(selected.orderId) : [];
  const selectedStatus = orderStatus(selectedDetails);
  const delivered = selectedDetails.filter((d) => d.status === 'Deliver').length;
  const undelivered = selectedDetails.filter((d) => d.status !== 'Deliver');

  return (
    <div className='flex flex-col gap-3 md:gap-3'>
      <StatCards
        loading={loading}
        items={[
          {
            label: 'Open Orders',
            value: openOrders,
            icon: ReceiptTextIcon,
            badge: `${queue.length} in queue`,
            title: 'Waiting for the kitchen',
            note: 'Orders with dishes not yet delivered',
          },
          {
            label: 'Pending Dishes',
            value: pendingItems,
            icon: ClockIcon,
            badge: 'To cook',
            title: 'Not started yet',
            note: 'Dishes waiting to be cooked',
          },
          {
            label: 'Cooking Dishes',
            value: cookingItems,
            icon: FlameIcon,
            badge: 'On the stove',
            title: 'Currently being cooked',
            note: 'Dishes ready soon to deliver',
          },
        ]}
      />

      {!loading && queue.length === 0 ? (
        <Card>
          <CardContent className='flex flex-col items-center gap-2 py-16 text-center'>
            <CircleCheckIcon className='size-8 text-primary' />
            <p className='font-medium'>The kitchen is all caught up</p>
            <p className='text-sm text-muted-foreground'>
              There are no open orders. New orders will appear here.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className='grid items-start gap-4 lg:grid-cols-[20rem_minmax(0,1fr)]'>
          {/* Antrian order */}
          <Card>
            <CardHeader>
              <CardTitle>Order Queue</CardTitle>
              <CardDescription>Oldest orders first.</CardDescription>
            </CardHeader>
            <CardContent>
              <ul className='flex max-h-[28rem] flex-col gap-2 overflow-y-auto lg:max-h-[32rem]'>
                {loading &&
                  Array.from({ length: 4 }).map((_, i) => (
                    <li key={i} aria-busy='true'>
                      <Skeleton className='h-[4.5rem] w-full' />
                    </li>
                  ))}
                {!loading &&
                  queue.map((orderId) => {
                    const header = headerOrders.find((h) => h.orderId === orderId)!;
                    const list = detailsOf(orderId);
                    const status = orderStatus(list);
                    const done = list.filter((d) => d.status === 'Deliver').length;
                    const active = orderId === selectedId;
                    return (
                      <li key={orderId}>
                        <button
                          type='button'
                          aria-current={active}
                          onClick={() => setSelectedId(orderId)}
                          className='flex w-full flex-col gap-2 rounded-lg border p-3 text-left transition-colors hover:bg-muted/50 aria-[current=true]:border-primary aria-[current=true]:bg-primary/5'
                        >
                          <div className='flex items-center justify-between gap-2'>
                            <span className='font-mono text-sm font-medium'>{orderId}</span>
                            <Badge variant={status.variant}>{status.label}</Badge>
                          </div>
                          <div className='flex items-center justify-between gap-2 text-xs text-muted-foreground'>
                            <span className='truncate'>{getMember(header.memberId).name}</span>
                            <span className='shrink-0'>{formatDate(header.date)}</span>
                          </div>
                          <div className='flex items-center gap-2'>
                            <div
                              role='progressbar'
                              aria-label='Dishes delivered'
                              aria-valuemin={0}
                              aria-valuemax={list.length}
                              aria-valuenow={done}
                              className='h-1.5 flex-1 overflow-hidden rounded-full bg-muted'
                            >
                              <div
                                className='h-full bg-primary transition-[width]'
                                style={{
                                  width: `${list.length ? (done / list.length) * 100 : 0}%`,
                                }}
                              />
                            </div>
                            <span className='text-xs text-muted-foreground tabular-nums'>
                              {done}/{list.length}
                            </span>
                          </div>
                        </button>
                      </li>
                    );
                  })}
              </ul>
            </CardContent>
          </Card>

          {/* Detail order terpilih */}
          <Card>
            <CardHeader>
              <CardTitle className='flex flex-wrap items-center gap-2'>
                <ChefHatIcon className='size-4' />
                {selected ? (
                  <>
                    Order <span className='font-mono'>{selected.orderId}</span>
                    <Badge variant={selectedStatus.variant}>{selectedStatus.label}</Badge>
                  </>
                ) : (
                  'Order Details'
                )}
              </CardTitle>
              <CardDescription>
                {selected
                  ? `${getMember(selected.memberId).name} · ${formatDate(selected.date)} · taken by ${getEmployee(selected.employeeId).name}`
                  : 'Choose an order from the queue.'}
              </CardDescription>
            </CardHeader>
            <CardContent className='flex flex-col gap-4'>
              {loading && <Skeleton className='h-48 w-full' />}

              {!loading && !selected && (
                <p className='py-8 text-center text-sm text-muted-foreground'>
                  Select an order on the left to update its dishes.
                </p>
              )}

              {!loading && selected && (
                <>
                  <div className='overflow-hidden rounded-lg border'>
                    <Table>
                      <TableHeader className='bg-muted'>
                        <TableRow>
                          <TableHead>Menu</TableHead>
                          <TableHead className='w-16 text-right'>Qty</TableHead>
                          <TableHead className='w-44'>Action</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {selectedDetails.map((d) => {
                          const menu = getMenu(d.menuId);
                          const busy = saving.has(d.detailId);
                          return (
                            <TableRow key={d.detailId}>
                              <TableCell>
                                <div className='flex items-center gap-3'>
                                  <MenuPhoto menu={menu} />
                                  <span className='font-medium'>{menu.name}</span>
                                </div>
                              </TableCell>
                              <TableCell className='text-right text-base font-semibold tabular-nums'>
                                {d.qty}
                              </TableCell>
                              <TableCell>
                                <div className='flex items-center gap-2'>
                                  <Select
                                    items={statusItems}
                                    value={d.status}
                                    disabled={busy}
                                    onValueChange={(v) =>
                                      v &&
                                      v !== d.status &&
                                      changeStatus([d.detailId], v as ItemStatus)
                                    }
                                  >
                                    <SelectTrigger
                                      className='w-full'
                                      aria-label={`Status of ${menu.name}`}
                                    >
                                      <span
                                        aria-hidden
                                        className={`size-2 shrink-0 rounded-full ${statusDot[d.status]}`}
                                      />
                                      <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                      {ITEM_STATUSES.map((s) => (
                                        <SelectItem key={s} value={s}>
                                          {s}
                                        </SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                  {busy && <Spinner />}
                                </div>
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </div>

                  <div className='flex flex-wrap items-center justify-between gap-3'>
                    <span className='text-sm text-muted-foreground'>
                      {delivered} of {selectedDetails.length} dishes delivered
                    </span>
                    <Button
                      disabled={
                        undelivered.length === 0 || undelivered.some((d) => saving.has(d.detailId))
                      }
                      onClick={() =>
                        changeStatus(
                          undelivered.map((d) => d.detailId),
                          'Deliver',
                        )
                      }
                    >
                      <CircleCheckIcon />
                      Deliver all
                    </Button>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
