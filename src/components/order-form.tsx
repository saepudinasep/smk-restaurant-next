'use client';

import * as React from 'react';
import { toast } from 'sonner';
import {
  CircleCheckIcon,
  MinusIcon,
  PlusIcon,
  SearchIcon,
  ShoppingCartIcon,
  Trash2Icon,
  XIcon,
} from 'lucide-react';

import { CategoryFilter } from '@/components/category-filter';
import { MenuPhoto } from '@/components/menu-photo';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { FieldError, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { ConfirmActionDialog } from '@/components/ui/alert-dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Spinner } from '@/components/ui/spinner';
import { createOrder } from '@/actions/orders';
import { formatRupiah } from '@/lib/format';
import type { CategoryFilter as CategoryFilterValue } from '@/lib/menu-categories';
import type { Menu } from '@/lib/types';
import type { OrderMember } from '@/lib/data/orders';

const MAX_QTY = 99;

type CartLine = { menuId: number; qty: number };
type Placed = { orderId: string; total: number; items: number };

/** Tombol - qty + dengan batas 1..MAX_QTY. Tombol hapus ada terpisah di keranjang. */
function QtyStepper({
  qty,
  name,
  onChange,
}: {
  qty: number;
  name: string;
  onChange: (qty: number) => void;
}) {
  return (
    <div className='flex items-center gap-1'>
      <Button
        variant='outline'
        size='icon-sm'
        disabled={qty <= 1}
        aria-label={`Decrease quantity of ${name}`}
        onClick={() => onChange(qty - 1)}
      >
        <MinusIcon />
      </Button>
      <span className='w-8 text-center text-sm font-medium tabular-nums' aria-live='polite'>
        {qty}
      </span>
      <Button
        variant='outline'
        size='icon-sm'
        disabled={qty >= MAX_QTY}
        aria-label={`Increase quantity of ${name}`}
        onClick={() => onChange(qty + 1)}
      >
        <PlusIcon />
      </Button>
    </div>
  );
}

function MenuCard({ menu, qty, onAdd }: { menu: Menu; qty: number; onAdd: () => void }) {
  return (
    <div
      data-selected={qty > 0}
      className='flex flex-col overflow-hidden rounded-lg border bg-card transition-colors data-[selected=true]:border-primary'
    >
      <MenuPhoto menu={menu} className='aspect-4/3 w-full rounded-none border-0 border-b' />
      <div className='flex flex-1 flex-col gap-3 p-3'>
        <div className='flex flex-col gap-0.5'>
          <span className='line-clamp-2 text-sm leading-snug font-medium'>{menu.name}</span>
          <span className='text-sm text-muted-foreground tabular-nums'>
            {formatRupiah(menu.price)}
          </span>
        </div>
        <Button
          className='mt-auto w-full'
          variant={qty > 0 ? 'secondary' : 'default'}
          disabled={qty >= MAX_QTY}
          aria-label={`Add ${menu.name} to the order`}
          onClick={onAdd}
        >
          <PlusIcon />
          {qty > 0 ? `Add more (${qty})` : 'Add'}
        </Button>
      </div>
    </div>
  );
}

export function OrderForm({
  menus,
  members,
  cashierName,
}: {
  menus: Menu[];
  members: OrderMember[];
  cashierName: string;
}) {
  const memberItems = React.useMemo(
    () => members.map((m) => ({ value: m.memberId, label: `${m.memberId} - ${m.name}` })),
    [members],
  );
  const menuById = React.useMemo(() => new Map(menus.map((m) => [m.menuId, m])), [menus]);

  const [query, setQuery] = React.useState('');
  const [category, setCategory] = React.useState<CategoryFilterValue>('all');
  const [cart, setCart] = React.useState<CartLine[]>([]);
  const [memberId, setMemberId] = React.useState('');
  const [submitted, setSubmitted] = React.useState(false);
  const [placing, setPlacing] = React.useState(false);
  const [confirmOpen, setConfirmOpen] = React.useState(false);
  const [placed, setPlaced] = React.useState<Placed | null>(null);
  const [error, setError] = React.useState('');

  const qtyOf = (menuId: number) => cart.find((l) => l.menuId === menuId)?.qty ?? 0;

  /** Set jumlah; qty <= 0 menghapus menu dari keranjang, menu baru otomatis ditambahkan. */
  const setQty = (menuId: number, qty: number) => {
    setPlaced(null);
    setError('');
    setCart((lines) => {
      if (qty <= 0) return lines.filter((l) => l.menuId !== menuId);
      const next = Math.min(qty, MAX_QTY);
      return lines.some((l) => l.menuId === menuId)
        ? lines.map((l) => (l.menuId === menuId ? { ...l, qty: next } : l))
        : [...lines, { menuId, qty: next }];
    });
  };

  const lines = cart.map((l) => ({ ...l, menu: menuById.get(l.menuId)! }));
  const total = lines.reduce((sum, l) => sum + l.qty * l.menu.price, 0);
  const itemCount = lines.reduce((sum, l) => sum + l.qty, 0);

  const needle = query.trim().toLowerCase();
  const visibleMenus = menus.filter(
    (m) => (category === 'all' || m.category === category) && m.name.toLowerCase().includes(needle),
  );

  const memberError = submitted && !memberId ? 'Select a member for this order.' : undefined;

  const placeOrder = () => {
    setSubmitted(true);
    setError('');
    if (!memberId || lines.length === 0) return;
    setConfirmOpen(true);
  };

  const confirmPlaceOrder = async () => {
    setPlacing(true);
    try {
      // Hanya member dan (menu, qty) yang dikirim; harga, tanggal, kasir, dan kode order ditentukan server
      const result = await createOrder({
        memberId,
        items: lines.map((l) => ({ menuId: l.menuId, qty: l.qty })),
      });
      if (!result.ok) {
        setError(result.error);
        toast.error(result.error);
        return;
      }
      setPlaced({ orderId: result.orderId, total: result.total, items: result.items });
      toast.success(`Order ${result.orderId} placed successfully.`);
      setCart([]);
      setMemberId('');
      setSubmitted(false);
    } catch {
      setError('Network error. Please try again.');
      toast.error('Network error. Please try again.');
    } finally {
      setPlacing(false);
    }
  };

  return (
    <>
    <div className='grid items-start gap-4 lg:grid-cols-[minmax(0,1fr)_22rem]'>
      {/* Daftar menu */}
      <Card>
        <CardHeader>
          <CardTitle>Menu</CardTitle>
          <CardDescription>Choose the dishes the guest wants to order.</CardDescription>
        </CardHeader>
        <CardContent className='flex flex-col gap-4'>
          <CategoryFilter items={menus} value={category} onChange={setCategory} />

          <div className='relative max-w-xs'>
            <SearchIcon className='pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground' />
            <Input
              className='pl-8'
              placeholder='Search menu...'
              aria-label='Search menu'
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>

          <div className='grid grid-cols-[repeat(auto-fill,minmax(10.5rem,1fr))] gap-3'>
            {visibleMenus.map((m) => (
              <MenuCard
                key={m.menuId}
                menu={m}
                qty={qtyOf(m.menuId)}
                onAdd={() => setQty(m.menuId, qtyOf(m.menuId) + 1)}
              />
            ))}
          </div>

          {visibleMenus.length === 0 && (
            <p className='py-8 text-center text-sm text-muted-foreground'>No menu found.</p>
          )}
        </CardContent>
      </Card>

      {/* Keranjang */}
      <Card className='lg:sticky lg:top-4'>
        <CardHeader>
          <CardTitle className='flex items-center gap-2'>
            <ShoppingCartIcon className='size-4' />
            Current Order
          </CardTitle>
          <CardDescription>Served by {cashierName}</CardDescription>
        </CardHeader>

        <CardContent className='flex flex-col gap-4'>
          {placed && (
            <div
              role='status'
              className='flex items-start gap-2 rounded-lg border border-primary/30 bg-primary/5 p-3 text-sm'
            >
              <CircleCheckIcon className='mt-0.5 size-4 shrink-0 text-primary' />
              <div className='flex-1'>
                <p className='font-medium'>Order placed</p>
                <p className='text-muted-foreground'>
                  <span className='font-mono'>{placed.orderId}</span> · {placed.items} items ·{' '}
                  {formatRupiah(placed.total)}
                </p>
                <p className='text-muted-foreground'>
                  Sent to the kitchen. Payment is taken at the cashier.
                </p>
              </div>
              <Button
                variant='ghost'
                size='icon-sm'
                aria-label='Dismiss'
                onClick={() => setPlaced(null)}
              >
                <XIcon />
              </Button>
            </div>
          )}

          <div className='flex flex-col gap-2'>
            <FieldLabel>Member</FieldLabel>
            <Select
              items={memberItems}
              value={memberId || null}
              onValueChange={(v) => v && setMemberId(v)}
            >
              <SelectTrigger
                className='w-full'
                aria-label='Member'
                aria-invalid={Boolean(memberError)}
              >
                <SelectValue placeholder='Select member' />
              </SelectTrigger>
              <SelectContent>
                {memberItems.map((i) => (
                  <SelectItem key={i.value} value={i.value}>
                    {i.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <FieldError>{memberError}</FieldError>
          </div>

          {lines.length === 0 ? (
            <div className='flex flex-col items-center gap-2 rounded-lg border border-dashed py-8 text-center text-sm text-muted-foreground'>
              <ShoppingCartIcon className='size-6' />
              <p>No items yet.</p>
              <p>Pick a menu on the left to start.</p>
            </div>
          ) : (
            <ul className='flex max-h-[40vh] flex-col divide-y overflow-y-auto rounded-lg border'>
              {lines.map((l) => (
                <li key={l.menuId} className='flex flex-col gap-2 p-3'>
                  <div className='flex items-start justify-between gap-2'>
                    <div className='min-w-0'>
                      <p className='truncate text-sm font-medium'>{l.menu.name}</p>
                      <p className='text-xs text-muted-foreground tabular-nums'>
                        {formatRupiah(l.menu.price)} each
                      </p>
                    </div>
                    <Button
                      variant='ghost'
                      size='icon-sm'
                      aria-label={`Remove ${l.menu.name}`}
                      onClick={() => setQty(l.menuId, 0)}
                    >
                      <Trash2Icon />
                    </Button>
                  </div>
                  <div className='flex items-center justify-between'>
                    <QtyStepper
                      qty={l.qty}
                      name={l.menu.name}
                      onChange={(q) => setQty(l.menuId, q)}
                    />
                    <span className='text-sm font-medium tabular-nums'>
                      {formatRupiah(l.qty * l.menu.price)}
                    </span>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardContent>

        <CardFooter className='flex-col items-stretch gap-3'>
          {error && (
            <p
              role='alert'
              className='rounded-lg border border-destructive/40 bg-destructive/5 px-3 py-2 text-sm text-destructive'
            >
              {error}
            </p>
          )}
          <div className='flex items-baseline justify-between'>
            <span className='text-sm text-muted-foreground'>
              Total ({itemCount} {itemCount === 1 ? 'item' : 'items'})
            </span>
            <span className='text-xl font-semibold tabular-nums'>{formatRupiah(total)}</span>
          </div>
          <Button disabled={lines.length === 0 || placing} onClick={placeOrder}>
            {placing && <Spinner />}
            {placing ? 'Placing order...' : 'Place Order'}
          </Button>
          {lines.length > 0 && (
            <Button variant='ghost' disabled={placing} onClick={() => setCart([])}>
              Clear order
            </Button>
          )}
        </CardFooter>
      </Card>
    </div>
    <ConfirmActionDialog
      open={confirmOpen}
      onOpenChange={setConfirmOpen}
      title='Place this order?'
      description={`Create an order for ${memberItems.find((member) => member.value === memberId)?.label ?? 'the selected member'} with ${itemCount} ${itemCount === 1 ? 'item' : 'items'}, totaling ${formatRupiah(total)}?`}
      confirmLabel='Place Order'
      onConfirm={() => void confirmPlaceOrder()}
    />
    </>
  );
}
