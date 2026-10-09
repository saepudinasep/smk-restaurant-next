// Aturan akses per peran. File ini murni (tanpa Prisma/bcrypt) sehingga aman dipakai
// di proxy.ts, di server, maupun di komponen client (mis. untuk menyaring menu sidebar).

// Nilainya sama persis dengan kolom Position di Msemployee (huruf besar-kecil harus cocok).
export const ROLES = ['Admin', 'Chef', 'Cashier'] as const;
export type RoleName = (typeof ROLES)[number];

/** Halaman awal setelah login. */
export const ROLE_HOME: Record<RoleName, string> = {
  Admin: '/dashboard',
  Chef: '/view-orders',
  Cashier: '/orders',
};

const COMMON = ['/account', '/notifications'];

// Awalan path yang boleh dibuka tiap peran.
// Admin / Chef / Cashier mengikuti Navigation Form di soal; Dashboard, Orders dan Reports tidak
// disebut di soal sehingga penempatannya adalah asumsi (Dashboard & Reports: Admin, Orders: Cashier).
const ACCESS: Record<RoleName, string[]> = {
  Admin: ['/dashboard', '/manage-employee', '/manage-menu', '/manage-member', '/reports', ...COMMON],
  Chef: ['/view-orders', ...COMMON],
  Cashier: ['/orders', '/payments', ...COMMON],
};

export function canAccess(role: RoleName | undefined, pathname: string): boolean {
  if (!role) return false;
  return ACCESS[role].some((p) => pathname === p || pathname.startsWith(`${p}/`));
}

/** Menyaring daftar menu sidebar sesuai peran. Item harus punya properti `url`. */
export function filterNavByRole<T extends { url: string }>(role: RoleName | undefined, items: T[]): T[] {
  return items.filter((item) => canAccess(role, item.url));
}
