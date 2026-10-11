import { requireRole } from '@/lib/auth-guard';
import type { Menu } from '@/lib/types';
import { prisma } from '@/lib/prisma';

export type OrderMember = { memberId: string; name: string };

export async function getOrderPageData() {
  const me = await requireRole('Cashier');

  const [menuRows, memberRows] = await Promise.all([
    prisma.menu.findMany({ orderBy: { menuNumber: 'asc' } }),
    prisma.member.findMany({
      orderBy: { memberCode: 'asc' },
      select: { memberCode: true, name: true },
    }),
  ]);

  const menus: Menu[] = menuRows.map((m) => ({
    menuId: m.menuNumber,
    name: m.name,
    price: m.price,
    photo: m.photo,
  }));
  const members: OrderMember[] = memberRows.map((m) => ({ memberId: m.memberCode, name: m.name }));

  return { menus, members, cashierName: me.name ?? '' };
}
