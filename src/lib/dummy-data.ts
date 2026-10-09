// Data dummy SMK Restaurant — mengikuti ERD & Data Dictionary (LKS SMK XXVI 2018).
// Nama field = camelCase dari kolom di data dictionary, jadi nanti mudah diganti ke API/DB.
// Semua nilai dibuat deterministik (tanpa Math.random / new Date) supaya hasil server & client sama.

// ---------------------------------------------------------------------------
// Tipe
// ---------------------------------------------------------------------------

export type Menu = {
  menuId: number; // INTEGER auto increment
  name: string; // nVARCHAR(50)
  price: number; // INTEGER (Rupiah)
  photo: string; // nVARCHAR(100) — nama file, mis. 'ayamtelurasin.jpg'
};

export type Member = {
  memberId: string; // nchar(8)
  name: string; // nVARCHAR(50)
  email: string; // nVARCHAR(50)
  handphone: string; // nVARCHAR(13)
  joinDate: string; // YYYY-MM-DD
};

export const POSITIONS = ['Admin', 'Chef', 'Cashier'] as const;
export type Position = (typeof POSITIONS)[number];

// Password sengaja tidak ada di sini: form Manage Employee tidak menampilkannya,
// dan login/ganti password nanti ditangani auth, bukan data dummy.
export type Employee = {
  employeeId: string; // nchar(6)
  name: string; // nvarchar(100)
  email: string; // nvarchar(50)
  handphone: string; // nvarchar(13)
  position: Position; // nvarchar(50)
};

export const ITEM_STATUSES = ['Pending', 'Cooking', 'Deliver'] as const;
export type ItemStatus = (typeof ITEM_STATUSES)[number];

/** Tipe pembayaran di form Payment. Nomor kartu tidak disimpan (tidak ada di ERD). */
export const PAYMENT_TYPES = ['Cash', 'Credit Card', 'Debit Card'] as const;
export type PaymentType = (typeof PAYMENT_TYPES)[number];

export const BANKS = ['BNI', 'BCA', 'BRI', 'Mandiri'] as const;
export type Bank = (typeof BANKS)[number];

export type HeaderOrder = {
  orderId: string; // nchar(10): YYYY + MM + urutan 4 digit, mis. 2026010001
  employeeId: string; // FK -> Employee (kasir yang membuat order)
  memberId: string; // FK -> Member
  date: string; // YYYY-MM-DD
  // Di data dictionary kolom ini required, tetapi order dibuat SEBELUM dibayar.
  // Selama belum dibayar nilainya null; terisi saat form Payment disimpan.
  payment: PaymentType | null;
  bank: Bank | null; // null untuk Cash atau belum dibayar
};

export type DetailOrder = {
  detailId: number; // INTEGER auto increment
  orderId: string; // FK -> HeaderOrder
  menuId: number; // FK -> Menu
  qty: number;
  price: number; // harga saat order (snapshot, tidak ikut berubah jika harga menu diubah)
  status: ItemStatus; // VARCHAR(10)
};

// ---------------------------------------------------------------------------
// Master: menu (6 pertama dari wireframe), member, karyawan
// ---------------------------------------------------------------------------

export const menus: Menu[] = [
  ['Kangkung Balacan', 25000, 'kangkungbalacan.jpg'],
  ['Nasi Putih', 5000, 'nasiputih.jpg'],
  ['Gurame Asam Manis', 125000, 'gurameasammanis.jpg'],
  ['Ayam Telur Asin', 90000, 'ayamtelurasin.jpg'],
  ['Cumi Lada Garam', 70000, 'cumiladagaram.jpg'],
  ['Udang Mayonaise', 80000, 'udangmayonaise.jpg'],
  ['Sapi Lada Hitam', 95000, 'sapiladahitam.jpg'],
  ['Capcay Seafood', 45000, 'capcayseafood.jpg'],
  ['Tahu Telur Special', 30000, 'tahutelur.jpg'],
  ['Sop Iga Sapi', 85000, 'sopigasapi.jpg'],
  ['Es Teh Manis', 8000, 'esteh.jpg'],
  ['Jus Alpukat', 20000, 'jusalpukat.jpg'],
].map(([name, price, photo], i) => ({
  menuId: i + 1,
  name: name as string,
  price: price as number,
  photo: photo as string,
}));

export const members: Member[] = [
  ['Andi Wijaya', '2026-01-05'],
  ['Bunga Lestari', '2026-01-12'],
  ['Cahyo Nugroho', '2026-01-20'],
  ['Dewi Anggraini', '2026-02-03'],
  ['Eko Prasetyo', '2026-02-18'],
  ['Fitri Handayani', '2026-03-02'],
  ['Gilang Ramadhan', '2026-03-15'],
  ['Hana Putri', '2026-04-08'],
  ['Indra Kusuma', '2026-05-11'],
  ['Joko Susilo', '2026-06-21'],
  ['Kartika Sari', '2026-07-30'],
  ['Lukman Hakim', '2026-08-14'],
].map(([name, joinDate], i) => ({
  memberId: `M${String(i + 1).padStart(7, '0')}`, // M0000001 (8 karakter)
  name,
  email: `${name.split(' ')[0].toLowerCase()}@mail.com`,
  handphone: `0812000${String(1000 + i + 1)}`,
  joinDate,
}));

