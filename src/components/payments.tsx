'use client';

import * as React from 'react';
import {
  BanknoteIcon,
  CircleCheckIcon,
  ClockIcon,
  CreditCardIcon,
  ReceiptTextIcon,
  SearchIcon,
  XIcon,
} from 'lucide-react';

import { MenuPhoto } from '@/components/menu-photo';
import { StatCards } from '@/components/stat-cards';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
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
  BANKS,
  PAYMENT_TYPES,
  detailsOf,
  formatDate,
  formatRupiah,
  getMember,
  getMenu,
  headerOrders,
  orderTotal,
  setPayment,
  type Bank,
  type HeaderOrder,
  type PaymentType,
} from '@/lib/dummy-data';
import { useFakeLoad, wait } from '@/lib/fake-api';

const paymentItems = PAYMENT_TYPES.map((t) => ({ value: t, label: t }));
const bankItems = BANKS.map((b) => ({ value: b, label: b }));

const CARD_DIGITS = 16;
const isCard = (type: PaymentType | '') => type === 'Credit Card' || type === 'Debit Card';

/** '1234567890123456' -> '1234 5678 9012 3456' */
const formatCard = (digits: string) => digits.replace(/(\d{4})(?=\d)/g, '$1 ');

/** Hasil pembayaran yang ditampilkan sebagai struk setelah Save. */
type Receipt = {
  total: number;
  payment: PaymentType;
  bank: Bank | null;
  received: number | null; // hanya Cash
};

type Form = { type: PaymentType | ''; card: string; bank: Bank | ''; received: string };
type FieldKey = keyof Form;
type Errors = Partial<Record<FieldKey, string>>;

// Nomor kartu tidak disimpan (tidak ada kolomnya di ERD); hanya divalidasi.
function validate(form: Form, total: number): Errors {
  const errors: Errors = {};
  if (!form.type) {
    errors.type = 'Select a payment type.';
    return errors;
  }
  if (isCard(form.type)) {
    if (!form.card) errors.card = 'Card number is required.';
    else if (form.card.length !== CARD_DIGITS)
      errors.card = `Card number must be ${CARD_DIGITS} digits.`;
    if (!form.bank) errors.bank = 'Select the bank.';
  } else {
    if (!form.received) errors.received = 'Amount received is required.';
    else if (Number(form.received) < total)
      errors.received = 'Amount received is less than the total.';
  }
  return errors;
}

/** Jumlah uang yang lazim diterima: pas, dibulatkan ke 50 ribu, dan ke 100 ribu. */
function cashSuggestions(total: number) {
  const up = (step: number) => Math.ceil(total / step) * step;
  return [...new Set([total, up(50000), up(100000)])];
}

function ReceiptView({
  receipt,
  orderId,
  onNext,
}: {
  receipt: Receipt;
  orderId: string;
  onNext?: () => void;
}) {
  const change = receipt.received !== null ? receipt.received - receipt.total : null;
  const rows: [string, string][] = [
    ['Order', orderId],
    ['Payment type', receipt.payment],
    ...(receipt.bank ? [['Bank', receipt.bank] as [string, string]] : []),
    ...(receipt.received !== null
      ? [['Amount received', formatRupiah(receipt.received)] as [string, string]]
      : []),
    ...(change !== null ? [['Change', formatRupiah(change)] as [string, string]] : []),
  ];
  return (
    <div
      role='status'
      className='flex flex-col items-center gap-4 rounded-lg border border-primary/30 bg-primary/5 p-6 text-center'
    >
      <CircleCheckIcon className='size-8 text-primary' />
      <div>
        <p className='font-medium'>Payment recorded</p>
        <p className='text-2xl font-semibold tabular-nums'>{formatRupiah(receipt.total)}</p>
      </div>
      <dl className='grid w-full max-w-xs grid-cols-[auto_1fr] gap-x-6 gap-y-1 text-left text-sm'>
        {rows.map(([k, v]) => (
          <React.Fragment key={k}>
            <dt className='text-muted-foreground'>{k}</dt>
            <dd className='text-right font-medium tabular-nums'>{v}</dd>
          </React.Fragment>
        ))}
      </dl>
      {onNext && <Button onClick={onNext}>Next unpaid order</Button>}
    </div>
  );
}

