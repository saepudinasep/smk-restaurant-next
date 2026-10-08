import { PageSpinner } from '@/components/page-loading';
import { PortalShell } from '@/components/portal-shell';

// Tampil otomatis oleh Next.js saat berpindah halaman / halaman sedang dimuat.
export default function Loading() {
  return (
    <PortalShell>
      <PageSpinner />
    </PortalShell>
  );
}
