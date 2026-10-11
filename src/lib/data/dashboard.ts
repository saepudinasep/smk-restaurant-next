import { requireRole } from '@/lib/auth-guard';
import { phaseOf, type OrderPhase } from '@/lib/data/history';
import { computeMonthlyStats } from '@/lib/data/stats';
import { dateToUi, paymentToUi, todayInRestaurant } from '@/lib/mappers';
import { prisma } from '@/lib/prisma';

export type RecentOrder = {
  orderId: string;
  memberName: string;
  date: string; // YYYY-MM-DD
  total: number;
  phase: OrderPhase;
};

export type AdminDashboardData = {
  role: 'Admin';
  name: string;
  revenue: number;
  paidOrders: number;
  unpaidOrders: number;
  outstanding: number;
  totalOrders: number;
  memberCount: number;
  activeMembers: number;
  menuCount: number;
  latestYear: number;
  lastMonth: number; // 0-11, bulan terakhir yang punya order terbayar
  monthly: { monthIndex: number; income: number }[]; // Januari sampai lastMonth
  top: { menu: { menuId: number; name: string; photo: string }; qty: number; revenue: number }[];
  recent: RecentOrder[];
};

export type ChefDashboardData = {
  role: 'Chef';
  name: string;
  openOrders: number;
  pendingItems: number;
  pendingPortions: number;
  cookingItems: number;
  cookingPortions: number;
  portionsToCook: number;
  menusToPrep: number;
  queueTotal: number;
  queue: {
    orderId: string;
    memberName: string;
    date: string;
    dishes: string;
    done: number;
    total: number;
    started: boolean;
  }[];
  prep: {
    menuId: number;
    name: string;
    photo: string;
    pending: number;
    cooking: number;
    total: number;
  }[];
};

export type CashierDashboardData = {
  role: 'Cashier';
  name: string;
  unpaidCount: number;
  outstanding: number;
  ready: number;
  myOrders: number;
  myPaid: number;
  myRevenue: number;
  unpaid: {
    orderId: string;
    memberName: string;
    date: string;
    total: number;
    done: number;
    itemCount: number;
  }[];
  myRecent: RecentOrder[];
  paidTotal: number;
  mix: { type: 'Cash' | 'Credit Card' | 'Debit Card'; count: number }[];
};

export type DashboardData = AdminDashboardData | ChefDashboardData | CashierDashboardData;

const sum = (list: number[]) => list.reduce((a, b) => a + b, 0);
const totalOf = (details: { qty: number; price: number }[]) =>
  sum(details.map((d) => d.qty * d.price));

/** Satu alamat /dashboard untuk semua peran; hanya data milik peran yang login yang diambil. */
export async function getDashboardData(): Promise<DashboardData> {
  const me = await requireRole('Admin', 'Chef', 'Cashier');
  const name = me.name ?? '';

  if (me.role === 'Admin') return { role: 'Admin', name, ...(await adminData()) };
  if (me.role === 'Chef') return { role: 'Chef', name, ...(await chefData()) };
  return { role: 'Cashier', name, ...(await cashierData(me.id)) };
}

async function adminData(): Promise<Omit<AdminDashboardData, 'role' | 'name'>> {
  const [stats, memberCount, orderedMembers, menuCount, lines, recentRows] = await Promise.all([
    computeMonthlyStats(),
    prisma.member.count(),
    prisma.headerOrder.groupBy({ by: ['memberId'] }), // member yang pernah memesan
    prisma.menu.count(),
    prisma.detailOrder.findMany({ select: { menuId: true, qty: true, price: true } }),
    prisma.headerOrder.findMany({
      orderBy: { orderCode: 'desc' },
      take: 6,
      include: {
        member: { select: { name: true } },
        details: { select: { qty: true, price: true, status: true } },
      },
    }),
  ]);

  // Pendapatan dan jumlah order dijumlahkan dari ringkasan per bulan
  const revenue = sum(stats.map((s) => s.income));
  const paidOrders = sum(stats.map((s) => s.orders));
  const unpaidOrders = sum(stats.map((s) => s.unpaidOrders));
  const outstanding = sum(stats.map((s) => s.unpaidAmount));

  // Grafik: Januari sampai bulan terakhir yang punya order terbayar, pada tahun terbaru
  const paidMonths = stats.filter((s) => s.orders > 0);
  const latestYear = paidMonths.length
    ? Math.max(...paidMonths.map((s) => s.year))
    : Number(todayInRestaurant().slice(0, 4));
  const lastMonth = Math.max(
    0,
    ...paidMonths.filter((s) => s.year === latestYear).map((s) => s.month),
  );
  const monthly = Array.from({ length: lastMonth + 1 }, (_, monthIndex) => ({
    monthIndex,
    income: stats.find((s) => s.year === latestYear && s.month === monthIndex)?.income ?? 0,
  }));

  // Menu terlaris: jumlah porsi pada semua order
  const sold = new Map<string, { qty: number; revenue: number }>();
  for (const l of lines) {
    const cur = sold.get(l.menuId) ?? { qty: 0, revenue: 0 };
    sold.set(l.menuId, { qty: cur.qty + l.qty, revenue: cur.revenue + l.qty * l.price });
  }
  const topEntries = [...sold.entries()].sort((a, b) => b[1].qty - a[1].qty).slice(0, 5);
  const topMenus = await prisma.menu.findMany({
    where: { id: { in: topEntries.map(([id]) => id) } },
    select: { id: true, menuNumber: true, name: true, photo: true },
  });
  const menuById = new Map(topMenus.map((m) => [m.id, m]));
  const top = topEntries.flatMap(([id, v]) => {
    const m = menuById.get(id);
    return m ? [{ menu: { menuId: m.menuNumber, name: m.name, photo: m.photo }, ...v }] : [];
  });

  const recent: RecentOrder[] = recentRows.map((o) => ({
    orderId: o.orderCode,
    memberName: o.member.name,
    date: dateToUi(o.date),
    total: totalOf(o.details),
    phase: phaseOf(o.payment !== null, o.details),
  }));

  return {
    revenue,
    paidOrders,
    unpaidOrders,
    outstanding,
    totalOrders: paidOrders + unpaidOrders,
    memberCount,
    activeMembers: orderedMembers.length,
    menuCount,
    latestYear,
    lastMonth,
    monthly,
    top,
    recent,
  };
}

