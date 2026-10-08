import { PageSpinner } from '@/components/page-loading';
import { PortalShell } from '@/components/portal-shell';

// Dipakai oleh loading.tsx di setiap folder halaman portal (bukan di /login).
export default function PortalLoading() {
  return (
    <PortalShell>
      <PageSpinner />
    </PortalShell>
  );
}
