import type { NextAuthConfig } from 'next-auth';

import { ROLE_HOME, canAccess, isProtectedPath } from '@/lib/access';

// Konfigurasi yang AMAN untuk proxy.ts: tanpa Prisma dan bcrypt.
// Provider (Credentials) ditambahkan di auth.ts.
export const authConfig = {
  pages: { signIn: '/login' },
  session: { strategy: 'jwt', maxAge: 60 * 60 * 8 }, // sesi 8 jam
  providers: [],
  callbacks: {
    // Dipanggil proxy.ts pada setiap request halaman.
    authorized({ auth, request: { nextUrl } }) {
      const user = auth?.user;
      const { pathname } = nextUrl;

      // Belum login: hanya /login yang boleh. `false` => redirect ke /login?callbackUrl=...
      if (!user) return pathname === '/login';

      // Sudah login: /login dan / diarahkan ke halaman awal sesuai peran.
      if (pathname === '/login' || pathname === '/') {
        return Response.redirect(new URL(ROLE_HOME[user.role], nextUrl));
      }

      // Halaman aplikasi di luar hak akses peran => kembali ke halaman awal peran itu.
      if (isProtectedPath(pathname) && !canAccess(user.role, pathname)) {
        return Response.redirect(new URL(ROLE_HOME[user.role], nextUrl));
      }
      return true;
    },
    jwt({ token, user }) {
      if (user) {
        token.uid = user.id as string;
        token.role = user.role;
        token.employeeCode = user.employeeCode;
      }
      return token;
    },
    session({ session, token }) {
      session.user.id = token.uid;
      session.user.role = token.role;
      session.user.employeeCode = token.employeeCode;
      return session;
    },
  },
} satisfies NextAuthConfig;
