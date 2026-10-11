import type { Metadata } from 'next';
import { connection } from 'next/server';

import { AppSidebar } from '@/components/app-sidebar';
import { ViewOrders } from '@/components/view-orders';
import { SiteHeader } from '@/components/site-header';
import { SidebarInset, SidebarProvider } from '@/components/ui/sidebar';
import { getKitchenPageData } from '@/lib/data/kitchen';

export const metadata: Metadata = { title: 'View Orders' };

export default async function Page() {
  await connection(); // data diambil per request, bukan saat build
  const { orders } = await getKitchenPageData();

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
              <ViewOrders initialOrders={orders} />
            </div>
          </div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
