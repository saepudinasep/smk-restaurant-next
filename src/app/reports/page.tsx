import type { Metadata } from 'next';
import { connection } from 'next/server';

import { AppSidebar } from '@/components/app-sidebar';
import { Report } from '@/components/report';
import { SiteHeader } from '@/components/site-header';
import { SidebarInset, SidebarProvider } from '@/components/ui/sidebar';
import { getReportPageData } from '@/lib/data/reports';

export const metadata: Metadata = { title: 'Report' };

export default async function Page() {
  await connection(); // data diambil per request, bukan saat build
  const { stats, years, defaults } = await getReportPageData();

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
              <Report stats={stats} years={years} defaults={defaults} />
            </div>
          </div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
