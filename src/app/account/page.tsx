import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { connection } from 'next/server';

import { Account } from '@/components/account';
import { AppSidebar } from '@/components/app-sidebar';
import { SiteHeader } from '@/components/site-header';
import { SidebarInset, SidebarProvider } from '@/components/ui/sidebar';
import { ROLES } from '@/lib/access';
import { requireRole } from '@/lib/auth-guard';
import { prisma } from '@/lib/prisma';

export const metadata: Metadata = { title: 'Account' };

export default async function Page() {
  await connection(); // data diambil per request, bukan saat build
  // Semua peran boleh membuka Account, tetapi datanya selalu milik pengguna yang login
  const me = await requireRole(...ROLES);
  const profile = await prisma.employee.findUnique({
    where: { id: me.id },
    select: { employeeCode: true, name: true, email: true, handphone: true, position: true },
  });
  if (!profile) redirect('/login');

  return (
    <SidebarProvider
      style={
        {
          '--sidebar-width': 'calc(var(--spacing) * 72)',
          '--header-height': 'calc(var(--spacing) * 12)',
        } as React.CSSProperties
      }
    >
      <AppSidebar variant='inset' />
      <SidebarInset>
        <SiteHeader />
        <div className='flex flex-1 flex-col'>
          <div className='@container/main flex flex-1 flex-col gap-2'>
            <div className='px-4 py-4 md:py-6 lg:px-6'>
              <Account profile={profile} />
            </div>
          </div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
