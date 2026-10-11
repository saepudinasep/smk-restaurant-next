import type { Metadata } from 'next';
import { connection } from 'next/server';

import { AppSidebar } from '@/components/app-sidebar';
import { MenuTable } from '@/components/menu-table';
import { SiteHeader } from '@/components/site-header';
import { SidebarInset, SidebarProvider } from '@/components/ui/sidebar';
import { getMenusPageData } from '@/lib/data/menus';

export const metadata: Metadata = { title: 'Manage Menu' };

export default async function Page() {
  await connection(); // data diambil per request, bukan saat build
  const { menus, soldByMenu } = await getMenusPageData();

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
              <MenuTable initialData={menus} soldByMenu={soldByMenu} />
            </div>
          </div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
