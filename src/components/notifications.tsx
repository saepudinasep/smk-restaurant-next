'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import {
  BanknoteIcon,
  BellIcon,
  CheckCheckIcon,
  CheckIcon,
  ChefHatIcon,
  InfoIcon,
  MailOpenIcon,
  ReceiptTextIcon,
  ShieldCheckIcon,
  Trash2Icon,
  type LucideIcon,
} from 'lucide-react';

import {
  deleteNotification,
  markAllNotificationsRead,
  setNotificationRead,
} from '@/actions/notifications';
import type { ActionResult } from '@/actions/result';
import { StatCards } from '@/components/stat-cards';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Spinner } from '@/components/ui/spinner';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { NOTIFICATIONS_CHANGED } from '@/hooks/use-unread-count';
import { formatDateTime, type AppNotification, type NotificationType } from '@/lib/notifications';

const typeIcon: Record<NotificationType, LucideIcon> = {
  order: ReceiptTextIcon,
  kitchen: ChefHatIcon,
  payment: BanknoteIcon,
  account: ShieldCheckIcon,
  system: InfoIcon,
};

// Jenis yang dianggap aktivitas pesanan, untuk kartu ringkasan ketiga
const ORDER_ACTIVITY: NotificationType[] = ['order', 'kitchen', 'payment'];

// Daftar diperbarui otomatis supaya notifikasi baru muncul tanpa muat ulang halaman.
const REFRESH_MS = 15_000;

type Filter = 'all' | 'unread';

export function Notifications({
  initialNotifications,
}: {
  initialNotifications: AppNotification[];
}) {
  const router = useRouter();

  // Data datang dari server (props). Setelah Server Action memanggil revalidatePath,
  // Next.js mengirim props baru sehingga daftar dan kartu ikut ter-update.
  const items = initialNotifications;

  const [filter, setFilter] = React.useState<Filter>('all');
  const [busy, setBusy] = React.useState<{ id: string; action: 'read' | 'delete' } | null>(null);
  const [markingAll, setMarkingAll] = React.useState(false);
  const [error, setError] = React.useState('');

  // Muat ulang data berkala selama tab terlihat; filter yang dipilih tidak hilang
  React.useEffect(() => {
    const id = setInterval(() => {
      if (document.visibilityState === 'visible') router.refresh();
    }, REFRESH_MS);
    return () => clearInterval(id);
  }, [router]);

  /** Menjalankan aksi, lalu memberi tahu lonceng di header agar angkanya langsung ikut berubah. */
  const run = async (task: () => Promise<ActionResult>) => {
    setError('');
    try {
      const result = await task();
      if (!result.ok) setError(result.error);
      else window.dispatchEvent(new Event(NOTIFICATIONS_CHANGED));
    } catch {
      setError('Network error. Please try again.');
    }
  };

  const toggleRead = async (n: AppNotification) => {
    setBusy({ id: n.id, action: 'read' });
    await run(() => setNotificationRead(n.id, !n.read));
    setBusy(null);
  };
  const remove = async (id: string) => {
    setBusy({ id, action: 'delete' });
    await run(() => deleteNotification(id));
    setBusy(null);
  };
  const markAllRead = async () => {
    setMarkingAll(true);
    await run(() => markAllNotificationsRead());
    setMarkingAll(false);
  };

  const total = items.length;
  const unread = items.filter((n) => !n.read).length;
  const activity = items.filter((n) => ORDER_ACTIVITY.includes(n.type));
  const visible = filter === 'unread' ? items.filter((n) => !n.read) : items;

  return (
    <div className='flex flex-col gap-3 md:gap-3'>
      <StatCards
        items={[
          {
            label: 'All Notifications',
            value: total,
            icon: BellIcon,
            badge: 'Inbox',
            title: 'Notifications received',
            note: 'Newest first',
          },
          {
            label: 'Unread',
            value: unread,
            icon: MailOpenIcon,
            badge: total ? `${Math.round((unread / total) * 100)}%` : '0%',
            title: unread === 0 ? 'You are all caught up' : 'Waiting for you',
            note: 'Use the check button to mark one as read',
          },
          {
            label: 'Order Activity',
            value: activity.length,
            icon: ReceiptTextIcon,
            badge: `${activity.filter((n) => !n.read).length} unread`,
            title: 'Orders, kitchen and payments',
            note: 'New orders, ready dishes and payments',
          },
        ]}
      />

      <div className='flex flex-wrap items-center justify-between gap-3'>
        <Tabs value={filter} onValueChange={(v) => setFilter(v as Filter)}>
          <TabsList>
            <TabsTrigger value='all'>All ({total})</TabsTrigger>
            <TabsTrigger value='unread'>Unread ({unread})</TabsTrigger>
          </TabsList>
        </Tabs>
        <Button variant='outline' disabled={unread === 0 || markingAll} onClick={markAllRead}>
          {markingAll ? <Spinner /> : <CheckCheckIcon />}
          Mark all as read
        </Button>
      </div>

      {error && (
        <p role='alert' className='text-sm text-destructive'>
          {error}
        </p>
      )}

      <Card>
        <CardContent className='p-0'>
          {visible.length === 0 ? (
            <div className='flex h-40 flex-col items-center justify-center gap-2 text-sm text-muted-foreground'>
              <BellIcon className='size-6' />
              {filter === 'unread' ? 'No unread notifications.' : 'No notifications yet.'}
            </div>
          ) : (
            <ul className='divide-y'>
              {visible.map((n) => {
                const Icon = typeIcon[n.type];
                const isBusy = busy?.id === n.id;
                return (
                  <li
                    key={n.id}
                    className={`flex items-start gap-3 px-4 py-3 ${n.read ? '' : 'bg-muted/40'}`}
                  >
                    <div className='mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-lg border bg-background'>
                      <Icon className='size-4' />
                    </div>
                    <div className='min-w-0 flex-1'>
                      <div className='flex items-center gap-2'>
                        {!n.read && (
                          <span
                            className='size-2 shrink-0 rounded-full bg-primary'
                            aria-label='Unread'
                          />
                        )}
                        <p
                          className={`truncate text-sm ${n.read ? 'font-normal' : 'font-semibold'}`}
                        >
                          {n.title}
                        </p>
                      </div>
                      <p className='text-sm text-muted-foreground'>{n.message}</p>
                      <p className='mt-1 text-xs text-muted-foreground tabular-nums'>
                        {formatDateTime(n.date, n.time)}
                      </p>
                    </div>
                    <div className='flex shrink-0 gap-1'>
                      <Button
                        variant='ghost'
                        size='icon-sm'
                        disabled={isBusy}
                        onClick={() => toggleRead(n)}
                        aria-label={n.read ? 'Mark as unread' : 'Mark as read'}
                        title={n.read ? 'Mark as unread' : 'Mark as read'}
                      >
                        {isBusy && busy.action === 'read' ? (
                          <Spinner />
                        ) : n.read ? (
                          <MailOpenIcon />
                        ) : (
                          <CheckIcon />
                        )}
                      </Button>
                      <Button
                        variant='ghost'
                        size='icon-sm'
                        disabled={isBusy}
                        onClick={() => remove(n.id)}
                        aria-label='Delete notification'
                        title='Delete'
                      >
                        {isBusy && busy.action === 'delete' ? <Spinner /> : <Trash2Icon />}
                      </Button>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
