import type { Metadata } from 'next';
import Image from 'next/image';

import { LoginForm } from '@/components/login-form';
import { safeRedirect } from '@/lib/access';

export const metadata: Metadata = { title: 'Login' };

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ callbackUrl?: string }>;
}) {
  // proxy.ts mengirim ?callbackUrl=<halaman yang tadi dituju>; hanya path internal yang diterima
  const { callbackUrl } = await searchParams;

  return (
    <div className='grid min-h-svh lg:grid-cols-2'>
      <div className='flex flex-col gap-4 p-6 md:p-10'>
        <div className='flex flex-1 items-center justify-center'>
          <div className='w-full max-w-xs'>
            <LoginForm callbackUrl={safeRedirect(callbackUrl)} />
          </div>
        </div>
      </div>
      <div className='relative hidden bg-muted lg:block'>
        <Image
          src='/assets/images/login.jpeg'
          width={500}
          height={500}
          alt='SMK Restaurant'
          priority
          className='absolute inset-0 h-full w-full object-cover dark:brightness-[0.2] dark:grayscale'
        />
      </div>
    </div>
  );
}
