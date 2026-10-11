'use client';

import * as React from 'react';
import { useSession } from 'next-auth/react';
import { CheckIcon, CircleIcon, KeyRoundIcon } from 'lucide-react';

import { changePassword, updateProfile, type PasswordField } from '@/actions/account';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Spinner } from '@/components/ui/spinner';
import { PASSWORD_MAX, PASSWORD_RULES } from '@/lib/password-rules';

export type AccountProfile = {
  employeeCode: string;
  name: string;
  email: string;
  handphone: string;
  position: string;
};

function Success({ children }: { children: React.ReactNode }) {
  return (
    <div
      role='status'
      className='flex items-center gap-2 rounded-lg border bg-muted/50 px-3 py-2 text-sm'
    >
      <CheckIcon className='size-4 shrink-0' />
      {children}
    </div>
  );
}

function ErrorBox({ children }: { children: React.ReactNode }) {
  return (
    <p role='alert' className='text-sm text-destructive'>
      {children}
    </p>
  );
}

const initialsOf = (name: string) =>
  name
    .split(' ')
    .filter(Boolean)
    .map((w) => w[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();

// ---------------------------------------------------------------------------
// Profil
// ---------------------------------------------------------------------------

type ProfileForm = { name: string; handphone: string };
type ProfileKey = keyof ProfileForm;

// Batas panjang mengikuti data dictionary: Name 100, Handphone 13. Server memeriksa ulang.
function validateProfile(f: ProfileForm): Partial<Record<ProfileKey, string>> {
  const errors: Partial<Record<ProfileKey, string>> = {};
  if (!f.name.trim()) errors.name = 'Name is required.';
  if (!f.handphone) errors.handphone = 'Handphone is required.';
  else if (!/^\d{10,13}$/.test(f.handphone)) errors.handphone = 'Handphone must be 10-13 digits.';
  return errors;
}

function ProfileCard({ profile }: { profile: AccountProfile }) {
  const { update } = useSession();
  const [saved, setSaved] = React.useState<ProfileForm>({
    name: profile.name,
    handphone: profile.handphone,
  });
  const [form, setForm] = React.useState<ProfileForm>(saved);
  const [touched, setTouched] = React.useState<Partial<Record<ProfileKey, boolean>>>({});
  const [submitted, setSubmitted] = React.useState(false);
  const [saving, setSaving] = React.useState(false);
  const [message, setMessage] = React.useState('');
  const [error, setError] = React.useState('');

  const set = (patch: Partial<ProfileForm>) => {
    setForm((f) => ({ ...f, ...patch }));
    setMessage('');
    setError('');
  };
  const touch = (key: ProfileKey) => setTouched((t) => ({ ...t, [key]: true }));

  const errors = validateProfile(form);
  const shown = (key: ProfileKey) => (submitted || touched[key] ? errors[key] : undefined);
  const dirty = form.name !== saved.name || form.handphone !== saved.handphone;

  const save = async () => {
    setSubmitted(true);
    if (Object.keys(errors).length > 0) return;
    setSaving(true);
    setError('');
    try {
      const next = { name: form.name.trim(), handphone: form.handphone };
      const result = await updateProfile(next);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      await update(); // muat ulang sesi supaya nama baru juga tampil di sidebar
      setSaved(next);
      setForm(next);
      setTouched({});
      setSubmitted(false);
      setMessage('Profile updated.');
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Profile</CardTitle>
        <CardDescription>Update your personal information</CardDescription>
      </CardHeader>
      <CardContent className='flex flex-col gap-4'>
        <div className='flex items-center gap-4'>
          <Avatar className='size-20 rounded-xl'>
            <AvatarFallback className='rounded-xl text-xl'>
              {initialsOf(form.name) || '?'}
            </AvatarFallback>
          </Avatar>
          <div className='flex flex-col gap-1'>
            <span className='font-medium'>{form.name || '-'}</span>
            <Badge variant='outline' className='w-fit'>
              {profile.position}
            </Badge>
          </div>
        </div>

        <FieldGroup>
          <Field>
            <FieldLabel htmlFor='acc-id'>Employee ID</FieldLabel>
            <Input id='acc-id' value={profile.employeeCode} disabled />
          </Field>

          <Field data-invalid={Boolean(shown('name'))}>
            <FieldLabel htmlFor='acc-name'>Name</FieldLabel>
            <Input
              id='acc-name'
              maxLength={100}
              value={form.name}
              aria-invalid={Boolean(shown('name'))}
              onBlur={() => touch('name')}
              onChange={(e) => set({ name: e.target.value })}
            />
            <FieldError>{shown('name')}</FieldError>
          </Field>

          <Field>
            <FieldLabel htmlFor='acc-email'>Email</FieldLabel>
            <Input id='acc-email' value={profile.email} disabled />
            <FieldDescription>Your login email. Ask an Admin to change it.</FieldDescription>
          </Field>

          <Field data-invalid={Boolean(shown('handphone'))}>
            <FieldLabel htmlFor='acc-phone'>Handphone</FieldLabel>
            <Input
              id='acc-phone'
              inputMode='numeric'
              maxLength={13}
              value={form.handphone}
              aria-invalid={Boolean(shown('handphone'))}
              onBlur={() => touch('handphone')}
              onChange={(e) => set({ handphone: e.target.value.replace(/\D/g, '') })}
            />
            {shown('handphone') ? (
              <FieldError>{shown('handphone')}</FieldError>
            ) : (
              <FieldDescription>Digits only, 10-13 characters.</FieldDescription>
            )}
          </Field>

          <Field>
            <FieldLabel htmlFor='acc-position'>Position</FieldLabel>
            <Input id='acc-position' value={profile.position} disabled />
            <FieldDescription>Determines which menus you can use.</FieldDescription>
          </Field>
        </FieldGroup>

        {message && <Success>{message}</Success>}
        {error && <ErrorBox>{error}</ErrorBox>}
      </CardContent>
      <CardFooter className='gap-2'>
        <Button disabled={!dirty || saving} onClick={save}>
          {saving && <Spinner />}
          {saving ? 'Saving...' : 'Save'}
        </Button>
        <Button
          variant='outline'
          disabled={!dirty || saving}
          onClick={() => {
            setForm(saved);
            setTouched({});
            setSubmitted(false);
            setMessage('');
            setError('');
          }}
        >
          Cancel
        </Button>
      </CardFooter>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Ganti password (form 08 Change Password)
// ---------------------------------------------------------------------------

type PwKey = 'old' | 'new' | 'confirm';

function PasswordCard() {
  const [oldPw, setOldPw] = React.useState('');
  const [newPw, setNewPw] = React.useState('');
  const [confirmPw, setConfirmPw] = React.useState('');
  const [show, setShow] = React.useState(false);
  const [touched, setTouched] = React.useState<Partial<Record<PwKey, boolean>>>({});
  const [submitted, setSubmitted] = React.useState(false);
  const [saving, setSaving] = React.useState(false);
  const [message, setMessage] = React.useState('');
  // Kesalahan dari server (mis. password lama salah) dan field yang dimaksud
  const [serverError, setServerError] = React.useState<{
    field: PasswordField;
    error: string;
  } | null>(null);

  const type = show ? 'text' : 'password';
  const touch = (key: PwKey) => setTouched((t) => ({ ...t, [key]: true }));
  const edited = (fn: () => void) => {
    fn();
    setMessage('');
    setServerError(null);
  };

  // Pemeriksaan di browser agar pesan cepat muncul; password lama diperiksa server.
  const errors: Partial<Record<PwKey, string>> = {};
  if (!oldPw) errors.old = 'Old password is required.';
  if (!newPw) errors.new = 'New password is required.';
  else if (!PASSWORD_RULES.every((r) => r.test(newPw)))
    errors.new = 'New password must contain an uppercase letter, a lowercase letter and a number.';
  if (!confirmPw) errors.confirm = 'Confirm your new password.';
  else if (confirmPw !== newPw)
    errors.confirm = 'Confirm password does not match the new password.';

  const shown = (key: PwKey) =>
    (submitted || touched[key] ? errors[key] : undefined) ??
    (serverError?.field === key ? serverError.error : undefined);

  const save = async () => {
    setSubmitted(true);
    if (Object.keys(errors).length > 0) return;
    setSaving(true);
    setServerError(null);
    try {
      const result = await changePassword({
        oldPassword: oldPw,
        newPassword: newPw,
        confirmPassword: confirmPw,
      });
      if (!result.ok) {
        setServerError({ field: result.field, error: result.error });
        return;
      }
      setOldPw('');
      setNewPw('');
      setConfirmPw('');
      setTouched({});
      setSubmitted(false);
      setMessage('Password changed successfully.');
    } catch {
      setServerError({ field: 'form', error: 'Network error. Please try again.' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className='flex items-center gap-2'>
          <KeyRoundIcon className='size-4' />
          Change Password
        </CardTitle>
        <CardDescription>Choose a password you do not use anywhere else</CardDescription>
      </CardHeader>
      <CardContent className='flex flex-col gap-4'>
        <FieldGroup>
          <Field data-invalid={Boolean(shown('old'))}>
            <FieldLabel htmlFor='pw-old'>Old Password</FieldLabel>
            <Input
              id='pw-old'
              type={type}
              maxLength={PASSWORD_MAX}
              autoComplete='current-password'
              value={oldPw}
              aria-invalid={Boolean(shown('old'))}
              onBlur={() => touch('old')}
              onChange={(e) => edited(() => setOldPw(e.target.value))}
            />
            <FieldError>{shown('old')}</FieldError>
          </Field>

          <Field data-invalid={Boolean(shown('new'))}>
            <FieldLabel htmlFor='pw-new'>New Password</FieldLabel>
            <Input
              id='pw-new'
              type={type}
              maxLength={PASSWORD_MAX}
              autoComplete='new-password'
              value={newPw}
              aria-invalid={Boolean(shown('new'))}
              onBlur={() => touch('new')}
              onChange={(e) => edited(() => setNewPw(e.target.value))}
            />
            <ul className='flex flex-col gap-1 text-sm' aria-label='Password requirements'>
              {PASSWORD_RULES.map((r) => {
                const met = r.test(newPw);
                return (
                  <li
                    key={r.key}
                    data-met={met}
                    className='flex items-center gap-2 text-muted-foreground data-[met=true]:text-foreground'
                  >
                    {met ? (
                      <CheckIcon className='size-3.5 text-primary' />
                    ) : (
                      <CircleIcon className='size-3.5' />
                    )}
                    {r.label}
                    <span className='sr-only'>{met ? ' (met)' : ' (not met)'}</span>
                  </li>
                );
              })}
            </ul>
            <FieldError>{shown('new')}</FieldError>
          </Field>

          <Field data-invalid={Boolean(shown('confirm'))}>
            <FieldLabel htmlFor='pw-confirm'>Confirm Password</FieldLabel>
            <Input
              id='pw-confirm'
              type={type}
              maxLength={PASSWORD_MAX}
              autoComplete='new-password'
              value={confirmPw}
              aria-invalid={Boolean(shown('confirm'))}
              onBlur={() => touch('confirm')}
              onChange={(e) => edited(() => setConfirmPw(e.target.value))}
            />
            <FieldError>{shown('confirm')}</FieldError>
          </Field>
        </FieldGroup>

        <div className='flex items-center gap-2'>
          <Checkbox id='pw-show' checked={show} onCheckedChange={(c) => setShow(c)} />
          <Label htmlFor='pw-show' className='font-normal'>
            Show passwords
          </Label>
        </div>

        {message && <Success>{message}</Success>}
        {serverError?.field === 'form' && <ErrorBox>{serverError.error}</ErrorBox>}
      </CardContent>
      <CardFooter>
        <Button disabled={saving} onClick={save}>
          {saving && <Spinner />}
          {saving ? 'Saving...' : 'Save'}
        </Button>
      </CardFooter>
    </Card>
  );
}

export function Account({ profile }: { profile: AccountProfile }) {
  return (
    <div className='grid items-start gap-4 md:gap-6 lg:grid-cols-2'>
      <ProfileCard profile={profile} />
      <PasswordCard />
    </div>
  );
}
