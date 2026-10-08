'use client';

import * as React from 'react';
import { PlusIcon, TagIcon, TrophyIcon, UploadIcon, UtensilsIcon } from 'lucide-react';

import { MenuPhoto } from '@/components/menu-photo';
import { SimpleDataTable, type Column } from '@/components/simple-data-table';
import { StatCards } from '@/components/stat-cards';
import { Button } from '@/components/ui/button';
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Spinner } from '@/components/ui/spinner';
import { detailOrders, formatRupiah, menus, nextMenuId, type Menu } from '@/lib/dummy-data';
import { useFakeLoad, wait } from '@/lib/fake-api';

// Nanti dipindah ke actions/result.ts saat Server Action dibuat (sama seperti proyek pertama).
type ActionResult = { ok: true } | { ok: false; error: string };

// Foto yang baru di-upload sementara ditampilkan lewat object URL (photoUrl).
type MenuRow = Menu & { photoUrl?: string };

// Di form harga berupa teks supaya bisa dikosongkan; diubah ke angka setelah lolos validasi.
type MenuForm = Omit<MenuRow, 'price'> & { price: string };

const MAX_PHOTO_BYTES = 2 * 1024 * 1024;
const PHOTO_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

// columns berisi fungsi, jadi harus didefinisikan di file client
const columns: Column<MenuRow>[] = [
  { header: 'Photo', cell: (m) => <MenuPhoto menu={m} /> },
  { header: 'Menu ID', cell: (m) => m.menuId },
  { header: 'Name', cell: (m) => m.name, className: 'font-medium' },
  { header: 'Price', cell: (m) => formatRupiah(m.price), className: 'tabular-nums' },
];

type FieldKey = 'name' | 'price' | 'photo';
type Errors = Partial<Record<FieldKey, string>>;

// Batas panjang mengikuti data dictionary: Name 50, Photo 100.
function validate(form: MenuForm, others: MenuRow[]): Errors {
  const errors: Errors = {};

  const name = form.name.trim();
  if (!name) errors.name = 'Name is required.';
  else if (others.some((m) => m.name.toLowerCase() === name.toLowerCase()))
    errors.name = 'A menu with this name already exists.';

  if (!form.price) errors.price = 'Price is required.';
  else if (Number(form.price) <= 0) errors.price = 'Price must be greater than 0.';

  if (!form.photo) errors.photo = 'Photo is required.';

  return errors;
}

