'use client';

import * as React from 'react';

import { AdminDashboard } from '@/components/dashboard-admin';
import { CashierDashboard } from '@/components/dashboard-cashier';
import { ChefDashboard } from '@/components/dashboard-chef';
import { Badge } from '@/components/ui/badge';
import type { RoleName } from '@/lib/access';
import type { DashboardData } from '@/lib/data/dashboard';

const SUBTITLE: Record<RoleName, string> = {
  Admin: 'Here is how the restaurant is doing.',
  Chef: 'Here is what the kitchen has to cook.',
  Cashier: 'Here is what needs your attention at the counter.',
};

/**
 * Satu alamat /dashboard untuk semua peran. Server (getDashboardData) hanya mengambil data milik
 * peran yang sedang login, jadi `data.role` menentukan tampilan yang dirender.
 */
export function DashboardView({ data }: { data: DashboardData }) {
  const firstName = data.name.split(' ')[0];

  return (
    <div className='flex flex-col gap-4'>
      <div className='flex flex-wrap items-center gap-x-3 gap-y-1'>
        <h2 className='text-lg font-semibold'>Welcome back, {firstName}</h2>
        <Badge variant='outline'>{data.role}</Badge>
        <p className='w-full text-sm text-muted-foreground'>{SUBTITLE[data.role]}</p>
      </div>

      {data.role === 'Admin' && <AdminDashboard data={data} />}
      {data.role === 'Chef' && <ChefDashboard data={data} />}
      {data.role === 'Cashier' && <CashierDashboard data={data} />}
    </div>
  );
}
