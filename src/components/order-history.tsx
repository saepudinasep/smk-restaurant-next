'use client';

import * as React from 'react';
import { BanknoteIcon, ClockIcon, ReceiptTextIcon, TrendingUpIcon } from 'lucide-react';

import { MenuPhoto } from '@/components/menu-photo';
import { SimpleDataTable, type Column } from '@/components/simple-data-table';
import { StatCards } from '@/components/stat-cards';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
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
  detailsOf,
  formatDate,
  formatRupiah,
  getEmployee,
  getMember,
  getMenu,
  headerOrders,
  orderPhase,
  orderTotal,
  type HeaderOrder,
  type ItemStatus,
  type OrderPhase,
} from '@/lib/dummy-data';
import { useFakeLoad } from '@/lib/fake-api';

const PHASE: Record<OrderPhase, { label: string; variant: 'default' | 'secondary' | 'outline' }> = {
  paid: { label: 'Paid', variant: 'default' },
  awaiting: { label: 'Awaiting payment', variant: 'outline' },
  kitchen: { label: 'In kitchen', variant: 'secondary' },
};

const ITEM_VARIANT: Record<ItemStatus, 'default' | 'secondary' | 'outline'> = {
  Pending: 'secondary',
  Cooking: 'default',
  Deliver: 'outline',
};

type Row = {
  header: HeaderOrder;
  memberName: string;
  employeeName: string;
  items: number;
  total: number;
  phase: OrderPhase;
};

type StatusFilter = 'all' | 'paid' | 'unpaid';
const statusItems = [
  { value: 'all', label: 'All status' },
  { value: 'paid', label: 'Paid' },
  { value: 'unpaid', label: 'Unpaid' },
];

const paymentLabel = (h: HeaderOrder) => (h.payment ? (h.bank ? `${h.payment} · ${h.bank}` : h.payment) : '-');
const monthLabel = (ym: string) => `${MONTHS[Number(ym.slice(5, 7)) - 1]} ${ym.slice(0, 4)}`;

