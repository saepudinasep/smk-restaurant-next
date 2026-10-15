'use client';

import * as React from 'react';
import { toast } from 'sonner';
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
import { useLiveRefresh } from '@/hooks/use-live-refresh';
import { StatCards } from '@/components/stat-cards';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ConfirmActionDialog } from '@/components/ui/alert-dialog';
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from '@/components/ui/field';
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
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { payOrder } from '@/actions/payments';
import type { PaymentOrder } from '@/lib/data/payments';
import { formatDate, formatRupiah } from '@/lib/format';
import { BANKS, PAYMENT_TYPES, type Bank, type PaymentType } from '@/lib/validations';

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

/** Yang dikirim ke server. Nomor kartu tidak ikut: hanya diperiksa di browser. */
type PayInput =
  | { payment: 'Cash'; received: number }
  | { payment: 'Credit Card' | 'Debit Card'; bank: Bank };

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
function PaymentForm({
  orderId,
  total,
  onPay,
}: {
  orderId: string;
  total: number;
  onPay: (input: PayInput) => Promise<string | undefined>;
}) {
  const [form, setForm] = React.useState<Form>({ type: '', card: '', bank: '', received: '' });
  const [touched, setTouched] = React.useState<Partial<Record<FieldKey, boolean>>>({});
  const [submitted, setSubmitted] = React.useState(false);
  const [saving, setSaving] = React.useState(false);
  const [serverError, setServerError] = React.useState('');
  const [confirmOpen, setConfirmOpen] = React.useState(false);
  const [pendingPayment, setPendingPayment] = React.useState<PayInput | null>(null);

  const set = <K extends FieldKey>(key: K, value: Form[K]) => {
    setForm((f) => ({ ...f, [key]: value }));
    setServerError('');
  };
  const touch = (key: FieldKey) => setTouched((t) => ({ ...t, [key]: true }));

  const errors = validate(form, total);
  // Pesan error baru muncul setelah field disentuh atau Save ditekan
  const shown = (key: FieldKey) => (submitted || touched[key] ? errors[key] : undefined);

  const received = Number(form.received);
  const change = received - total;

  const submit = () => {
    setSubmitted(true);
    setServerError('');
    if (Object.keys(errors).length > 0 || !form.type) return;
    const input: PayInput = isCard(form.type)
      ? { payment: form.type as 'Credit Card' | 'Debit Card', bank: form.bank as Bank }
      : { payment: 'Cash', received };
    setPendingPayment(input);
    setConfirmOpen(true);
  };

  const confirmPayment = async () => {
    if (!pendingPayment) return;
    setSaving(true);
    try {
      const error = await onPay(pendingPayment);
      if (error) {
        setServerError(error);
        toast.error(error);
      }
    } catch {
      setServerError('Network error. Please try again.');
      toast.error('Network error. Please try again.');
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
            setServerError('');
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

      {serverError && (
        <p role='alert' className='text-sm text-destructive'>
          {serverError}
        </p>
      )}

      <Button disabled={saving} onClick={submit}>
        {saving && <Spinner />}
        {saving ? 'Saving...' : 'Save Payment'}
      </Button>
      <ConfirmActionDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title='Confirm payment?'
        description={`Record ${pendingPayment?.payment ?? form.type} payment of ${formatRupiah(total)} for order ${orderId}?`}
        confirmLabel='Confirm Payment'
        onConfirm={() => void confirmPayment()}
      />
    </FieldGroup>
  );
}

type PaidSnapshot = { order: PaymentOrder; receipt: Receipt };

export function Payments({ initialOrders }: { initialOrders: PaymentOrder[] }) {
  // Order yang baru dibayar hilang dari data server, tetapi tetap ditampilkan (berlabel Paid)
  // supaya struknya masih bisa dilihat; snapshot-nya disimpan di browser sampai halaman ditinggalkan.
  // Order boleh dibayar walau dapur belum selesai.
  const [paid, setPaid] = React.useState<Record<string, PaidSnapshot>>({});
  const [selectedId, setSelectedId] = React.useState<string>(() => initialOrders[0]?.orderId ?? '');
  const [query, setQuery] = React.useState('');

  // Data disegarkan otomatis saat ada kejadian realtime (dan berkala sebagai cadangan)
  useLiveRefresh();

  const queue = [
    ...initialOrders.filter((o) => !paid[o.orderId]),
    ...Object.values(paid).map((p) => p.order),
  ].sort((a, b) => a.orderId.localeCompare(b.orderId));

  const kitchen = (o: PaymentOrder) => ({
    done: o.items.filter((d) => d.status === 'Deliver').length,
    total: o.items.length,
  });

  const unpaid = queue.filter((o) => !paid[o.orderId]);
  const outstanding = unpaid.reduce((sum, o) => sum + o.total, 0);
  const ready = unpaid.filter((o) => kitchen(o).done === kitchen(o).total).length;

  // Pencarian: Order ID, ID/nama member, atau total (mis. 385000 atau 385.000)
  const needle = query.trim().toLowerCase();
  const visibleQueue = needle
    ? queue.filter((o) =>
        `${o.orderId} ${o.memberId} ${o.memberName} ${o.total} ${formatRupiah(o.total)}`
          .toLowerCase()
          .includes(needle),
      )
    : queue;

  const selected = queue.find((o) => o.orderId === selectedId);
  const selectedKitchen = selected ? kitchen(selected) : { done: 0, total: 0 };
  const receipt = selected ? paid[selected.orderId]?.receipt : undefined;
  const nextUnpaid = unpaid.find((o) => o.orderId !== selectedId);

  /** Mengembalikan pesan error (untuk ditampilkan di form), atau undefined bila berhasil. */
  const pay = async (order: PaymentOrder, input: PayInput): Promise<string | undefined> => {
    const result = await payOrder({ orderId: order.orderId, ...input });
    if (!result.ok) return result.error;
    const isCash = input.payment === 'Cash';
    setPaid((all) => ({
      ...all,
      [order.orderId]: {
        order,
        receipt: {
          total: result.total,
          payment: input.payment,
          bank: 'bank' in input ? input.bank : null,
          received: isCash ? input.received : null,
        },
      },
    }));
    toast.success(`Payment for order ${order.orderId} recorded successfully.`);
    return undefined;
  };

  return (
    <div className='flex flex-col gap-3 md:gap-3'>
      <StatCards
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

      {queue.length === 0 ? (
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
              <CardDescription>Choose an order to take payment. Updates live.</CardDescription>
            </CardHeader>
            <CardContent className='flex flex-col gap-3'>
              <div className='relative'>
                <SearchIcon className='pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground' />
                <Input
                  className='px-8'
                  placeholder='Search order or member...'
                  aria-label='Search unpaid orders'
                  value={query}
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
              {needle && (
                <p className='text-xs text-muted-foreground' aria-live='polite'>
                  {visibleQueue.length} of {queue.length} orders
                </p>
              )}
              <ul className='flex max-h-[28rem] flex-col gap-2 overflow-y-auto lg:max-h-[32rem]'>
                {visibleQueue.length === 0 && (
                  <li className='py-8 text-center text-sm text-muted-foreground'>
                    No orders match &ldquo;{query.trim()}&rdquo;.
                  </li>
                )}
                {visibleQueue.map((o) => {
                  const k = kitchen(o);
                  const isPaid = Boolean(paid[o.orderId]);
                  return (
                    <li key={o.orderId}>
                      <button
                        type='button'
                        aria-current={o.orderId === selectedId}
                        onClick={() => setSelectedId(o.orderId)}
                        className='flex w-full flex-col gap-2 rounded-lg border p-3 text-left transition-colors hover:bg-muted/50 aria-[current=true]:border-primary aria-[current=true]:bg-primary/5'
                      >
                        <div className='flex items-center justify-between gap-2'>
                          <span className='font-mono text-sm font-medium'>{o.orderId}</span>
                          {isPaid ? (
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
                          <span className='truncate'>{o.memberName}</span>
                          <span className='shrink-0'>{formatDate(o.date)}</span>
                        </div>
                        <span className='text-sm font-semibold tabular-nums'>
                          {formatRupiah(o.total)}
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
                  ? `${selected.memberName} · ${formatDate(selected.date)}`
                  : 'Choose an order from the list.'}
              </CardDescription>
            </CardHeader>
            <CardContent className='flex flex-col gap-4'>
              {!selected && (
                <p className='py-8 text-center text-sm text-muted-foreground'>
                  Select an order on the left to see its items.
                </p>
              )}

              {selected && (
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
                        {selected.items.map((d) => (
                          <TableRow key={d.detailId}>
                            <TableCell>
                              <div className='flex items-center gap-3'>
                                <MenuPhoto menu={{ name: d.menuName, photo: d.photo }} />
                                <span className='font-medium'>{d.menuName}</span>
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
                        ))}
                      </TableBody>
                      <TableFooter>
                        <TableRow>
                          <TableCell colSpan={3} className='text-right font-medium'>
                            Total
                          </TableCell>
                          <TableCell className='text-right text-base font-semibold tabular-nums'>
                            {formatRupiah(selected.total)}
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
                        orderId={selected.orderId}
                        total={selected.total}
                        onPay={(input) => pay(selected, input)}
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
