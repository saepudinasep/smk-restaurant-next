'use client';

import * as React from 'react';
import { cn } from 'cn';
import { EyeIcon, EyeOffIcon } from 'lucide-react';

import { login } from '@/actions/auth';
import { Button } from '@/components/ui/button';
import { Field, FieldError, FieldGroup, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Spinner } from '@/components/ui/spinner';

export function LoginForm({
  className,
  callbackUrl = '/',
  ...props
}: React.ComponentProps<'form'> & { callbackUrl?: string }) {
  // Hasil Server Action: pesan error, atau undefined (saat sukses halaman langsung berpindah).
  const [serverError, formAction, pending] = React.useActionState(login, undefined);
  const [email, setEmail] = React.useState('');
  const [password, setPassword] = React.useState('');
  const [show, setShow] = React.useState(false);
  const [submitted, setSubmitted] = React.useState(false);
  const [dismissed, setDismissed] = React.useState(false);

  // Semua field wajib diisi (sesuai soal). Pesan baru tampil setelah tombol Login ditekan.
  const emailError = submitted && !email.trim() ? 'Email wajib diisi.' : undefined;
  const passwordError = submitted && !password ? 'Password wajib diisi.' : undefined;

  return (
    <form
      noValidate
      action={formAction}
      className={cn('flex flex-col gap-6', className)}
      {...props}
      onSubmit={(e) => {
        setSubmitted(true);
        setDismissed(false);
        // Field kosong: batalkan pengiriman (React tidak menjalankan action bila submit dibatalkan)
        if (!email.trim() || !password) e.preventDefault();
      }}
    >
      <FieldGroup>
        <div className='flex flex-col items-center gap-1 text-center'>
          <h1 className='text-2xl font-bold'>SMK Restaurant</h1>
          <p className='text-sm text-balance text-muted-foreground'>
            Masukkan Email dan Password untuk masuk ke Sistem Informasi SMK Restaurant.
          </p>
        </div>

        <input type='hidden' name='callbackUrl' value={callbackUrl} />

        <Field data-invalid={Boolean(emailError)}>
          <FieldLabel htmlFor='email'>Email</FieldLabel>
          <Input
            id='email'
            name='email'
            type='email'
            placeholder='nama@smkrestaurant.sch.id'
            autoComplete='username'
            autoFocus
            maxLength={50}
            value={email}
            readOnly={pending}
            aria-invalid={Boolean(emailError)}
            onChange={(e) => {
              setEmail(e.target.value);
              setDismissed(true);
            }}
          />
          <FieldError>{emailError}</FieldError>
        </Field>

        <Field data-invalid={Boolean(passwordError)}>
          <FieldLabel htmlFor='password'>Password</FieldLabel>
          <div className='relative'>
            <Input
              id='password'
              name='password'
              type={show ? 'text' : 'password'}
              placeholder='Masukkan password'
              autoComplete='current-password'
              maxLength={50}
              className='pr-10'
              value={password}
              readOnly={pending}
              aria-invalid={Boolean(passwordError)}
              onChange={(e) => {
                setPassword(e.target.value);
                setDismissed(true);
              }}
            />
            <button
              type='button'
              onClick={() => setShow((prev) => !prev)}
              className='absolute top-0 right-0 flex h-full w-10 items-center justify-center text-muted-foreground hover:text-foreground'
              aria-label={show ? 'Sembunyikan password' : 'Tampilkan password'}
            >
              {show ? <EyeOffIcon className='size-4' /> : <EyeIcon className='size-4' />}
            </button>
          </div>
          <FieldError>{passwordError}</FieldError>
        </Field>

        {serverError && !dismissed && (
          <p
            role='alert'
            className='rounded-lg border border-destructive/40 bg-destructive/5 px-3 py-2 text-sm text-destructive'
          >
            {serverError}
          </p>
        )}

        <Field>
          <Button type='submit' disabled={pending}>
            {pending && <Spinner />}
            {pending ? 'Memproses...' : 'Login'}
          </Button>
        </Field>
      </FieldGroup>
    </form>
  );
}
