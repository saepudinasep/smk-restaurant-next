'use client';

import * as React from 'react';
import { toast } from 'sonner';
import {
  ChefHatIcon,
  CircleCheckIcon,
  ClockIcon,
  FlameIcon,
  ReceiptTextIcon,
  SearchIcon,
  XIcon,
} from 'lucide-react';

import { updateDishStatus } from '@/actions/kitchen';
import { MenuPhoto } from '@/components/menu-photo';
import { useLiveRefresh } from '@/hooks/use-live-refresh';
import { StatCards } from '@/components/stat-cards';
import { ConfirmActionDialog } from '@/components/ui/alert-dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Spinner } from '@/components/ui/spinner';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import type { KitchenItem, KitchenOrder } from '@/lib/data/kitchen';
import { formatDate } from '@/lib/format';
import { ITEM_STATUSES } from '@/lib/validations';

type ItemStatus = KitchenItem['status'];

const statusItems = ITEM_STATUSES.map((s) => ({ value: s, label: s }));

/** Status gabungan satu order, dihitung dari status semua menunya. */
function orderStatus(items: KitchenItem[]): {
  label: string;
  variant: 'secondary' | 'default' | 'outline';
} {
  if (items.every((d) => d.status === 'Deliver')) return { label: 'Done', variant: 'outline' };
  if (items.every((d) => d.status === 'Pending')) return { label: 'Pending', variant: 'secondary' };
  return { label: 'In progress', variant: 'default' };
}

const statusDot: Record<ItemStatus, string> = {
  Pending: 'bg-muted-foreground/50',
  Cooking: 'bg-amber-500',
  Deliver: 'bg-emerald-500',
};

