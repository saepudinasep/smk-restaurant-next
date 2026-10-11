// Aturan akses per peran. File ini murni (tanpa Prisma/bcrypt) sehingga aman dipakai
// di proxy.ts, di server, maupun di komponen client (mis. untuk menyaring menu sidebar).

// Nilainya sama persis dengan kolom Position di Msemployee (huruf besar-kecil harus cocok).
export const ROLES = ['Admin', 'Chef', 'Cashier'] as const;
export type RoleName = (typeof ROLES)[number];

/** Halaman awal setelah login. */
// Semua peran mendarat di /dashboard; isinya berbeda per peran (lihat DashboardView).
export const ROLE_HOME: Record<RoleName, string> = {
  Admin: '/dashboard',
  Chef: '/dashboard',
  Cashier: '/dashboard',
};

const COMMON = ['/dashboard', '/account', '/notifications'];

// Awalan path yang boleh dibuka tiap peran.
// Admin / Chef / Cashier mengikuti Navigation Form di soal; Dashboard, Orders dan Reports tidak
// disebut di soal sehingga penempatannya adalah asumsi (Reports: Admin, Orders: Cashier, Order History: Admin & Cashier). Dashboard terbuka untuk semua peran.
const ACCESS: Record<RoleName, string[]> = {
  Admin: [
    '/manage-employee',
    '/manage-menu',
    '/manage-member',
    '/order-history',
    '/reports',
    ...COMMON,
  ],
  Chef: ['/view-orders', ...COMMON],
  Cashier: ['/orders', '/payments', '/order-history', ...COMMON],
};

export function canAccess(role: RoleName | undefined, pathname: string): boolean {
  if (!role) return false;
  return ACCESS[role].some((p) => pathname === p || pathname.startsWith(`${p}/`));
}

/** Menyaring daftar menu sidebar sesuai peran. Item harus punya properti `url`. */
export function filterNavByRole<T extends { url: string }>(
  role: RoleName | undefined,
  items: T[],
): T[] {
  return items.filter((item) => canAccess(role, item.url));
}

const ALL_PROTECTED = [...new Set(Object.values(ACCESS).flat())];

/** Apakah path ini bagian dari aplikasi yang dijaga? Path lain (mis. 404) dibiarkan lewat. */
export function isProtectedPath(pathname: string): boolean {
  return ALL_PROTECTED.some((p) => pathname === p || pathname.startsWith(`${p}/`));
}

/**
 * Mengubah callbackUrl menjadi path internal yang aman. Auth.js mengirimnya sebagai URL absolut
 * (mis. http://localhost:3000/dashboard); yang diambil hanya path + query-nya, host DIABAIKAN,
 * jadi tidak mungkin diarahkan ke situs luar (open redirect).
 */
export function safeRedirect(value: string | null | undefined): string {
  if (!value) return '/';
  let path = value;
  if (/^https?:\/\//i.test(value)) {
    try {
      const url = new URL(value);
      path = url.pathname + url.search;
    } catch {
      return '/';
    }
  }
  if (
    !path.startsWith('/') ||
    path.startsWith('//') ||
    path.startsWith('/\\') ||
    path.startsWith('/login')
  )
    return '/';
  return path;
}
