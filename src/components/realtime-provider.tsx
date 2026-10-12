'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';

import { Toaster } from '@/components/ui/sonner';
import { REALTIME_EVENT } from '@/hooks/use-live-refresh';
import { useCurrentUser } from '@/hooks/use-current-user';
import { ensurePushSubscription } from '@/lib/push-client';
import { getPusherClient } from '@/lib/pusher-client';
import { NOTIFICATION_EVENT, userChannel, type RealtimePayload } from '@/lib/pusher-shared';

/**
 * Dipasang SEKALI di app/layout.tsx (di dalam SessionProvider).
 *  - Berlangganan kanal pribadi Pusher pengguna yang login. Setiap notifikasi masuk memicu toast (bila tab
 *    sedang dilihat) dan memberi tahu lonceng serta halaman yang terbuka agar menyegarkan datanya.
 *  - Mendaftarkan ulang perangkat untuk web push bila izin sudah pernah diberikan.
 *  - Memuat <Toaster /> untuk toast tersebut.
 */
export function RealtimeProvider() {
  const router = useRouter();
  const userId = useCurrentUser()?.id;

  React.useEffect(() => {
    if (!userId) return;
    void ensurePushSubscription(userId);

    const pusher = getPusherClient();
    if (!pusher) return; // belum dikonfigurasi: halaman memakai pemeriksaan berkala

    const channel = pusher.subscribe(userChannel(userId));
    const onNotification = (payload: RealtimePayload) => {
      window.dispatchEvent(new CustomEvent(REALTIME_EVENT, { detail: payload }));
      // Tab sedang dilihat: tampilkan toast. Tab di latar belakang sudah mendapat web push dari server.
      if (document.visibilityState === 'visible') {
        const { url } = payload;
        toast(payload.title, {
          description: payload.message,
          action: url ? { label: 'Open', onClick: () => router.push(url) } : undefined,
        });
      }
    };
    channel.bind(NOTIFICATION_EVENT, onNotification);

    return () => {
      channel.unbind(NOTIFICATION_EVENT, onNotification);
      pusher.unsubscribe(userChannel(userId));
    };
  }, [userId, router]);

  return <Toaster />;
}
