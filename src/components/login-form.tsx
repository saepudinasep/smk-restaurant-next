'use client';
import * as React from 'react';

import { cn } from 'cn';

import { Button } from '@/components/ui/button';
import { Field, FieldGroup, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { EyeIcon, EyeOffIcon } from 'lucide-react';

export function LoginForm({ className, ...props }: React.ComponentProps<'form'>) {
  const [show, setShow] = React.useState(false);
  return (
    <form className={cn('flex flex-col gap-6', className)} {...props}>
      <FieldGroup>
        <div className='flex flex-col items-center gap-1 text-center'>
          <h1 className='text-2xl font-bold'>SMK Restaurant</h1>{' '}
          <p className='text-sm text-balance text-muted-foreground'>
            {' '}
            Masukkan Username dan Password untuk masuk ke Sistem Informasi Akademik SMK
            Restaurant.{' '}
          </p>{' '}
        </div>
        <Field>
          <FieldLabel htmlFor='username'>Username</FieldLabel>
          <Input id='username' type='text' placeholder='Masukkan username' required />
        </Field>
        <Field>
          {' '}
          <div className='flex items-center'>
            {' '}
            <FieldLabel htmlFor='password'>Password</FieldLabel>{' '}
            <a
              href='/forgot-password'
              className='ml-auto text-sm underline-offset-4 hover:underline'
            >
              {' '}
              Lupa Password?{' '}
            </a>{' '}
          </div>{' '}
          <div className='relative'>
            {' '}
            <Input
              id='password'
              name='password'
              type={show ? 'text' : 'password'}
              placeholder='Masukkan Password'
              autoComplete='current-password'
              required
              maxLength={72}
              className='pr-10'
            />{' '}
            <button
              type='button'
              onClick={() => setShow((prev) => !prev)}
              className='absolute right-0 top-0 flex h-full w-10 items-center justify-center text-muted-foreground hover:text-foreground'
              aria-label={show ? 'Sembunyikan password' : 'Tampilkan password'}
            >
              {' '}
              {show ? <EyeOffIcon className='size-4' /> : <EyeIcon className='size-4' />}{' '}
            </button>{' '}
          </div>{' '}
        </Field>{' '}
        <Field>
          <Button type='submit'>Login</Button>
        </Field>
      </FieldGroup>
    </form>
  );
}