async function chefData(): Promise<Omit<ChefDashboardData, 'role' | 'name'>> {
  // Order yang masih punya menu belum diantar, terlama dulu (FIFO)
  const open = await prisma.headerOrder.findMany({
    where: { details: { some: { status: { not: 'Deliver' } } } },
    orderBy: { orderCode: 'asc' },
    include: {
      member: { select: { name: true } },
      details: {
        orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
        include: { menu: { select: { menuNumber: true, name: true, photo: true } } },
      },
    },
  });

  const todo = open.flatMap((o) => o.details).filter((d) => d.status !== 'Deliver');
  const pending = todo.filter((d) => d.status === 'Pending');
  const cooking = todo.filter((d) => d.status === 'Cooking');

  // Daftar siapkan: jumlah porsi per menu yang belum diantar
  const prepMap = new Map<
    number,
    { name: string; photo: string; pending: number; cooking: number }
  >();
  for (const d of todo) {
    const cur = prepMap.get(d.menu.menuNumber) ?? {
      name: d.menu.name,
      photo: d.menu.photo,
      pending: 0,
      cooking: 0,
    };
    if (d.status === 'Pending') cur.pending += d.qty;
    else cur.cooking += d.qty;
    prepMap.set(d.menu.menuNumber, cur);
  }
  const prep = [...prepMap.entries()]
    .map(([menuId, v]) => ({ menuId, ...v, total: v.pending + v.cooking }))
    .sort((a, b) => b.total - a.total)
    .slice(0, 6);

  return {
    openOrders: open.length,
    pendingItems: pending.length,
    pendingPortions: sum(pending.map((d) => d.qty)),
    cookingItems: cooking.length,
    cookingPortions: sum(cooking.map((d) => d.qty)),
    portionsToCook: sum(todo.map((d) => d.qty)),
    menusToPrep: prepMap.size,
    queueTotal: open.length,
    queue: open.slice(0, 5).map((o) => ({
      orderId: o.orderCode,
      memberName: o.member.name,
      date: dateToUi(o.date),
      dishes: o.details.map((d) => `${d.menu.name} ×${d.qty}`).join(', '),
      done: o.details.filter((d) => d.status === 'Deliver').length,
      total: o.details.length,
      started: o.details.some((d) => d.status !== 'Pending'),
    })),
    prep,
  };
}

async function cashierData(
  employeeId: string,
): Promise<Omit<CashierDashboardData, 'role' | 'name'>> {
  const [unpaidRows, mine, mixRows] = await Promise.all([
    prisma.headerOrder.findMany({
      where: { payment: null },
      orderBy: { orderCode: 'asc' }, // terlama dulu
      include: {
        member: { select: { name: true } },
        details: { select: { qty: true, price: true, status: true } },
      },
    }),
    // order yang dibuat kasir yang sedang login
    prisma.headerOrder.findMany({
      where: { employeeId },
      orderBy: { orderCode: 'desc' },
      include: {
        member: { select: { name: true } },
        details: { select: { qty: true, price: true, status: true } },
      },
    }),
    prisma.headerOrder.groupBy({
      by: ['payment'],
      where: { payment: { not: null } },
      _count: { _all: true },
    }),
  ]);

  const unpaidTotals = unpaidRows.map((o) => totalOf(o.details));
  const minePaid = mine.filter((o) => o.payment !== null);
  const myRevenue = sum(minePaid.map((o) => totalOf(o.details)));

  // Komposisi metode pembayaran seluruh order yang sudah dibayar (semua kasir)
  const countOf = (type: 'Cash' | 'CreditCard' | 'DebitCard') =>
    mixRows.find((r) => r.payment === type)?._count._all ?? 0;
  const mix = (['Cash', 'CreditCard', 'DebitCard'] as const).map((t) => ({
    type: paymentToUi[t],
    count: countOf(t),
  }));

  return {
    unpaidCount: unpaidRows.length,
    outstanding: sum(unpaidTotals),
    ready: unpaidRows.filter((o) => phaseOf(false, o.details) === 'awaiting').length,
    myOrders: mine.length,
    myPaid: minePaid.length,
    myRevenue,
    unpaid: unpaidRows.slice(0, 5).map((o, i) => ({
      orderId: o.orderCode,
      memberName: o.member.name,
      date: dateToUi(o.date),
      total: unpaidTotals[i],
      done: o.details.filter((d) => d.status === 'Deliver').length,
      itemCount: o.details.length,
    })),
    myRecent: mine.slice(0, 5).map((o) => ({
      orderId: o.orderCode,
      memberName: o.member.name,
      date: dateToUi(o.date),
      total: totalOf(o.details),
      phase: phaseOf(o.payment !== null, o.details),
    })),
    paidTotal: sum(mix.map((m) => m.count)),
    mix,
  };
}
