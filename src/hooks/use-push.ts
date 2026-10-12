'use client';

import * as React from 'react';

import { detectPushStatus, subscribeToPush, unsubscribeFromPush, type PushStatus } from '@/lib/push-client';

/** Keadaan web push di perangkat ini beserta tombol untuk menyalakan/mematikannya. */
export function usePush() {
  const [status, setStatus] = React.useState<PushStatus>('loading');
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState('');

  const refresh = React.useCallback(async () => setStatus(await detectPushStatus()), []);
  React.useEffect(() => {
    void refresh();
  }, [refresh]);

  const run = async (task: () => Promise<{ ok: true } | { ok: false; error: string }>) => {
    setBusy(true);
    setError('');
    const result = await task();
    if (!result.ok) setError(result.error);
    await refresh();
    setBusy(false);
  };

  return {
    status,
    busy,
    error,
    enable: () => run(subscribeToPush),
    disable: () => run(unsubscribeFromPush),
  };
}