/** Form pembayaran satu order. Di-key per orderId sehingga ganti order = form bersih. */
function PaymentForm({ total, onPay }: { total: number; onPay: (r: Receipt) => Promise<void> }) {
  const [form, setForm] = React.useState<Form>({ type: '', card: '', bank: '', received: '' });
  const [touched, setTouched] = React.useState<Partial<Record<FieldKey, boolean>>>({});
  const [submitted, setSubmitted] = React.useState(false);
  const [saving, setSaving] = React.useState(false);

  const set = <K extends FieldKey>(key: K, value: Form[K]) =>
    setForm((f) => ({ ...f, [key]: value }));
  const touch = (key: FieldKey) => setTouched((t) => ({ ...t, [key]: true }));

  const errors = validate(form, total);
  // Pesan error baru muncul setelah field disentuh atau Save ditekan
  const shown = (key: FieldKey) => (submitted || touched[key] ? errors[key] : undefined);

  const received = Number(form.received);
  const change = received - total;

  const submit = async () => {
    setSubmitted(true);
    if (Object.keys(errors).length > 0 || !form.type) return;
    setSaving(true);
    try {
      await onPay({
        total,
        payment: form.type,
        bank: isCard(form.type) ? form.bank || null : null,
        received: isCard(form.type) ? null : received,
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <FieldGroup>
      <Field data-invalid={Boolean(shown('type'))}>
        <FieldLabel>Payment Type</FieldLabel>
        <Select
          items={paymentItems}
          value={form.type || null}
          onValueChange={(v) => {
            if (!v) return;
            // ganti tipe = bersihkan field milik tipe sebelumnya
            setForm({ type: v as PaymentType, card: '', bank: '', received: '' });
            setTouched({});
            setSubmitted(false);
          }}
        >
          <SelectTrigger
            className='w-full'
            aria-label='Payment type'
            aria-invalid={Boolean(shown('type'))}
            onBlur={() => touch('type')}
          >
            <SelectValue placeholder='Select payment type' />
          </SelectTrigger>
          <SelectContent>
            {PAYMENT_TYPES.map((t) => (
              <SelectItem key={t} value={t}>
                {t}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <FieldError>{shown('type')}</FieldError>
      </Field>

      {isCard(form.type) && (
        <>
          <Field data-invalid={Boolean(shown('card'))}>
            <FieldLabel htmlFor='card'>Card Number</FieldLabel>
            <Input
              id='card'
              inputMode='numeric'
              autoComplete='off'
              placeholder='0000 0000 0000 0000'
              value={formatCard(form.card)}
              aria-invalid={Boolean(shown('card'))}
              onBlur={() => touch('card')}
              onChange={(e) => set('card', e.target.value.replace(/\D/g, '').slice(0, CARD_DIGITS))}
            />
            {shown('card') ? (
              <FieldError>{shown('card')}</FieldError>
            ) : (
              <FieldDescription>The card number is only checked, never stored.</FieldDescription>
            )}
          </Field>

          <Field data-invalid={Boolean(shown('bank'))}>
            <FieldLabel>Bank Name</FieldLabel>
            <Select
              items={bankItems}
              value={form.bank || null}
              onValueChange={(v) => {
                if (!v) return;
                set('bank', v as Bank);
                touch('bank');
              }}
            >
              <SelectTrigger
                className='w-full'
                aria-label='Bank name'
                aria-invalid={Boolean(shown('bank'))}
                onBlur={() => touch('bank')}
              >
                <SelectValue placeholder='Select bank' />
              </SelectTrigger>
              <SelectContent>
                {BANKS.map((b) => (
                  <SelectItem key={b} value={b}>
                    {b}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <FieldError>{shown('bank')}</FieldError>
          </Field>
        </>
      )}

      {form.type === 'Cash' && (
        <Field data-invalid={Boolean(shown('received'))}>
          <FieldLabel htmlFor='received'>Amount Received</FieldLabel>
          <Input
            id='received'
            inputMode='numeric'
            maxLength={10}
            value={form.received}
            aria-invalid={Boolean(shown('received'))}
            onBlur={() => touch('received')}
            onChange={(e) => set('received', e.target.value.replace(/\D/g, ''))}
          />
          <div className='flex flex-wrap gap-2'>
            {cashSuggestions(total).map((amount) => (
              <Button
                key={amount}
                type='button'
                size='sm'
                variant='outline'
                onClick={() => {
                  set('received', String(amount));
                  touch('received');
                }}
              >
                {amount === total ? 'Exact' : formatRupiah(amount)}
              </Button>
            ))}
          </div>
          {shown('received') ? (
            <FieldError>{shown('received')}</FieldError>
          ) : (
            <FieldDescription>
              {form.received && change >= 0
                ? `Change: ${formatRupiah(change)}`
                : 'Enter the cash handed over by the guest.'}
            </FieldDescription>
          )}
        </Field>
      )}

      <Button disabled={saving} onClick={submit}>
        {saving && <Spinner />}
        {saving ? 'Saving...' : 'Save Payment'}
      </Button>
    </FieldGroup>
  );
}

export function Payments() {
  // Simulasi membaca data. Saat database siap: ganti dengan data dari server (props) seperti proyek pertama.
  const loading = useFakeLoad('payments');

  // Antrian = order yang belum dibayar saat halaman dibuka. Order yang baru dibayar tetap tampil
  // (berlabel Paid) supaya struknya masih bisa dilihat. Order boleh dibayar walau dapur belum selesai.
  const [queue] = React.useState<HeaderOrder[]>(() =>
    headerOrders.filter((h) => h.payment === null),
  );
  const [receipts, setReceipts] = React.useState<Record<string, Receipt>>({});
  const [selectedId, setSelectedId] = React.useState<string>(() => queue[0]?.orderId ?? '');
  const [query, setQuery] = React.useState('');

  const kitchen = (orderId: string) => {
    const list = detailsOf(orderId);
    return { done: list.filter((d) => d.status === 'Deliver').length, total: list.length };
  };

  const unpaid = queue.filter((h) => !receipts[h.orderId]);
  const outstanding = unpaid.reduce((sum, h) => sum + orderTotal(h.orderId), 0);
  const ready = unpaid.filter((h) => kitchen(h.orderId).done === kitchen(h.orderId).total).length;

  // Pencarian: Order ID, ID/nama member, atau total (mis. 385000 atau 385.000)
  const needle = query.trim().toLowerCase();
  const visibleQueue = needle
    ? queue.filter((h) => {
        const member = getMember(h.memberId);
        const total = orderTotal(h.orderId);
        return `${h.orderId} ${member.memberId} ${member.name} ${total} ${formatRupiah(total)}`
          .toLowerCase()
          .includes(needle);
      })
    : queue;

  const selected = queue.find((h) => h.orderId === selectedId);
  const selectedDetails = selected ? detailsOf(selected.orderId) : [];
  const selectedTotal = selected ? orderTotal(selected.orderId) : 0;
  const selectedKitchen = selected ? kitchen(selected.orderId) : { done: 0, total: 0 };
  const receipt = selected ? receipts[selected.orderId] : undefined;
  const nextUnpaid = unpaid.find((h) => h.orderId !== selectedId);

  const pay = async (orderId: string, r: Receipt) => {
    await wait();
    setPayment(orderId, r.payment, r.bank); // pengganti UPDATE headerorder
    setReceipts((all) => ({ ...all, [orderId]: r }));
  };

  return (
    <div className='flex flex-col gap-3 md:gap-3'>
      <StatCards
        loading={loading}
        items={[
          {
            label: 'Unpaid Orders',
            value: unpaid.length,
            icon: ReceiptTextIcon,
            badge: `${queue.length - unpaid.length} paid`,
            title: 'Waiting for payment',
            note: 'Orders that are not paid yet',
          },
          {
            label: 'Outstanding',
            value: formatRupiah(outstanding),
            icon: BanknoteIcon,
            badge: `${unpaid.length} orders`,
            title: 'Still to be collected',
            note: 'Sum of all unpaid orders',
          },
          {
            label: 'Ready to Pay',
            value: ready,
            icon: CircleCheckIcon,
            badge: `${unpaid.length - ready} cooking`,
            title: 'Kitchen already finished',
            note: 'All dishes delivered to the table',
          },
        ]}
      />

      {!loading && queue.length === 0 ? (
        <Card>
          <CardContent className='flex flex-col items-center gap-2 py-16 text-center'>
            <CircleCheckIcon className='size-8 text-primary' />
            <p className='font-medium'>Everything is paid</p>
            <p className='text-sm text-muted-foreground'>There are no unpaid orders right now.</p>
          </CardContent>
        </Card>
      ) : (
        <div className='grid items-start gap-4 lg:grid-cols-[20rem_minmax(0,1fr)]'>
          {/* Daftar order belum dibayar */}
          <Card>
            <CardHeader>
              <CardTitle>Unpaid Orders</CardTitle>
              <CardDescription>Choose an order to take payment.</CardDescription>
            </CardHeader>
            <CardContent className='flex flex-col gap-3'>
              <div className='relative'>
                <SearchIcon className='pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground' />
                <Input
                  className='px-8'
                  placeholder='Search order or member...'
                  aria-label='Search unpaid orders'
                  value={query}
                  disabled={loading}
                  onChange={(e) => setQuery(e.target.value)}
                  onKeyDown={(e) => {
                    // Enter memilih hasil pertama, Escape menghapus pencarian
                    if (e.key === 'Enter' && visibleQueue[0])
                      setSelectedId(visibleQueue[0].orderId);
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
              {needle && !loading && (
                <p className='text-xs text-muted-foreground' aria-live='polite'>
                  {visibleQueue.length} of {queue.length} orders
                </p>
              )}
              <ul className='flex max-h-[28rem] flex-col gap-2 overflow-y-auto lg:max-h-[32rem]'>
                {loading &&
                  Array.from({ length: 4 }).map((_, i) => (
                    <li key={i} aria-busy='true'>
                      <Skeleton className='h-[4.5rem] w-full' />
                    </li>
                  ))}
                {!loading && visibleQueue.length === 0 && (
                  <li className='py-8 text-center text-sm text-muted-foreground'>
                    No orders match &ldquo;{query.trim()}&rdquo;.
                  </li>
                )}
                {!loading &&
                  visibleQueue.map((h) => {
                    const k = kitchen(h.orderId);
                    const paid = Boolean(receipts[h.orderId]);
                    return (
                      <li key={h.orderId}>
                        <button
                          type='button'
                          aria-current={h.orderId === selectedId}
                          onClick={() => setSelectedId(h.orderId)}
                          className='flex w-full flex-col gap-2 rounded-lg border p-3 text-left transition-colors hover:bg-muted/50 aria-[current=true]:border-primary aria-[current=true]:bg-primary/5'
                        >
                          <div className='flex items-center justify-between gap-2'>
                            <span className='font-mono text-sm font-medium'>{h.orderId}</span>
                            {paid ? (
                              <Badge>Paid</Badge>
                            ) : k.done === k.total ? (
                              <Badge variant='outline'>Kitchen done</Badge>
                            ) : (
                              <Badge variant='secondary'>
                                {k.done}/{k.total} delivered
                              </Badge>
                            )}
                          </div>
                          <div className='flex items-center justify-between gap-2 text-xs text-muted-foreground'>
                            <span className='truncate'>{getMember(h.memberId).name}</span>
                            <span className='shrink-0'>{formatDate(h.date)}</span>
                          </div>
                          <span className='text-sm font-semibold tabular-nums'>
                            {formatRupiah(orderTotal(h.orderId))}
                          </span>
                        </button>
                      </li>
                    );
                  })}
              </ul>
            </CardContent>
          </Card>

          {/* Rincian + pembayaran */}
          <Card>
            <CardHeader>
              <CardTitle className='flex flex-wrap items-center gap-2'>
                <CreditCardIcon className='size-4' />
                {selected ? (
                  <>
                    Order <span className='font-mono'>{selected.orderId}</span>
                  </>
                ) : (
                  'Payment'
                )}
              </CardTitle>
              <CardDescription>
                {selected
                  ? `${getMember(selected.memberId).name} · ${formatDate(selected.date)}`
                  : 'Choose an order from the list.'}
              </CardDescription>
            </CardHeader>
            <CardContent className='flex flex-col gap-4'>
              {loading && <Skeleton className='h-64 w-full' />}

              {!loading && !selected && (
                <p className='py-8 text-center text-sm text-muted-foreground'>
                  Select an order on the left to see its items.
                </p>
              )}

              {!loading && selected && (
                <>
                  <div className='overflow-hidden rounded-lg border'>
                    <Table>
                      <TableHeader className='bg-muted'>
                        <TableRow>
                          <TableHead>Menu</TableHead>
                          <TableHead className='text-right'>Qty</TableHead>
                          <TableHead className='text-right'>Price</TableHead>
                          <TableHead className='text-right'>Total</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {selectedDetails.map((d) => {
                          const menu = getMenu(d.menuId);
                          return (
                            <TableRow key={d.detailId}>
                              <TableCell>
                                <div className='flex items-center gap-3'>
                                  <MenuPhoto menu={menu} />
                                  <span className='font-medium'>{menu.name}</span>
                                </div>
                              </TableCell>
                              <TableCell className='text-right tabular-nums'>{d.qty}</TableCell>
                              <TableCell className='text-right tabular-nums'>
                                {formatRupiah(d.price)}
                              </TableCell>
                              <TableCell className='text-right font-medium tabular-nums'>
                                {formatRupiah(d.qty * d.price)}
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                      <TableFooter>
                        <TableRow>
                          <TableCell colSpan={3} className='text-right font-medium'>
                            Total
                          </TableCell>
                          <TableCell className='text-right text-base font-semibold tabular-nums'>
                            {formatRupiah(selectedTotal)}
                          </TableCell>
                        </TableRow>
                      </TableFooter>
                    </Table>
                  </div>

                  {receipt ? (
                    <ReceiptView
                      receipt={receipt}
                      orderId={selected.orderId}
                      onNext={nextUnpaid ? () => setSelectedId(nextUnpaid.orderId) : undefined}
                    />
                  ) : (
                    <>
                      {selectedKitchen.done < selectedKitchen.total && (
                        <p
                          role='status'
                          className='flex items-start gap-2 rounded-lg border bg-muted/50 p-3 text-sm'
                        >
                          <ClockIcon className='mt-0.5 size-4 shrink-0 text-muted-foreground' />
                          <span>
                            The kitchen is still preparing{' '}
                            {selectedKitchen.total - selectedKitchen.done} of{' '}
                            {selectedKitchen.total} dishes. You can already take payment.
                          </span>
                        </p>
                      )}
                      <PaymentForm
                        key={selected.orderId}
                        total={selectedTotal}
                        onPay={(r) => pay(selected.orderId, r)}
                      />
                    </>
                  )}
                </>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
