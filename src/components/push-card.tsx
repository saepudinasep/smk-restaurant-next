'use client';

import * as React from 'react';
import { BellRingIcon, SendIcon } from 'lucide-react';

import { sendTestPush } from '@/actions/push';
import { ConfirmActionDialog } from '@/components/ui/alert-dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Spinner } from '@/components/ui/spinner';
import { useCurrentUser } from '@/hooks/use-current-user';
import { usePush } from '@/hooks/use-push';
import type { RoleName } from '@/lib/access';

// Contoh kejadian yang dikirim, sesuai peran pengguna
const WHAT_YOU_GET: Record<RoleName, string> = {
  Chef: 'a new order arrives, even while you are cooking',
  Cashier: 'an order is fully delivered and ready to be paid',
  Admin: 'a payment is received',
};

const STATUS_NOTE: Record<string, string> = {
  loading: 'Checking this device...',
  unconfigured: 'Push notifications are not configured on the server yet (VAPID keys are missing).',
  unsupported: 'This browser does not support push notifications.',
  'needs-install':
    'On iPhone and iPad, push notifications only work after you add this app to your Home Screen (Share, then Add to Home Screen) and open it from there.',
  denied: 'Notifications are blocked for this site. Allow them in your browser settings, then reload this page.',
  off: 'Turned off on this device.',
  on: 'Turned on for this device.',
};

export function PushCard({ className }: { className?: string }) {
  const role = useCurrentUser()?.role;
  const { status, busy, error, enable, disable } = usePush();
  const [pendingAction, setPendingAction] = React.useState<'enable' | 'disable' | null>(null);
  const [testing, setTesting] = React.useState(false);
  const [testMessage, setTestMessage] = React.useState('');

  const test = async () => {
    setTesting(true);
    setTestMessage('');
    try {
      const result = await sendTestPush();
      setTestMessage(
        !result.ok
          ? result.error
          : result.sent > 0
            ? `Test sent to ${result.sent} ${result.sent === 1 ? 'device' : 'devices'}. It should appear within a few seconds.`
            : 'No device is registered for your account yet. Turn push notifications on first.',
      );
    } catch {
      setTestMessage('Network error. Please try again.');
    } finally {
      setTesting(false);
    }
  };

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className='flex items-center gap-2'>
          <BellRingIcon className='size-4' />
          Push Notifications
          {status === 'on' && <Badge>On</Badge>}
        </CardTitle>
        <CardDescription>
          Get an alert on this device when
          {role ? ` ${WHAT_YOU_GET[role]}` : ' something needs your attention'}, even when this tab is closed.
        </CardDescription>
      </CardHeader>
      <CardContent className='flex flex-col gap-4'>
        <p className='text-sm text-muted-foreground'>{STATUS_NOTE[status]}</p>

        <div className='flex flex-wrap items-center gap-2'>
          {status === 'off' && (
            <Button disabled={busy} onClick={() => setPendingAction('enable')}>
              {busy && <Spinner />}
              Turn on push notifications
            </Button>
          )}
          {status === 'on' && (
            <>
              <Button variant='outline' disabled={busy} onClick={() => setPendingAction('disable')}>
                {busy && <Spinner />}
                Turn off
              </Button>
              <Button variant='outline' disabled={testing} onClick={test}>
                {testing ? <Spinner /> : <SendIcon />}
                Send a test
              </Button>
            </>
          )}
        </div>

        {error && (
          <p role='alert' className='text-sm text-destructive'>
            {error}
          </p>
        )}
        {testMessage && (
          <p role='status' className='text-sm'>
            {testMessage}
          </p>
        )}
      </CardContent>
      <ConfirmActionDialog
        open={pendingAction !== null}
        onOpenChange={(open) => !open && setPendingAction(null)}
        title={pendingAction === 'enable' ? 'Turn on push notifications?' : 'Turn off push notifications?'}
        description={
          pendingAction === 'enable'
            ? 'Allow this device to receive push notifications for your account? Your browser may ask for notification permission.'
            : 'Stop this device from receiving push notifications for your account?'
        }
        confirmLabel={pendingAction === 'enable' ? 'Turn On' : 'Turn Off'}
        onConfirm={() => {
          if (pendingAction === 'enable') void enable();
          if (pendingAction === 'disable') void disable();
          setPendingAction(null);
        }}
      />
    </Card>
  );
}