/** Satu form untuk Insert dan Update. Save / Cancel hanya ada selama mode insert/edit aktif. */
function MenuFormSheet({
  mode,
  menu,
  allMenus,
  onSave,
  onClose,
}: {
  mode: 'insert' | 'update';
  menu: MenuForm;
  allMenus: MenuRow[];
  onSave: (m: MenuRow) => Promise<ActionResult>;
  onClose: () => void;
}) {
  const [form, setForm] = React.useState<MenuForm>(menu);
  const [touched, setTouched] = React.useState<Partial<Record<FieldKey, boolean>>>({});
  const [submitted, setSubmitted] = React.useState(false);
  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState('');
  const [fileError, setFileError] = React.useState('');
  const fileInput = React.useRef<HTMLInputElement>(null);

  // Object URL yang dibuat di form ini; dilepas bila tidak jadi disimpan (diganti / Cancel).
  const createdUrl = React.useRef<string | null>(null);
  const saved = React.useRef(false);
  React.useEffect(
    () => () => {
      if (!saved.current && createdUrl.current) URL.revokeObjectURL(createdUrl.current);
    },
    [],
  );

  const set = <K extends keyof MenuForm>(key: K, value: MenuForm[K]) => {
    setForm((f) => ({ ...f, [key]: value }));
    setError('');
  };
  const touch = (key: FieldKey) => setTouched((t) => ({ ...t, [key]: true }));

  const onPickFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = ''; // supaya memilih file yang sama dua kali tetap memicu onChange
    if (!file) return;
    touch('photo');

    if (!PHOTO_TYPES.includes(file.type))
      return setFileError('Photo must be a JPG, PNG or WEBP image.');
    if (file.size > MAX_PHOTO_BYTES) return setFileError('Photo must be 2 MB or smaller.');
    if (file.name.length > 100) return setFileError('File name must be at most 100 characters.');

    if (createdUrl.current) URL.revokeObjectURL(createdUrl.current);
    const url = URL.createObjectURL(file);
    createdUrl.current = url;
    setFileError('');
    setForm((f) => ({ ...f, photo: file.name, photoUrl: url }));
    setError('');
  };

  const others = allMenus.filter((m) => m.menuId !== menu.menuId);
  const errors = validate(form, others);
  // Pesan error baru muncul setelah field disentuh atau Save ditekan
  const shown = (key: FieldKey) => (submitted || touched[key] ? errors[key] : undefined);
  const photoError = fileError || shown('photo');

  const submit = async () => {
    setSubmitted(true);
    if (Object.keys(errors).length > 0 || fileError) return;

    setSaving(true);
    setError('');
    try {
      const result = await onSave({
        menuId: form.menuId,
        name: form.name.trim(),
        price: Number(form.price),
        photo: form.photo,
        photoUrl: form.photoUrl,
      });
      if (result.ok) {
        saved.current = true; // object URL dipakai tabel, jangan dilepas
        onClose();
      } else setError(result.error);
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const priceNumber = Number(form.price);

  return (
    <Sheet open onOpenChange={(open) => !open && !saving && onClose()}>
      <SheetContent>
        <SheetHeader>
          <SheetTitle>{mode === 'insert' ? 'Insert Menu' : 'Update Menu'}</SheetTitle>
          <SheetDescription>
            {mode === 'insert'
              ? 'Fill in the data for the new menu.'
              : `Edit data for menu #${menu.menuId}.`}
          </SheetDescription>
        </SheetHeader>

        <div className='flex min-h-0 flex-1 flex-col overflow-y-auto px-4'>
          <FieldGroup>
            <Field data-invalid={Boolean(photoError)}>
              <FieldLabel>Photo</FieldLabel>
              <MenuPhoto menu={{ ...form }} className='aspect-video h-auto w-full' />
              <div className='flex items-center gap-2'>
                <Input
                  readOnly
                  tabIndex={-1}
                  value={form.photo}
                  placeholder='No file chosen'
                  aria-label='Photo file name'
                  aria-invalid={Boolean(photoError)}
                />
                <Button type='button' variant='outline' onClick={() => fileInput.current?.click()}>
                  <UploadIcon />
                  Browse
                </Button>
                <input
                  ref={fileInput}
                  type='file'
                  accept={PHOTO_TYPES.join(',')}
                  className='hidden'
                  onChange={onPickFile}
                />
              </div>
              {photoError ? (
                <FieldError>{photoError}</FieldError>
              ) : (
                <FieldDescription>JPG, PNG or WEBP, up to 2 MB.</FieldDescription>
              )}
            </Field>

            <Field>
              <FieldLabel htmlFor='menuId'>Menu ID</FieldLabel>
              <Input id='menuId' value={form.menuId} disabled />
              <FieldDescription>Generated automatically.</FieldDescription>
            </Field>

            <Field data-invalid={Boolean(shown('name'))}>
              <FieldLabel htmlFor='name'>Name</FieldLabel>
              <Input
                id='name'
                maxLength={50}
                value={form.name}
                aria-invalid={Boolean(shown('name'))}
                onBlur={() => touch('name')}
                onChange={(e) => set('name', e.target.value)}
              />
              <FieldError>{shown('name')}</FieldError>
            </Field>

            <Field data-invalid={Boolean(shown('price'))}>
              <FieldLabel htmlFor='price'>Price</FieldLabel>
              <Input
                id='price'
                inputMode='numeric'
                maxLength={9}
                value={form.price}
                aria-invalid={Boolean(shown('price'))}
                onBlur={() => touch('price')}
                onChange={(e) => set('price', e.target.value.replace(/\D/g, ''))}
              />
              {shown('price') ? (
                <FieldError>{shown('price')}</FieldError>
              ) : (
                <FieldDescription>
                  {priceNumber > 0 ? formatRupiah(priceNumber) : 'Digits only, in Rupiah.'}
                </FieldDescription>
              )}
            </Field>

            {error && (
              <p role='alert' className='text-sm text-destructive'>
                {error}
              </p>
            )}
          </FieldGroup>
        </div>

        <SheetFooter className='border-t'>
          <Button disabled={saving} onClick={submit}>
            {saving && <Spinner />}
            {saving ? 'Saving...' : 'Save'}
          </Button>
          <Button variant='outline' disabled={saving} onClick={onClose}>
            Cancel
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}

type SheetState = { mode: 'insert' | 'update'; menu: MenuForm };

const revokeIfBlob = (url?: string) => {
  if (url?.startsWith('blob:')) URL.revokeObjectURL(url);
};

export function MenuTable() {
  // Simulasi membaca data. Saat database siap: ganti dengan data dari server (props) seperti proyek pertama.
  const loading = useFakeLoad('menus');
  const [data, setData] = React.useState<MenuRow[]>(menus);
  const [sheet, setSheet] = React.useState<SheetState | null>(null);

  // Menu yang pernah dipesan tidak boleh dihapus (FK detailorder.menuid) dan jumlah terjual per menu.
  const soldByMenu = React.useMemo(() => {
    const sold = new Map<number, number>();
    for (const d of detailOrders) sold.set(d.menuId, (sold.get(d.menuId) ?? 0) + d.qty);
    return sold;
  }, []);

  const total = data.length;
  const average = total ? Math.round(data.reduce((s, m) => s + m.price, 0) / total) : 0;
  const soldOf = (m: MenuRow) => soldByMenu.get(m.menuId) ?? 0;
  const bestSeller = data.reduce<MenuRow | null>(
    (best, m) => (soldOf(m) > (best ? soldOf(best) : 0) ? m : best),
    null,
  );
  const cheapest = data.reduce<MenuRow | null>((c, m) => (!c || m.price < c.price ? m : c), null);

  const openInsert = () =>
    setSheet({
      mode: 'insert',
      menu: { menuId: nextMenuId(data), name: '', price: '', photo: '' },
    });
  const openUpdate = (menu: MenuRow) =>
    setSheet({ mode: 'update', menu: { ...menu, price: String(menu.price) } });

  const createMenu = async (m: MenuRow): Promise<ActionResult> => {
    await wait();
    setData((d) => [...d, m]);
    return { ok: true };
  };
  const updateMenu = async (m: MenuRow): Promise<ActionResult> => {
    await wait();
    const before = data.find((x) => x.menuId === m.menuId);
    if (before && before.photoUrl !== m.photoUrl) revokeIfBlob(before.photoUrl);
    setData((d) => d.map((x) => (x.menuId === m.menuId ? m : x)));
    return { ok: true };
  };
  const deleteMenu = async (m: MenuRow): Promise<ActionResult> => {
    await wait();
    if (soldByMenu.has(m.menuId))
      return { ok: false, error: `${m.name} is already part of an order and cannot be deleted.` };
    revokeIfBlob(m.photoUrl);
    setData((d) => d.filter((x) => x.menuId !== m.menuId));
    return { ok: true };
  };

  return (
    <div className='flex flex-col gap-3 md:gap-3'>
      <StatCards
        loading={loading}
        items={[
          {
            label: 'Total Menus',
            value: total,
            icon: UtensilsIcon,
            badge: cheapest ? `from ${formatRupiah(cheapest.price)}` : '-',
            title: 'Dishes on the menu',
            note: 'Available to order',
          },
          {
            label: 'Average Price',
            value: formatRupiah(average),
            icon: TagIcon,
            badge: 'per dish',
            title: 'Mean price of all menus',
            note: `Across ${total} menus`,
          },
          {
            label: 'Best Seller',
            value: bestSeller ? bestSeller.name : '-',
            icon: TrophyIcon,
            badge: bestSeller ? `${soldOf(bestSeller)} sold` : '-',
            title: 'Most ordered menu',
            note: 'Based on all recorded orders',
          },
        ]}
      />

      <SimpleDataTable
        data={data}
        columns={columns}
        loading={loading}
        getRowId={(m) => String(m.menuId)}
        getRowLabel={(m) => m.name}
        searchText={(m) => `${m.menuId} ${m.name} ${m.price}`}
        onEdit={openUpdate}
        onDelete={deleteMenu}
        toolbarActions={
          <Button disabled={loading} onClick={openInsert}>
            <PlusIcon />
            Insert
          </Button>
        }
      />

      {sheet && (
        <MenuFormSheet
          key={`${sheet.mode}-${sheet.menu.menuId}`}
          mode={sheet.mode}
          menu={sheet.menu}
          allMenus={data}
          onClose={() => setSheet(null)}
          onSave={sheet.mode === 'insert' ? createMenu : updateMenu}
        />
      )}
    </div>
  );
}
