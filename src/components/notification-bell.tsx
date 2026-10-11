'use client';

import Link from 'next/link';
import { BellIcon } from 'lucide-react';

import { buttonVariants } from '@/components/ui/button';
import { useUnreadCount } from '@/hooks/use-unread-count';

/** Lonceng di header: menuju halaman Notifications dan menampilkan jumlah yang belum dibaca. */
export function NotificationBell() {
  const count = useUnreadCount();

  return (
    <Link
      href='/notifications'
      className={`${buttonVariants({ variant: 'ghost', size: 'icon' })} relative`}
      aria-label={count > 0 ? `Notifications, ${count} unread` : 'Notifications'}
    >
      <BellIcon />
      {count > 0 && (
        <span
          aria-hidden
          className='absolute top-0.5 right-0.5 flex min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] leading-4 font-medium text-primary-foreground tabular-nums'
        >
          {count > 99 ? '99+' : count}
        </span>
      )}
    </Link>
  );
}
