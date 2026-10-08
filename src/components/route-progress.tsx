'use client';

import * as React from 'react';
import { usePathname } from 'next/navigation';

/**
 * Bar tipis di atas layar yang muncul begitu link internal diklik dan hilang
 * saat halaman tujuan sudah tampil (pathname berubah).
 */
export function RouteProgress() {
  const pathname = usePathname();
  const [started, setStarted] = React.useState<{ from: string; run: number } | null>(null);

  React.useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      const link = (e.target as Element | null)?.closest?.('a');
      if (!link || link.target === '_blank' || link.hasAttribute('download')) return;
      const url = new URL(link.href, window.location.href);
      if (url.origin !== window.location.origin || url.pathname === window.location.pathname) return;
      setStarted({ from: window.location.pathname, run: Date.now() });
    };
    document.addEventListener('click', onClick, true);
    return () => document.removeEventListener('click', onClick, true);
  }, []);

  // aktif selama pathname belum berubah dari saat link diklik
  if (!started || started.from !== pathname) return null;

  return (
    <>
      <style>{`@keyframes route-progress{from{width:0}to{width:85%}}`}</style>
      <div
        key={started.run}
        role='progressbar'
        aria-label='Loading page'
        className='pointer-events-none fixed top-0 left-0 z-[100] h-0.5 bg-primary shadow-[0_0_8px] shadow-primary/50'
        style={{ animation: 'route-progress 8s cubic-bezier(0.1, 0.7, 0.2, 1) forwards' }}
      />
    </>
  );
}
