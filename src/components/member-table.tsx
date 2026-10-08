'use client';

import * as React from 'react';
import { PlusIcon, ShoppingBagIcon, UserPlusIcon, UsersIcon } from 'lucide-react';

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
import { formatDate, headerOrders, members, nextMemberId, type Member } from '@/lib/dummy-data';
import { useFakeLoad, wait } from '@/lib/fake-api';

// Nanti dipindah ke actions/result.ts saat Server Action dibuat (sama seperti proyek pertama).
type ActionResult = { ok: true } | { ok: false; error: string };

// columns berisi fungsi, jadi harus didefinisikan di file client
const columns: Column<Member>[] = [
  { header: 'Member ID', cell: (m) => m.memberId },
  { header: 'Name', cell: (m) => m.name, className: 'font-medium' },
  { header: 'Email', cell: (m) => m.email },
  { header: 'Handphone', cell: (m) => m.handphone },
  { header: 'Join Date', cell: (m) => formatDate(m.joinDate) },
];

/** Tanggal hari ini (zona waktu perangkat) dalam YYYY-MM-DD. Hanya dipanggil dari event handler. */
function localToday() {
  const d = new Date();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${mm}-${dd}`;
}

type FieldKey = 'name' | 'email' | 'handphone' | 'joinDate';
type Errors = Partial<Record<FieldKey, string>>;

// Batas panjang mengikuti data dictionary: Name 50, Email 50, Handphone 13.
function validate(form: Member, original: Member, others: Member[], today: string): Errors {
  const errors: Errors = {};

  if (!form.name.trim()) errors.name = 'Name is required.';

  const email = form.email.trim();
  if (!email) errors.email = 'Email is required.';
  else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) errors.email = 'Enter a valid email address.';
  else if (others.some((m) => m.email.toLowerCase() === email.toLowerCase()))
    errors.email = 'Email is already used by another member.';

  if (!form.handphone) errors.handphone = 'Handphone is required.';
  else if (!/^\d{10,13}$/.test(form.handphone)) errors.handphone = 'Handphone must be 10-13 digits.';

  if (!form.joinDate) errors.joinDate = 'Join date is required.';
  else if (form.joinDate > today && form.joinDate !== original.joinDate)
    errors.joinDate = 'Join date cannot be in the future.';

  return errors;
}

/** Satu form untuk Insert dan Update. Save / Cancel hanya ada selama mode insert/edit aktif. */
function MemberFormSheet({
  mode,
  member,
  today,
  allMembers,
  onSave,
  onClose,
}: {
  mode: 'insert' | 'update';
  member: Member;
  today: string;
  allMembers: Member[];
  onSave: (m: Member) => Promise<ActionResult>;
  onClose: () => void;
}) {
  const [form, setForm] = React.useState<Member>(member);
  const [touched, setTouched] = React.useState<Partial<Record<FieldKey, boolean>>>({});
  const [submitted, setSubmitted] = React.useState(false);
  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState('');

  const set = <K extends keyof Member>(key: K, value: Member[K]) => {
    setForm((f) => ({ ...f, [key]: value }));
    setError('');
  };
  const touch = (key: FieldKey) => setTouched((t) => ({ ...t, [key]: true }));

  const others = allMembers.filter((m) => m.memberId !== member.memberId);
  const errors = validate(form, member, others, today);
  // Pesan error baru muncul setelah field disentuh atau Save ditekan
  const shown = (key: FieldKey) => (submitted || touched[key] ? errors[key] : undefined);

  const submit = async () => {
    setSubmitted(true);
    if (Object.keys(errors).length > 0) return;

    setSaving(true);
    setError('');
    try {
      const result = await onSave({ ...form, name: form.name.trim(), email: form.email.trim() });
      if (result.ok) onClose();
      else setError(result.error);
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Sheet open onOpenChange={(open) => !open && !saving && onClose()}>
      <SheetContent>
        <SheetHeader>
          <SheetTitle>{mode === 'insert' ? 'Insert Member' : 'Update Member'}</SheetTitle>
          <SheetDescription>
            {mode === 'insert'
              ? 'Fill in the data for the new member.'
              : `Edit data for ${member.memberId}.`}
          </SheetDescription>
        </SheetHeader>

        <div className='flex min-h-0 flex-1 flex-col overflow-y-auto px-4'>
          <FieldGroup>
            <Field>
              <FieldLabel htmlFor='memberId'>Member ID</FieldLabel>
              <Input id='memberId' value={form.memberId} disabled />
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

            <Field data-invalid={Boolean(shown('email'))}>
              <FieldLabel htmlFor='email'>Email</FieldLabel>
              <Input
                id='email'
                type='email'
                maxLength={50}
                value={form.email}
                aria-invalid={Boolean(shown('email'))}
                onBlur={() => touch('email')}
                onChange={(e) => set('email', e.target.value)}
              />
              <FieldError>{shown('email')}</FieldError>
            </Field>

            <Field data-invalid={Boolean(shown('handphone'))}>
              <FieldLabel htmlFor='handphone'>Handphone</FieldLabel>
              <Input
                id='handphone'
                inputMode='numeric'
                maxLength={13}
                value={form.handphone}
                aria-invalid={Boolean(shown('handphone'))}
                onBlur={() => touch('handphone')}
                onChange={(e) => set('handphone', e.target.value.replace(/\D/g, ''))}
              />
              {shown('handphone') ? (
                <FieldError>{shown('handphone')}</FieldError>
              ) : (
                <FieldDescription>Digits only, 10-13 characters.</FieldDescription>
              )}
            </Field>

            <Field data-invalid={Boolean(shown('joinDate'))}>
              <FieldLabel htmlFor='joinDate'>Join Date</FieldLabel>
              <Input
                id='joinDate'
                type='date'
                max={today}
                value={form.joinDate}
                aria-invalid={Boolean(shown('joinDate'))}
                onBlur={() => touch('joinDate')}
                onChange={(e) => set('joinDate', e.target.value)}
              />
              <FieldError>{shown('joinDate')}</FieldError>
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

type SheetState = { mode: 'insert' | 'update'; member: Member; today: string };

export function MemberTable() {
  // Simulasi membaca data. Saat database siap: ganti dengan data dari server (props) seperti proyek pertama.
  const loading = useFakeLoad('members');
  const [data, setData] = React.useState<Member[]>(members);
  const [sheet, setSheet] = React.useState<SheetState | null>(null);

  // Member yang sudah punya order tidak boleh dihapus (FK headerorder.memberid).
  const memberIdsWithOrders = React.useMemo(() => new Set(headerOrders.map((h) => h.memberId)), []);

  const total = data.length;
  const active = data.filter((m) => memberIdsWithOrders.has(m.memberId)).length;
  const newest = [...data].sort((a, b) =>
    (b.joinDate + b.memberId).localeCompare(a.joinDate + a.memberId),
  )[0];
  const pct = total ? `${Math.round((active / total) * 100)}%` : '0%';

  const openInsert = () => {
    const today = localToday();
    setSheet({
      mode: 'insert',
      today,
      member: { memberId: nextMemberId(data), name: '', email: '', handphone: '', joinDate: today },
    });
  };
  const openUpdate = (member: Member) =>
    setSheet({ mode: 'update', member, today: localToday() });

  const createMember = async (m: Member): Promise<ActionResult> => {
    await wait();
    setData((d) => [...d, m]);
    return { ok: true };
  };
  const updateMember = async (m: Member): Promise<ActionResult> => {
    await wait();
    setData((d) => d.map((x) => (x.memberId === m.memberId ? m : x)));
    return { ok: true };
  };
  const deleteMember = async (m: Member): Promise<ActionResult> => {
    await wait();
    if (memberIdsWithOrders.has(m.memberId))
      return { ok: false, error: `${m.name} already has order history and cannot be deleted.` };
    setData((d) => d.filter((x) => x.memberId !== m.memberId));
    return { ok: true };
  };

  return (
    <div className='flex flex-col gap-3 md:gap-3'>
      <StatCards
        loading={loading}
        items={[
          {
            label: 'Total Members',
            value: total,
            icon: UsersIcon,
            badge: `${active} ordered`,
            title: 'Registered members',
            note: 'Everyone in the member database',
          },
          {
            label: 'Active Members',
            value: active,
            icon: ShoppingBagIcon,
            badge: pct,
            title: 'Members who have ordered',
            note: `${active} of ${total} members`,
          },
          {
            label: 'Newest Member',
            value: newest ? newest.name : '-',
            icon: UserPlusIcon,
            badge: newest ? formatDate(newest.joinDate) : '-',
            title: 'Latest to join',
            note: newest ? newest.memberId : 'No members yet',
          },
        ]}
      />

      <SimpleDataTable
        data={data}
        columns={columns}
        loading={loading}
        getRowId={(m) => m.memberId}
        getRowLabel={(m) => m.name}
        searchText={(m) => `${m.memberId} ${m.name} ${m.email} ${m.handphone}`}
        onEdit={openUpdate}
        onDelete={deleteMember}
        toolbarActions={
          <Button disabled={loading} onClick={openInsert}>
            <PlusIcon />
            Insert
          </Button>
        }
      />

      {sheet && (
        <MemberFormSheet
          key={`${sheet.mode}-${sheet.member.memberId}`}
          mode={sheet.mode}
          member={sheet.member}
          today={sheet.today}
          allMembers={data}
          onClose={() => setSheet(null)}
          onSave={sheet.mode === 'insert' ? createMember : updateMember}
        />
      )}
    </div>
  );
}
