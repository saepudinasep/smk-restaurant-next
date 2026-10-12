'use client';

import * as React from 'react';

import { REALTIME_EVENT } from '@/hooks/use-live-refresh';
import { isRealtimeConfigured } from '@/lib/pusher-client';

/** Kejadian yang dikirim halaman Notifications setelah membaca/menghapus, supaya lonceng langsung ikut berubah. */
export const NOTIFICATIONS_CHANGED = 'notifications:changed';

/**
 * Jumlah notifikasi belum dibaca. Diperbarui saat ada notifikasi masuk lewat Pusher, saat tab kembali
 * aktif, dan saat halaman Notifications mengubah sesuatu. Tanpa Pusher, diperiksa berkala sebagai cadangan.
 * Hanya mengambil satu angka, jadi sangat ringan.
 */
export function useUnreadCount() {
  const [count, setCount] = React.useState(0);

  React.useEffect(() => {
    let active = true;

    const load = async () => {
      try {
        const res = await fetch('/api/notifications/unread', { cache: 'no-store' });
        if (res.ok && active) setCount(((await res.json()) as { count: number }).count);
      } catch {
        // koneksi sementara putus: pertahankan angka terakhir
      }
    };
    const loadIfVisible = () => {
      if (document.visibilityState === 'visible') void load();
    };

    void load();
    const timer = setInterval(loadIfVisible, isRealtimeConfigured() ? 120_000 : 20_000);
    document.addEventListener('visibilitychange', loadIfVisible);
    window.addEventListener(NOTIFICATIONS_CHANGED, load);
    window.addEventListener(REALTIME_EVENT, load);
    return () => {
      active = false;
      clearInterval(timer);
      document.removeEventListener('visibilitychange', loadIfVisible);
      window.removeEventListener(NOTIFICATIONS_CHANGED, load);
      window.removeEventListener(REALTIME_EVENT, load);
    };
  }, []);

  return count;
}
