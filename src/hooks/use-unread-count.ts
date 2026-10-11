'use client';

import * as React from 'react';

/** Kejadian yang dikirim halaman Notifications setelah membaca/menghapus, supaya lonceng langsung ikut berubah. */
export const NOTIFICATIONS_CHANGED = 'notifications:changed';

/**
 * Jumlah notifikasi belum dibaca. Diperiksa tiap `intervalMs` selama tab terlihat, saat tab kembali
 * aktif, dan saat halaman Notifications mengubah sesuatu. Hanya mengambil satu angka, jadi sangat ringan.
 */
export function useUnreadCount(intervalMs = 20_000) {
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
    const timer = setInterval(loadIfVisible, intervalMs);
    document.addEventListener('visibilitychange', loadIfVisible);
    window.addEventListener(NOTIFICATIONS_CHANGED, load);
    return () => {
      active = false;
      clearInterval(timer);
      document.removeEventListener('visibilitychange', loadIfVisible);
      window.removeEventListener(NOTIFICATIONS_CHANGED, load);
    };
  }, [intervalMs]);

  return count;
}