export const employees: Employee[] = [
  ['Rina Maharani', 'Admin'],
  ['Hendra Gunawan', 'Chef'],
  ['Sari Melati', 'Chef'],
  ['Doni Saputra', 'Cashier'],
  ['Wulan Safitri', 'Cashier'],
].map(([name, position], i) => ({
  employeeId: `E${String(i + 1).padStart(5, '0')}`, // E00001 (6 karakter)
  name,
  email: `${name.split(' ')[0].toLowerCase()}@smkrestaurant.sch.id`,
  handphone: `0813000${String(2000 + i + 1)}`,
  position: position as Position,
}));

// ---------------------------------------------------------------------------
// Transaksi: dibuat secara deterministik (Jan - Okt 2026)
// ---------------------------------------------------------------------------

// Pseudo-random bergulir dengan seed tetap -> hasil selalu sama di server dan client.
let seed = 2026;
const rand = () => {
  seed = (seed * 1664525 + 1013904223) % 4294967296;
  return seed / 4294967296;
};
const pick = <T>(list: readonly T[]): T => list[Math.floor(rand() * list.length)];

const cashiers = employees.filter((e) => e.position === 'Cashier');
const ORDER_YEAR = 2026;
const ORDERS_PER_MONTH = [6, 7, 5, 8, 6, 7, 9, 6, 8, 7]; // Jan..Okt
const UNPAID_COUNT = 4; // 4 order terakhir (Okt) belum dibayar & masih diproses dapur

export const headerOrders: HeaderOrder[] = [];
export const detailOrders: DetailOrder[] = [];

(() => {
  let detailId = 1;
  const total = ORDERS_PER_MONTH.reduce((a, b) => a + b, 0);
  let created = 0;

  ORDERS_PER_MONTH.forEach((count, monthIndex) => {
    const mm = String(monthIndex + 1).padStart(2, '0');

    for (let seq = 1; seq <= count; seq++) {
      created++;
      const orderId = `${ORDER_YEAR}${mm}${String(seq).padStart(4, '0')}`;
      const unpaid = created > total - UNPAID_COUNT;
      const day = String(1 + Math.floor(rand() * 27)).padStart(2, '0');

      // 1-4 menu berbeda per order
      const itemCount = 1 + Math.floor(rand() * 4);
      const chosen = new Set<number>();
      while (chosen.size < itemCount) chosen.add(pick(menus).menuId);

      const paymentType = pick(PAYMENT_TYPES);
      headerOrders.push({
        orderId,
        employeeId: pick(cashiers).employeeId,
        memberId: pick(members).memberId,
        date: `${ORDER_YEAR}-${mm}-${day}`,
        payment: unpaid ? null : paymentType,
        bank: unpaid || paymentType === 'Cash' ? null : pick(BANKS),
      });

      for (const menuId of chosen) {
        detailOrders.push({
          detailId: detailId++,
          orderId,
          menuId,
          qty: 1 + Math.floor(rand() * 4),
          price: menus.find((m) => m.menuId === menuId)!.price,
          // order lama: semua sudah diantar; order belum dibayar: status bercampur
          status: unpaid ? pick(ITEM_STATUSES) : 'Deliver',
        });
      }
    }
  });
})();

// ---------------------------------------------------------------------------
// Helper (pengganti query; nanti diganti pemanggilan database)
// ---------------------------------------------------------------------------

export const getMenu = (id: number) => menus.find((m) => m.menuId === id)!;
export const getMember = (id: string) => members.find((m) => m.memberId === id)!;
export const getEmployee = (id: string) => employees.find((e) => e.employeeId === id)!;

export const detailsOf = (orderId: string) => detailOrders.filter((d) => d.orderId === orderId);
export const orderTotal = (orderId: string) =>
  detailsOf(orderId).reduce((sum, d) => sum + d.qty * d.price, 0);

export const isPaid = (h: HeaderOrder) => h.payment !== null;
export const isKitchenDone = (orderId: string) =>
  detailsOf(orderId).every((d) => d.status === 'Deliver');

/** Posisi sebuah order: sudah dibayar, menunggu dibayar (dapur selesai), atau masih di dapur. */
export type OrderPhase = 'paid' | 'awaiting' | 'kitchen';
export const orderPhase = (h: HeaderOrder): OrderPhase =>
  isPaid(h) ? 'paid' : isKitchenDone(h.orderId) ? 'awaiting' : 'kitchen';

/** Form View Order (chef): order yang masih ada menu belum 'Deliver'. */
export const openKitchenOrders = () => headerOrders.filter((h) => !isKitchenDone(h.orderId));
/** Form Payment (kasir): order yang belum dibayar. */
export const unpaidOrders = () => headerOrders.filter((h) => !isPaid(h));

