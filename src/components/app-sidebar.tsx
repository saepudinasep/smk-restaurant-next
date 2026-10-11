'use client';

import * as React from 'react';
import Link from 'next/link';

import { NavMain } from '@/components/nav-main';
import { NavUser } from '@/components/nav-user';
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from '@/components/ui/sidebar';
import { CommandIcon } from 'lucide-react';
import { navMain } from '@/config/nav';
import { ROLE_HOME, filterNavByRole, type RoleName } from '@/lib/access';
import { useCurrentUser } from '@/hooks/use-current-user';

// Peran & identitas diambil dari sesi login (Auth.js). Prop `role` hanya untuk menimpa saat uji.
export function AppSidebar({
  role: roleOverride,
  ...props
}: React.ComponentProps<typeof Sidebar> & { role?: RoleName }) {
  const me = useCurrentUser();
  const role = roleOverride ?? me?.role;
  const items = filterNavByRole(role, navMain);
  return (
    <Sidebar collapsible='offcanvas' {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              className='data-[slot=sidebar-menu-button]:p-1.5!'
              render={<Link href={role ? ROLE_HOME[role] : '/'} />}
            >
              <CommandIcon className='size-5!' />
              <span className='text-base font-semibold'>SMK Restaurant</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <NavMain items={items.map(({ icon: Icon, ...item }) => ({ ...item, icon: <Icon /> }))} />
      </SidebarContent>
      <SidebarFooter>
        <NavUser user={{ name: me?.name ?? '', email: me?.email ?? '', avatar: '' }} />
      </SidebarFooter>
    </Sidebar>
  );
}
