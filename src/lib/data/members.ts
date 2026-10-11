import { requireRole } from '@/lib/auth-guard';
import type { Member } from '@/lib/types';
import { dateToUi } from '@/lib/mappers';
import { prisma } from '@/lib/prisma';

export async function getMembersPageData() {
  await requireRole('Admin');

  const [rows, ordered] = await Promise.all([
    prisma.member.findMany({ orderBy: { memberCode: 'asc' } }),
    // member yang punya minimal satu order (untuk kartu "Active" dan aturan hapus)
    prisma.headerOrder.groupBy({ by: ['memberId'] }),
  ]);

  const members: Member[] = rows.map((m) => ({
    memberId: m.memberCode,
    name: m.name,
    email: m.email,
    handphone: m.handphone,
    joinDate: dateToUi(m.joinDate),
  }));

  const orderedIds = new Set(ordered.map((o) => o.memberId));
  const memberIdsWithOrders = rows.filter((m) => orderedIds.has(m.id)).map((m) => m.memberCode);

  return { members, memberIdsWithOrders };
}