/** ID berikutnya, mengikuti aturan format di data dictionary. */
export function nextMemberId(list: Member[] = members) {
  const max = Math.max(0, ...list.map((m) => Number(m.memberId.slice(1))));
  return `M${String(max + 1).padStart(7, '0')}`;
}
export function nextEmployeeId(list: Employee[] = employees) {
  const max = Math.max(0, ...list.map((e) => Number(e.employeeId.slice(1))));
  return `E${String(max + 1).padStart(5, '0')}`;
}
export function nextMenuId(list: Menu[] = menus) {
  return Math.max(0, ...list.map((m) => m.menuId)) + 1;
}
/** OrderID = tahun + bulan + urutan 4 digit pada bulan itu, mis. 2026100008. `date` = YYYY-MM-DD. */
export function nextOrderId(date: string, list: HeaderOrder[] = headerOrders) {
  const prefix = date.slice(0, 7).replace('-', '');
  const max = Math.max(
    0,
    ...list.filter((h) => h.orderId.startsWith(prefix)).map((h) => Number(h.orderId.slice(6))),
  );
  return `${prefix}${String(max + 1).padStart(4, '0')}`;
}

/**
 * Pengganti INSERT headerorder + detailorder untuk tahap UI. Data hanya hidup di memori browser
 * (hilang saat refresh), tetapi tetap terlihat di halaman lain selama berpindah lewat link.
 * Order baru berstatus 'Pending' dan belum dibayar.
 */
export function addOrder(
  header: HeaderOrder,
  items: { menuId: number; qty: number; price: number }[],
) {
  headerOrders.push(header);
  let detailId = Math.max(0, ...detailOrders.map((d) => d.detailId)) + 1;
  for (const item of items) {
    detailOrders.push({
      detailId: detailId++,
      orderId: header.orderId,
      ...item,
      status: 'Pending',
    });
  }
}

/** Pengganti UPDATE detailorder SET status (dipakai halaman View Orders). Hanya hidup di memori browser. */
export function setDetailStatus(detailId: number, status: ItemStatus) {
  const detail = detailOrders.find((d) => d.detailId === detailId);
  if (detail) detail.status = status;
}

/** Pengganti UPDATE headerorder SET payment, bank (dipakai halaman Payments). Hanya hidup di memori browser. */
export function setPayment(orderId: string, payment: PaymentType, bank: Bank | null) {
  const header = headerOrders.find((h) => h.orderId === orderId);
  if (header) {
    header.payment = payment;
    header.bank = bank;
  }
}

// ---------------------------------------------------------------------------
// Report: pendapatan per bulan (hanya order yang sudah dibayar)
// ---------------------------------------------------------------------------

export const MONTHS = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
] as const;

/** Pendapatan & jumlah order (yang sudah dibayar) per bulan, dari bulan `from` sampai `to` (indeks 0-11). */
export function incomeByMonth(from: number, to: number, year: number = ORDER_YEAR) {
  const [start, end] = from <= to ? [from, to] : [to, from];
  return MONTHS.slice(start, end + 1).map((month, i) => {
    const mm = String(start + i + 1).padStart(2, '0');
    const paid = headerOrders.filter((h) => isPaid(h) && h.date.startsWith(`${year}-${mm}`));
    return {
      month,
      income: paid.reduce((sum, h) => sum + orderTotal(h.orderId), 0),
      orders: paid.length,
    };
  });
}

/** Ringkasan untuk kartu dashboard. */
export const dashboardStats = (() => {
  const paid = headerOrders.filter(isPaid);
  return {
    totalIncome: paid.reduce((s, h) => s + orderTotal(h.orderId), 0),
    totalOrders: headerOrders.length,
    unpaidOrders: headerOrders.length - paid.length,
    totalMembers: members.length,
    totalMenus: menus.length,
    totalEmployees: employees.length,
  };
})();

// ---------------------------------------------------------------------------
// Format tampilan — manual (tanpa Intl/zona waktu) supaya server & client selalu sama
// ---------------------------------------------------------------------------

/** 385000 -> 'Rp 385.000' */
export const formatRupiah = (n: number) => `Rp ${String(n).replace(/\B(?=(\d{3})+(?!\d))/g, '.')}`;

const shortMonths = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
];
/** '2026-10-06' -> '6 Oct 2026' */
export function formatDate(iso: string) {
  const [y, m, d] = iso.split('-').map(Number);
  return `${d} ${shortMonths[m - 1]} ${y}`;
}

/** Tanggal hari ini (zona waktu perangkat) dalam YYYY-MM-DD. Hanya panggil dari event handler, bukan saat render. */
export function localToday() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/** 2300000 -> '2,3 jt' (untuk sumbu & label chart "Income in Million"). */
export const formatMillion = (n: number) =>
  `${String(Math.round(n / 100000) / 10).replace('.', ',')} jt`;