export function ViewOrders({ initialOrders }: { initialOrders: KitchenOrder[] }) {
  // Data datang dari server (props). Setelah Server Action memanggil revalidatePath,
  // Next.js mengirim props baru, jadi status yang tampil selalu yang tersimpan di database.
  const orders = initialOrders;

  const [selectedId, setSelectedId] = React.useState<string>(() => orders[0]?.orderId ?? '');
  const [saving, setSaving] = React.useState<Set<string>>(new Set());
  const [pendingStatus, setPendingStatus] = React.useState<{
    detailIds: string[];
    status: ItemStatus;
    label: string;
  } | null>(null);
  const [error, setError] = React.useState('');
  const [query, setQuery] = React.useState('');

  // Data disegarkan otomatis saat ada kejadian realtime (dan berkala sebagai cadangan)
  useLiveRefresh();

  const changeStatus = async (detailIds: string[], status: ItemStatus) => {
    setSaving((s) => new Set([...s, ...detailIds]));
    setError('');
    try {
      const result = await updateDishStatus({ detailIds, status });
      if (!result.ok) {
        setError(result.error);
        toast.error(result.error);
      } else {
        toast.success(`Dish status updated to ${status}.`);
      }
    } catch {
      setError('Network error. Please try again.');
      toast.error('Network error. Please try again.');
    } finally {
      setSaving((s) => {
        const next = new Set(s);
        detailIds.forEach((id) => next.delete(id));
        return next;
      });
    }
  };

  const requestStatusChange = (detailIds: string[], status: ItemStatus, label: string) => {
    setPendingStatus({ detailIds, status, label });
  };

  // Ringkasan dari semua order yang tampil
  const allItems = orders.flatMap((o) => o.items);
  const openOrders = orders.filter((o) => o.items.some((d) => d.status !== 'Deliver')).length;
  const pendingItems = allItems.filter((d) => d.status === 'Pending').length;
  const cookingItems = allItems.filter((d) => d.status === 'Cooking').length;

  // Pencarian: Order ID, nama member, atau nama menu di dalam order (mis. "gurame")
  const needle = query.trim().toLowerCase();
  const visibleOrders = needle
    ? orders.filter((o) =>
        `${o.orderId} ${o.memberName} ${o.items.map((d) => d.menuName).join(' ')}`
          .toLowerCase()
          .includes(needle),
      )
    : orders;

  const selected = orders.find((o) => o.orderId === selectedId);
  const selectedItems = selected?.items ?? [];
  const selectedStatus = orderStatus(selectedItems);
  const delivered = selectedItems.filter((d) => d.status === 'Deliver').length;
  const undelivered = selectedItems.filter((d) => d.status !== 'Deliver');

  return (
    <>
    <div className='flex flex-col gap-3 md:gap-3'>
      <StatCards
        items={[
          {
            label: 'Open Orders',
            value: openOrders,
            icon: ReceiptTextIcon,
            badge: `${orders.length} in queue`,
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

      {orders.length === 0 ? (
        <Card>
          <CardContent className='flex flex-col items-center gap-2 py-16 text-center'>
            <CircleCheckIcon className='size-8 text-primary' />
            <p className='font-medium'>The kitchen is all caught up</p>
            <p className='text-sm text-muted-foreground'>
              There are no open orders. New orders will appear here automatically.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className='grid items-start gap-4 lg:grid-cols-[20rem_minmax(0,1fr)]'>
          {/* Antrian order */}
          <Card>
            <CardHeader>
              <CardTitle>Order Queue</CardTitle>
              <CardDescription>Oldest orders first. Updates live.</CardDescription>
            </CardHeader>
            <CardContent className='flex flex-col gap-3'>
              <div className='relative'>
                <SearchIcon className='pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground' />
                <Input
                  className='px-8'
                  placeholder='Search order, member or dish...'
                  aria-label='Search open orders'
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  onKeyDown={(e) => {
                    // Enter memilih hasil pertama, Escape menghapus pencarian
                    if (e.key === 'Enter' && visibleOrders[0])
                      setSelectedId(visibleOrders[0].orderId);
                    if (e.key === 'Escape') setQuery('');
                  }}
                />
                {query && (
                  <Button
                    variant='ghost'
                    size='icon-sm'
                    className='absolute top-1/2 right-1 -translate-y-1/2'
                    aria-label='Clear search'
                    onClick={() => setQuery('')}
                  >
                    <XIcon />
                  </Button>
                )}
              </div>
              {needle && (
                <p className='text-xs text-muted-foreground' aria-live='polite'>
                  {visibleOrders.length} of {orders.length} orders
                </p>
              )}
              <ul className='flex max-h-[28rem] flex-col gap-2 overflow-y-auto lg:max-h-[32rem]'>
                {visibleOrders.length === 0 && (
                  <li className='py-8 text-center text-sm text-muted-foreground'>
                    No orders match &ldquo;{query.trim()}&rdquo;.
                  </li>
                )}
                {visibleOrders.map((o) => {
                  const status = orderStatus(o.items);
                  const done = o.items.filter((d) => d.status === 'Deliver').length;
                  const active = o.orderId === selectedId;
                  return (
                    <li key={o.orderId}>
                      <button
                        type='button'
                        aria-current={active}
                        onClick={() => setSelectedId(o.orderId)}
                        className='flex w-full flex-col gap-2 rounded-lg border p-3 text-left transition-colors hover:bg-muted/50 aria-[current=true]:border-primary aria-[current=true]:bg-primary/5'
                      >
                        <div className='flex items-center justify-between gap-2'>
                          <span className='font-mono text-sm font-medium'>{o.orderId}</span>
                          <Badge variant={status.variant}>{status.label}</Badge>
                        </div>
                        <div className='flex items-center justify-between gap-2 text-xs text-muted-foreground'>
                          <span className='truncate'>{o.memberName}</span>
                          <span className='shrink-0'>{formatDate(o.date)}</span>
                        </div>
                        <div className='flex items-center gap-2'>
                          <div
                            role='progressbar'
                            aria-label='Dishes delivered'
                            aria-valuemin={0}
                            aria-valuemax={o.items.length}
                            aria-valuenow={done}
                            className='h-1.5 flex-1 overflow-hidden rounded-full bg-muted'
                          >
                            <div
                              className='h-full bg-primary transition-[width]'
                              style={{
                                width: `${o.items.length ? (done / o.items.length) * 100 : 0}%`,
                              }}
                            />
                          </div>
                          <span className='text-xs text-muted-foreground tabular-nums'>
                            {done}/{o.items.length}
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
                  ? `${selected.memberName} · ${formatDate(selected.date)} · taken by ${selected.cashierName}`
                  : 'Choose an order from the queue.'}
              </CardDescription>
            </CardHeader>
            <CardContent className='flex flex-col gap-4'>
              {!selected && (
                <p className='py-8 text-center text-sm text-muted-foreground'>
                  Select an order on the left to update its dishes.
                </p>
              )}

              {selected && (
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
                        {selectedItems.map((d) => {
                          const busy = saving.has(d.detailId);
                          return (
                            <TableRow key={d.detailId}>
                              <TableCell>
                                <div className='flex items-center gap-3'>
                                  <MenuPhoto menu={{ name: d.menuName, photo: d.photo }} />
                                  <span className='font-medium'>{d.menuName}</span>
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
                                      requestStatusChange(
                                        [d.detailId],
                                        v as ItemStatus,
                                        `${d.menuName} in order ${selected.orderId}`,
                                      )
                                    }
                                  >
                                    <SelectTrigger
                                      className='w-full'
                                      aria-label={`Status of ${d.menuName}`}
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

                  {error && (
                    <p role='alert' className='text-sm text-destructive'>
                      {error}
                    </p>
                  )}

                  <div className='flex flex-wrap items-center justify-between gap-3'>
                    <span className='text-sm text-muted-foreground'>
                      {delivered} of {selectedItems.length} dishes delivered
                    </span>
                    <Button
                      disabled={
                        undelivered.length === 0 || undelivered.some((d) => saving.has(d.detailId))
                      }
                      onClick={() =>
                        requestStatusChange(
                          undelivered.map((d) => d.detailId),
                          'Deliver',
                          `all remaining dishes in order ${selected.orderId}`,
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
    <ConfirmActionDialog
      open={pendingStatus !== null}
      onOpenChange={(open) => !open && setPendingStatus(null)}
      title='Update dish status?'
      description={
        pendingStatus
          ? `Change the status of ${pendingStatus.label} to ${pendingStatus.status}?`
          : ''
      }
      confirmLabel='Update Status'
      onConfirm={() => {
        if (!pendingStatus) return;
        void changeStatus(pendingStatus.detailIds, pendingStatus.status);
        setPendingStatus(null);
      }}
    />
    </>
  );
}
