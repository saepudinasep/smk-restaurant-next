'use client';

import * as React from 'react';
import { BanknoteIcon, ChefHatIcon, PlusIcon, ShieldCheckIcon, UsersIcon } from 'lucide-react';
import { toast } from 'sonner';

import { createEmployee, deleteEmployee, updateEmployee } from '@/actions/employees';
import type { ActionResult } from '@/actions/result';
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
import { ROLES } from '@/lib/access';
import { nextEmployeeCode } from '@/lib/codes';
import type { Employee } from '@/lib/types';

// columns berisi fungsi, jadi harus didefinisikan di file client
const columns: Column<Employee>[] = [
  { header: 'Employee ID', cell: (e) => e.employeeId },
  { header: 'Name', cell: (e) => e.name, className: 'font-medium' },
  { header: 'Email', cell: (e) => e.email },
  { header: 'Handphone', cell: (e) => e.handphone },
  { header: 'Position', cell: (e) => <Badge variant='outline'>{e.position}</Badge> },
];

// Di form, Position boleh kosong sampai dipilih; setelah lolos validasi barulah menjadi Position.
type EmployeeForm = Omit<Employee, 'position'> & { position: Employee['position'] | '' };

type FieldKey = 'name' | 'email' | 'handphone' | 'position';
type Errors = Partial<Record<FieldKey, string>>;

// Batas panjang mengikuti data dictionary: Name 100, Email 50, Handphone 13.
function validate(form: EmployeeForm, others: Employee[]): Errors {
  const errors: Errors = {};

  if (!form.name.trim()) errors.name = 'Name is required.';

  const email = form.email.trim();
  if (!email) errors.email = 'Email is required.';
  else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) errors.email = 'Enter a valid email address.';
  // Email dipakai untuk login, jadi harus unik
  else if (others.some((e) => e.email.toLowerCase() === email.toLowerCase()))
    errors.email = 'Email is already used by another employee.';

  if (!form.handphone) errors.handphone = 'Handphone is required.';
  else if (!/^\d{10,13}$/.test(form.handphone))
    errors.handphone = 'Handphone must be 10-13 digits.';

  if (!form.position) errors.position = 'Position is required.';

  return errors;
}

