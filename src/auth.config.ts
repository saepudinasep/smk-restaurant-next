import type { NextAuthConfig } from 'next-auth';

import { ROLE_HOME, canAccess, isProtectedPath } from '@/lib/access';
import { getArcjet } from '@/lib/arcjet';

// Konfigurasi yang AMAN untuk proxy.ts: tanpa Prisma dan bcrypt.
// Provider (Credentials) ditambahkan di auth.ts.
export const authConfig = {
  pages: { signIn: '/login' },
  session: { strategy: 'jwt', maxAge: 60 * 60 * 8 }, // sesi 8 jam
  providers: [],
  callbacks: {
    // Dipanggil proxy.ts pada setiap request halaman dan API.
    async authorized({ auth, request }) {
      const decision = await getArcjet().protect(request);
      const pathname = request.nextUrl.pathname;

      console.info(
        JSON.stringify({
          event: 'route_access',
          method: request.method,
          path: pathname,
          decision: decision.conclusion,
        }),
      );

      if (decision.isDenied()) {
        return Response.json({ error: 'Forbidden' }, { status: 403 });
      }

      // API routes tidak menggunakan proteksi sesi dari proxy.
      if (pathname.startsWith('/api/')) return true;

      const user = auth?.user;

      // Belum login: hanya /login yang boleh. `false` => redirect ke /login?callbackUrl=...
      if (!user) return pathname === '/login';

      // Sudah login: /login dan / diarahkan ke halaman awal sesuai peran.
      if (pathname === '/login' || pathname === '/') {
        return Response.redirect(new URL(ROLE_HOME[user.role], request.nextUrl));
      }

      // Halaman aplikasi di luar hak akses peran => kembali ke halaman awal peran itu.
      if (isProtectedPath(pathname) && !canAccess(user.role, pathname)) {
        return Response.redirect(new URL(ROLE_HOME[user.role], request.nextUrl));
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
