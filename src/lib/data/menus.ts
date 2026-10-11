import { requireRole } from '@/lib/auth-guard';
import type { Menu } from '@/lib/types';
import { prisma } from '@/lib/prisma';

export async function getMenusPageData() {
  await requireRole('Admin');

  const [rows, sales] = await Promise.all([
    prisma.menu.findMany({ orderBy: { menuNumber: 'asc' } }),
    // jumlah porsi terjual per menu (untuk kartu Best Seller)
    prisma.detailOrder.groupBy({ by: ['menuId'], _sum: { qty: true } }),
  ]);

  const menus: Menu[] = rows.map((m) => ({
    menuId: m.menuNumber,
    name: m.name,
    price: m.price,
    category: m.category,
    photo: m.photo,
  }));

  const numberOf = new Map(rows.map((m) => [m.id, m.menuNumber]));
  const soldByMenu: Record<number, number> = {};
  for (const s of sales) {
    const n = numberOf.get(s.menuId);
    if (n !== undefined) soldByMenu[n] = s._sum.qty ?? 0;
  }

  return { menus, soldByMenu };
}