/** Rincian satu order (hanya baca). */
function OrderDetailSheet({ row, onClose }: { row: Row; onClose: () => void }) {
  const { header, phase, total } = row;
  const details = detailsOf(header.orderId);
  const meta: [string, string][] = [
    ['Date', formatDate(header.date)],
    ['Member', `${row.memberName} (${header.memberId})`],
    ['Served by', row.employeeName],
    ['Payment', paymentLabel(header)],
  ];

  return (
    <Sheet open onOpenChange={(open) => !open && onClose()}>
      <SheetContent className='sm:max-w-lg'>
        <SheetHeader>
          <SheetTitle className='flex flex-wrap items-center gap-2'>
            Order <span className='font-mono'>{header.orderId}</span>
            <Badge variant={PHASE[phase].variant}>{PHASE[phase].label}</Badge>
          </SheetTitle>
          <SheetDescription>Read-only details of this order.</SheetDescription>
        </SheetHeader>

        <div className='flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto px-4'>
          <dl className='grid grid-cols-[auto_1fr] gap-x-6 gap-y-1.5 text-sm'>
            {meta.map(([k, v]) => (
              <React.Fragment key={k}>
                <dt className='text-muted-foreground'>{k}</dt>
                <dd className='text-right font-medium'>{v}</dd>
              </React.Fragment>
            ))}
          </dl>

          <div className='overflow-hidden rounded-lg border'>
            <Table>
              <TableHeader className='bg-muted'>
                <TableRow>
                  <TableHead>Menu</TableHead>
                  <TableHead className='text-right'>Qty</TableHead>
                  <TableHead className='text-right'>Total</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {details.map((d) => {
                  const menu = getMenu(d.menuId);
                  return (
                    <TableRow key={d.detailId}>
                      <TableCell>
                        <div className='flex items-center gap-3'>
                          <MenuPhoto menu={menu} />
                          <div className='flex min-w-0 flex-col gap-1'>
                            <span className='truncate font-medium'>{menu.name}</span>
                            <span className='flex items-center gap-2 text-xs text-muted-foreground tabular-nums'>
                              {formatRupiah(d.price)}
                              <Badge variant={ITEM_VARIANT[d.status]}>{d.status}</Badge>
                            </span>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className='text-right tabular-nums'>{d.qty}</TableCell>
                      <TableCell className='text-right font-medium tabular-nums'>
                        {formatRupiah(d.qty * d.price)}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
              <TableFooter>
                <TableRow>
                  <TableCell colSpan={2} className='text-right font-medium'>
                    Total
                  </TableCell>
                  <TableCell className='text-right text-base font-semibold tabular-nums'>
                    {formatRupiah(total)}
                  </TableCell>
                </TableRow>
              </TableFooter>
            </Table>
          </div>
        </div>

        <SheetFooter className='border-t'>
          <Button variant='outline' onClick={onClose}>
            Close
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}

export function OrderHistory() {
  // Simulasi membaca data. Saat database siap: ganti dengan data dari server (props) seperti proyek pertama.
  const loading = useFakeLoad('order-history');

  const [status, setStatus] = React.useState<StatusFilter>('all');
  const [month, setMonth] = React.useState('all');
  const [selected, setSelected] = React.useState<Row | null>(null);

  // Terbaru dulu (ID order berurutan menurut bulan lalu nomor urut)
  const rows: Row[] = [...headerOrders]
    .sort((a, b) => b.orderId.localeCompare(a.orderId))
    .map((header) => ({
      header,
      memberName: getMember(header.memberId).name,
      employeeName: getEmployee(header.employeeId).name,
      items: detailsOf(header.orderId).length,
      total: orderTotal(header.orderId),
      phase: orderPhase(header),
    }));

  const months = [...new Set(rows.map((r) => r.header.date.slice(0, 7)))].sort().reverse();
  const monthItems = [
    { value: 'all', label: 'All months' },
    ...months.map((m) => ({ value: m, label: monthLabel(m) })),
  ];

  const visible = rows.filter(
    (r) =>
      (status === 'all' || (status === 'paid' ? r.phase === 'paid' : r.phase !== 'paid')) &&
      (month === 'all' || r.header.date.startsWith(month)),
  );

  // Kartu ringkasan menghitung semua order, bukan hanya hasil filter
  const paid = rows.filter((r) => r.phase === 'paid');
  const unpaid = rows.filter((r) => r.phase !== 'paid');
  const revenue = paid.reduce((sum, r) => sum + r.total, 0);
  const outstanding = unpaid.reduce((sum, r) => sum + r.total, 0);
  const average = paid.length ? Math.round(revenue / paid.length) : 0;

  const columns: Column<Row>[] = [
    {
      header: 'Order ID',
      cell: (r) => (
        <button
          type='button'
          onClick={() => setSelected(r)}
          aria-label={`View details of order ${r.header.orderId}`}
          className='rounded font-mono underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2'
        >
          {r.header.orderId}
        </button>
      ),
    },
    { header: 'Date', cell: (r) => formatDate(r.header.date) },
    { header: 'Member', cell: (r) => r.memberName },
    { header: 'Served by', cell: (r) => r.employeeName },
    { header: 'Items', cell: (r) => r.items, className: 'text-right tabular-nums' },
    { header: 'Total', cell: (r) => formatRupiah(r.total), className: 'text-right tabular-nums' },
    { header: 'Payment', cell: (r) => paymentLabel(r.header) },
    {
      header: 'Status',
      cell: (r) => <Badge variant={PHASE[r.phase].variant}>{PHASE[r.phase].label}</Badge>,
    },
  ];

  return (
    <div className='flex flex-col gap-3 md:gap-3'>
      <StatCards
        loading={loading}
        items={[
          {
            label: 'Total Orders',
            value: rows.length,
            icon: ReceiptTextIcon,
            badge: `${months.length} ${months.length === 1 ? 'month' : 'months'}`,
            title: 'Every order recorded',
            note: 'Click an order ID to see its items',
          },
          {
            label: 'Paid Orders',
            value: paid.length,
            icon: BanknoteIcon,
            badge: formatRupiah(revenue),
            title: 'Completed and paid',
            note: 'Counted as revenue',
          },
          {
            label: 'Unpaid Orders',
            value: unpaid.length,
            icon: ClockIcon,
            badge: formatRupiah(outstanding),
            title: 'Still to be collected',
            note: 'In the kitchen or awaiting payment',
          },
          {
            label: 'Average Order',
            value: formatRupiah(average),
            icon: TrendingUpIcon,
            badge: 'per paid order',
            title: 'Mean value of a paid order',
            note: 'Total revenue / paid orders',
          },
        ]}
      />

      <SimpleDataTable
        data={visible}
        columns={columns}
        loading={loading}
        pageSizeOptions={[10, 20, 50]}
        getRowId={(r) => r.header.orderId}
        // Pencarian: Order ID, ID/nama member, kasir, tipe pembayaran, bank, atau total
        searchText={(r) =>
          `${r.header.orderId} ${r.header.memberId} ${r.memberName} ${r.employeeName} ${r.header.payment ?? ''} ${r.header.bank ?? ''} ${r.total} ${formatRupiah(r.total)}`
        }
        toolbarActions={
          <div className='flex items-center gap-2'>
            <Select items={statusItems} value={status} onValueChange={(v) => v && setStatus(v as StatusFilter)}>
              <SelectTrigger className='w-36' aria-label='Filter by status'>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {statusItems.map((i) => (
                  <SelectItem key={i.value} value={i.value}>
                    {i.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select items={monthItems} value={month} onValueChange={(v) => v && setMonth(v)}>
              <SelectTrigger className='w-40' aria-label='Filter by month'>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {monthItems.map((i) => (
                  <SelectItem key={i.value} value={i.value}>
                    {i.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        }
      />

      {selected && <OrderDetailSheet row={selected} onClose={() => setSelected(null)} />}
    </div>
  );
}
