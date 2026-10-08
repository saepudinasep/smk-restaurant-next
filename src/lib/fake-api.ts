import * as React from 'react';

// ---------------------------------------------------------------------------
// Simulasi latensi jaringan untuk data dummy supaya loading state terlihat.
// Saat backend/API sudah ada: hapus file ini, ganti `useFakeLoad` dengan
// isLoading dari SWR / TanStack Query / fetch Anda, dan `await wait()` dengan
// pemanggilan API yang sebenarnya (await fetch(...)).
// ---------------------------------------------------------------------------

export const FAKE_LATENCY = { read: 600, write: 800 };

export const wait = (ms: number = FAKE_LATENCY.write) =>
  new Promise<void>((resolve) => setTimeout(resolve, ms));

/**
 * Mengembalikan `true` selama "membaca data". Muncul saat pertama render dan
 * setiap kali `key` berubah (misal pilihan kelas/hari berganti).
 */
export function useFakeLoad(key: string = '', ms: number = FAKE_LATENCY.read) {
  const [loadedKey, setLoadedKey] = React.useState<string | null>(null);

  React.useEffect(() => {
    const timer = setTimeout(() => setLoadedKey(key), ms);
    return () => clearTimeout(timer);
  }, [key, ms]);

  return loadedKey !== key;
}