/** Satu form untuk Insert dan Update. Save / Cancel hanya ada selama mode insert/edit aktif. */
function EmployeeFormSheet({
  mode,
  employee,
  allEmployees,
  onSave,
  onClose,
}: {
  mode: 'insert' | 'update';
  employee: EmployeeForm;
  allEmployees: Employee[];
  onSave: (e: Employee) => Promise<ActionResult>;
  onClose: () => void;
}) {
  const [form, setForm] = React.useState<EmployeeForm>(employee);
  const [touched, setTouched] = React.useState<Partial<Record<FieldKey, boolean>>>({});
  const [submitted, setSubmitted] = React.useState(false);
  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState('');
  const [confirmOpen, setConfirmOpen] = React.useState(false);

  const set = <K extends keyof EmployeeForm>(key: K, value: EmployeeForm[K]) => {
    setForm((f) => ({ ...f, [key]: value }));
    setError('');
  };
  const touch = (key: FieldKey) => setTouched((t) => ({ ...t, [key]: true }));

  const others = allEmployees.filter((e) => e.employeeId !== employee.employeeId);
  const errors = validate(form, others);
  // Pesan error baru muncul setelah field disentuh atau Save ditekan
  const shown = (key: FieldKey) => (submitted || touched[key] ? errors[key] : undefined);

  const submit = () => {
    setSubmitted(true);
    const position = form.position;
    if (Object.keys(errors).length > 0 || !position) return;
    setConfirmOpen(true);
  };

  const save = async () => {
    const position = form.position;
    if (!position) {
      setError('Position is required.');
      return;
    }
    setSaving(true);
    setError('');
    try {
      const result = await onSave({
        ...form,
        position,
        name: form.name.trim(),
        email: form.email.trim(),
      });
      if (result.ok) {
        toast.success(mode === 'insert' ? 'Employee created successfully.' : 'Employee updated successfully.');
        onClose();
      } else {
        setError(result.error);
        toast.error(result.error);
      }
    } catch {
      setError('Network error. Please try again.');
      toast.error('Network error. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <Sheet open onOpenChange={(open) => !open && !saving && onClose()}>
        <SheetContent>
          <SheetHeader>
            <SheetTitle>{mode === 'insert' ? 'Insert Employee' : 'Update Employee'}</SheetTitle>
            <SheetDescription>
              {mode === 'insert'
                ? 'Fill in the data for the new employee. They can log in with the default password and should change it from Account.'
                : `Edit data for ${employee.employeeId}.`}
            </SheetDescription>
          </SheetHeader>

        <div className='flex min-h-0 flex-1 flex-col overflow-y-auto px-4'>
          <FieldGroup>
            <Field>
              <FieldLabel htmlFor='employeeId'>Employee ID</FieldLabel>
              <Input id='employeeId' value={form.employeeId} disabled />
              <FieldDescription>Generated automatically.</FieldDescription>
            </Field>

            <Field data-invalid={Boolean(shown('name'))}>
              <FieldLabel htmlFor='name'>Name</FieldLabel>
              <Input
                id='name'
                maxLength={100}
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
              {shown('email') ? (
                <FieldError>{shown('email')}</FieldError>
              ) : (
                <FieldDescription>Used to log in to the application.</FieldDescription>
              )}
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

            <Field data-invalid={Boolean(shown('position'))}>
              <FieldLabel>Position</FieldLabel>
              <Select
                value={form.position || null}
                onValueChange={(v) => {
                  if (!v) return;
                  set('position', v as Employee['position']);
                  touch('position');
                }}
              >
                <SelectTrigger
                  className='w-full'
                  aria-label='Position'
                  aria-invalid={Boolean(shown('position'))}
                  onBlur={() => touch('position')}
                >
                  <SelectValue placeholder='Select position' />
                </SelectTrigger>
                <SelectContent>
                  {ROLES.map((p) => (
                    <SelectItem key={p} value={p}>
                      {p}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FieldError>{shown('position')}</FieldError>
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
      <ConfirmActionDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title={mode === 'insert' ? 'Insert employee?' : 'Update employee?'}
        description={
          mode === 'insert'
            ? `Create the employee account for ${form.name.trim()}?`
            : `Save changes to ${form.name.trim()}'s employee record?`
        }
        confirmLabel={mode === 'insert' ? 'Insert' : 'Update'}
        onConfirm={() => void save()}
      />
    </>
  );
}

type SheetState = { mode: 'insert' | 'update'; employee: EmployeeForm };

export function EmployeeTable({ initialData }: { initialData: Employee[] }) {
  // Data datang dari server (props). Setelah Server Action memanggil revalidatePath,
  // Next.js mengirim props baru sehingga tabel dan kartu ikut ter-update.
  const data = initialData;
  const [sheet, setSheet] = React.useState<SheetState | null>(null);

  const count = (position: Employee['position']) =>
    data.filter((e) => e.position === position).length;
  const total = data.length;
  const pct = (n: number) => (total ? `${Math.round((n / total) * 100)}%` : '0%');
  const admins = count('Admin');
  const chefs = count('Chef');
  const cashiers = count('Cashier');

  const openInsert = () =>
    setSheet({
      mode: 'insert',
      employee: {
        // Hanya pratinjau; ID yang sebenarnya ditentukan server saat menyimpan
        employeeId: nextEmployeeCode(data.map((e) => e.employeeId)),
        name: '',
        email: '',
        handphone: '',
        position: '',
      },
    });
  const openUpdate = (employee: Employee) => setSheet({ mode: 'update', employee });

  return (
    <div className='flex flex-col gap-3 md:gap-3'>
      <StatCards
        items={[
          {
            label: 'Total Employees',
            value: total,
            icon: UsersIcon,
            badge: `${ROLES.length} positions`,
            title: 'Registered employees',
            note: 'Admin, Chef and Cashier accounts',
          },
          {
            label: 'Admins',
            value: admins,
            icon: ShieldCheckIcon,
            badge: pct(admins),
            title: 'Manage master data',
            note: `${admins} of ${total} employees`,
          },
          {
            label: 'Chefs',
            value: chefs,
            icon: ChefHatIcon,
            badge: pct(chefs),
            title: 'Prepare the orders',
            note: `${chefs} of ${total} employees`,
          },
          {
            label: 'Cashiers',
            value: cashiers,
            icon: BanknoteIcon,
            badge: pct(cashiers),
            title: 'Handle the payments',
            note: `${cashiers} of ${total} employees`,
          },
        ]}
      />

      <SimpleDataTable
        data={data}
        columns={columns}
        getRowId={(e) => e.employeeId}
        getRowLabel={(e) => e.name}
        searchText={(e) => `${e.employeeId} ${e.name} ${e.email} ${e.handphone} ${e.position}`}
        onEdit={openUpdate}
        onDelete={(e) => deleteEmployee(e.employeeId)}
        toolbarActions={
          <Button onClick={openInsert}>
            <PlusIcon />
            Insert
          </Button>
        }
      />

      {sheet && (
        <EmployeeFormSheet
          key={`${sheet.mode}-${sheet.employee.employeeId}`}
          mode={sheet.mode}
          employee={sheet.employee}
          allEmployees={data}
          onClose={() => setSheet(null)}
          onSave={sheet.mode === 'insert' ? createEmployee : updateEmployee}
        />
      )}
    </div>
  );
}
