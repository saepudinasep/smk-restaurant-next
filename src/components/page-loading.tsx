import { Spinner } from '@/components/ui/spinner';

/** Spinner di tengah area konten (dipakai oleh app/loading.tsx saat pindah halaman). */
export function PageSpinner({ label = 'Loading...' }: { label?: string }) {
  return (
    <div className='flex min-h-[60vh] flex-1 items-center justify-center gap-3 text-sm text-muted-foreground'>
      <Spinner className='size-6' />
      {label}
    </div>
  );
}
