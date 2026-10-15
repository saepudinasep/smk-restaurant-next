'use client';

import * as React from 'react';
import { PlusIcon, TagIcon, TrophyIcon, UploadIcon, UtensilsIcon } from 'lucide-react';
import { toast } from 'sonner';

import { createMenu, deleteMenu, updateMenu } from '@/actions/menus';
import type { ActionResult } from '@/actions/result';
import { CategoryFilter } from '@/components/category-filter';
import { MenuPhoto } from '@/components/menu-photo';
import { SimpleDataTable, type Column } from '@/components/simple-data-table';
import { StatCards } from '@/components/stat-cards';
import { ConfirmActionDialog } from '@/components/ui/alert-dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
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
import { Spinner } from '@/components/ui/spinner';
import { uploadMenuPhoto } from '@/lib/cloudinary-upload';
import { nextMenuNumber } from '@/lib/codes';
import { formatRupiah } from '@/lib/format';
import {
  CATEGORY_LABEL,
  MENU_CATEGORIES,
  type CategoryFilter as CategoryFilterValue,
  type MenuCategory,
} from '@/lib/menu-categories';
import type { Menu } from '@/lib/types';

// Di form harga berupa teks supaya bisa dikosongkan; diubah ke angka setelah lolos validasi.
// `photo` = foto yang sudah tersimpan (url); file baru yang dipilih ditampung terpisah (state `file`).
type MenuForm = Omit<Menu, 'price'> & { price: string };

// Aturan file mengikuti server (lib/cloudinary.ts); server memeriksa ulang aset yang di-upload.
const MAX_PHOTO_BYTES = 2 * 1024 * 1024;
const PHOTO_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

// columns berisi fungsi, jadi harus didefinisikan di file client
const columns: Column<Menu>[] = [
  { header: 'Photo', cell: (m) => <MenuPhoto menu={m} /> },
  { header: 'Menu ID', cell: (m) => m.menuId },
  { header: 'Name', cell: (m) => m.name, className: 'font-medium' },
  {
    header: 'Category',
    cell: (m) => <Badge variant='outline'>{CATEGORY_LABEL[m.category]}</Badge>,
  },
  { header: 'Price', cell: (m) => formatRupiah(m.price), className: 'tabular-nums' },
];

const categoryItems = MENU_CATEGORIES.map((c) => ({ value: c, label: CATEGORY_LABEL[c] }));

type FieldKey = 'name' | 'price' | 'photo';
type Errors = Partial<Record<FieldKey, string>>;

// Batas panjang mengikuti data dictionary: Name 50.
function validate(form: MenuForm, hasNewFile: boolean, others: Menu[]): Errors {
  const errors: Errors = {};

  const name = form.name.trim();
  if (!name) errors.name = 'Name is required.';
  else if (others.some((m) => m.name.toLowerCase() === name.toLowerCase()))
    errors.name = 'A menu with this name already exists.';

  if (!form.price) errors.price = 'Price is required.';
  else if (Number(form.price) <= 0) errors.price = 'Price must be greater than 0.';

  if (!form.photo && !hasNewFile) errors.photo = 'Photo is required.';

  return errors;
}

