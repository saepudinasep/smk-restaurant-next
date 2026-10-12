'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';

import { isRealtimeConfigured } from '@/lib/pusher-client';

/** Dikirim RealtimeProvider setiap ada notifikasi masuk lewat Pusher. */
export const REALTIME_EVENT = 'realtime:notification';

/**
 * Menyegarkan data halaman (router.refresh) saat ada kejadian realtime, saat tab kembali aktif,
 * dan berkala sebagai cadangan (jarang bila Pusher aktif, sering bila tidak). State di browser
 * (pilihan order, pencarian, form) tidak hilang.
 */
export function useLiveRefresh() {
  const router = useRouter();

  React.useEffect(() => {
    const refreshIfVisible = () => {
      if (document.visibilityState === 'visible') router.refresh();
    };
    window.addEventListener(REALTIME_EVENT, refreshIfVisible);
    document.addEventListener('visibilitychange', refreshIfVisible);
    const timer = setInterval(refreshIfVisible, isRealtimeConfigured() ? 60_000 : 15_000);
    return () => {
      window.removeEventListener(REALTIME_EVENT, refreshIfVisible);
      document.removeEventListener('visibilitychange', refreshIfVisible);
      clearInterval(timer);
    };
  }, [router]);
}