type Stage = 'uploading' | 'saving' | null;

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
  allMenus: Menu[];
  onSave: (input: {
    menuId: number;
    name: string;
    price: number;
    category: MenuCategory;
    photoPublicId?: string;
  }) => Promise<ActionResult>;
  onClose: () => void;
}) {
  const [form, setForm] = React.useState<MenuForm>(menu);
  const [file, setFile] = React.useState<File | null>(null);
  const [preview, setPreview] = React.useState<string | undefined>();
  const [touched, setTouched] = React.useState<Partial<Record<FieldKey, boolean>>>({});
  const [submitted, setSubmitted] = React.useState(false);
  const [stage, setStage] = React.useState<Stage>(null);
  const [error, setError] = React.useState('');
  const [fileError, setFileError] = React.useState('');
  const [confirmOpen, setConfirmOpen] = React.useState(false);
  const fileInput = React.useRef<HTMLInputElement>(null);
  const saving = stage !== null;

  // Pratinjau (object URL) hanya dipakai di form ini; setelah disimpan tabel memakai url dari server.
  const previewUrl = React.useRef<string | null>(null);
  React.useEffect(
    () => () => {
      if (previewUrl.current) URL.revokeObjectURL(previewUrl.current);
    },
    [],
  );

  const set = <K extends keyof MenuForm>(key: K, value: MenuForm[K]) => {
    setForm((f) => ({ ...f, [key]: value }));
    setError('');
  };
  const touch = (key: FieldKey) => setTouched((t) => ({ ...t, [key]: true }));

  const onPickFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const picked = e.target.files?.[0];
    e.target.value = ''; // supaya memilih file yang sama dua kali tetap memicu onChange
    if (!picked) return;
    touch('photo');

    if (!PHOTO_TYPES.includes(picked.type))
      return setFileError('Photo must be a JPG, PNG or WEBP image.');
    if (picked.size > MAX_PHOTO_BYTES) return setFileError('Photo must be 2 MB or smaller.');

    if (previewUrl.current) URL.revokeObjectURL(previewUrl.current);
    const url = URL.createObjectURL(picked);
    previewUrl.current = url;
    setFileError('');
    setFile(picked);
    setPreview(url);
    setError('');
  };

  const others = allMenus.filter((m) => m.menuId !== menu.menuId);
  const errors = validate(form, Boolean(file), others);
  // Pesan error baru muncul setelah field disentuh atau Save ditekan
  const shown = (key: FieldKey) => (submitted || touched[key] ? errors[key] : undefined);
  const photoError = fileError || shown('photo');

  const submit = () => {
    setSubmitted(true);
    if (Object.keys(errors).length > 0 || fileError) return;
    setConfirmOpen(true);
  };

  const save = async () => {
    setError('');
    try {
      // 1) File baru: kirim langsung ke Cloudinary (tidak lewat server kita)
      let photoPublicId: string | undefined;
      if (file) {
        setStage('uploading');
        const uploaded = await uploadMenuPhoto(file);
        if (!uploaded.ok) {
          setError(uploaded.error);
          toast.error(uploaded.error);
          return;
        }
        photoPublicId = uploaded.publicId;
      }

      // 2) Simpan menu; server memeriksa aset itu lalu mengisi url foto
      setStage('saving');
      const result = await onSave({
        menuId: form.menuId,
        name: form.name.trim(),
        price: Number(form.price),
        category: form.category,
        photoPublicId,
      });
      if (result.ok) {
        toast.success(mode === 'insert' ? 'Menu created successfully.' : 'Menu updated successfully.');
        onClose();
      } else {
        setError(result.error);
        toast.error(result.error);
      }
    } catch {
      setError('Network error. Please try again.');
      toast.error('Network error. Please try again.');
    } finally {
      setStage(null);
    }
  };

  const priceNumber = Number(form.price);
  const photoLabel = file ? file.name : form.photo ? 'Current photo' : '';

  return (
    <>
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
              <MenuPhoto
                menu={{ name: form.name, photo: form.photo, photoUrl: preview }}
                className='aspect-video h-auto w-full'
              />
              <div className='flex items-center gap-2'>
                <Input
                  readOnly
                  tabIndex={-1}
                  value={photoLabel}
                  placeholder='No file chosen'
                  aria-label='Photo file name'
                  aria-invalid={Boolean(photoError)}
                />
                <Button
                  type='button'
                  variant='outline'
                  disabled={saving}
                  onClick={() => fileInput.current?.click()}
                >
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
                <FieldDescription>
                  JPG, PNG or WEBP, up to 2 MB. The photo is uploaded when you press Save.
                </FieldDescription>
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

            <Field>
              <FieldLabel>Category</FieldLabel>
              <Select
                items={categoryItems}
                value={form.category}
                onValueChange={(v) => v && set('category', v as MenuCategory)}
              >
                <SelectTrigger className='w-full' aria-label='Category'>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {categoryItems.map((c) => (
                    <SelectItem key={c.value} value={c.value}>
                      {c.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
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
              {stage === 'uploading'
                ? 'Uploading photo...'
                : stage === 'saving'
                  ? 'Saving...'
                  : 'Save'}
            </Button>
            <Button variant='outline' disabled={saving} onClick={onClose}>
              Cancel
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>
      <ConfirmActionDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title={mode === 'insert' ? 'Insert menu?' : 'Update menu?'}
        description={
          mode === 'insert'
            ? `Add ${form.name.trim()} to the menu?`
            : `Save changes to ${form.name.trim()}?`
        }
        confirmLabel={mode === 'insert' ? 'Insert' : 'Update'}
        onConfirm={() => void save()}
      />
    </>
  );
}

type SheetState = { mode: 'insert' | 'update'; menu: MenuForm };

export function MenuTable({
  initialData,
  soldByMenu,
}: {
  initialData: Menu[];
  /** Jumlah porsi terjual per menu, kunci = MenuID */
  soldByMenu: Record<number, number>;
}) {
  // Data datang dari server (props). Setelah Server Action memanggil revalidatePath,
  // Next.js mengirim props baru sehingga tabel dan kartu ikut ter-update.
  const data = initialData;
  const [sheet, setSheet] = React.useState<SheetState | null>(null);
  const [category, setCategory] = React.useState<CategoryFilterValue>('all');
  const visible = category === 'all' ? data : data.filter((m) => m.category === category);

  const total = data.length;
  const average = total ? Math.round(data.reduce((s, m) => s + m.price, 0) / total) : 0;
  const soldOf = (m: Menu) => soldByMenu[m.menuId] ?? 0;
  const bestSeller = data.reduce<Menu | null>(
    (best, m) => (soldOf(m) > (best ? soldOf(best) : 0) ? m : best),
    null,
  );
  const cheapest = data.reduce<Menu | null>((c, m) => (!c || m.price < c.price ? m : c), null);

  const openInsert = () =>
    setSheet({
      mode: 'insert',
      // Hanya pratinjau; MenuID yang sebenarnya ditentukan server saat menyimpan
      menu: {
        menuId: nextMenuNumber(data.map((m) => m.menuId)),
        name: '',
        price: '',
        category: 'Food',
        photo: '',
      },
    });
  const openUpdate = (menu: Menu) =>
    setSheet({ mode: 'update', menu: { ...menu, price: String(menu.price) } });

  return (
    <div className='flex flex-col gap-3 md:gap-3'>
      <StatCards
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

      <CategoryFilter items={data} value={category} onChange={setCategory} />

      <SimpleDataTable
        data={visible}
        columns={columns}
        getRowId={(m) => String(m.menuId)}
        getRowLabel={(m) => m.name}
        searchText={(m) => `${m.menuId} ${m.name} ${m.price}`}
        onEdit={openUpdate}
        onDelete={(m) => deleteMenu(m.menuId)}
        toolbarActions={
          <Button onClick={openInsert}>
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
