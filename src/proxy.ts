import NextAuth from 'next-auth';

import { authConfig } from '@/auth.config';

// Next.js 16: middleware.ts diganti proxy.ts dan harus mengekspor `proxy`.
// Hanya memakai authConfig (tanpa Prisma). Aturan akses ada di callback `authorized`.
const { auth } = NextAuth(authConfig);

// Harus berupa export bernama `proxy` yang dikenali statis oleh Next.js
// (export hasil destructuring seperti `export const { auth: proxy } = ...` memicu error).
export const proxy = auth;

export const config = {
  // Lewati /api, aset Next.js, dan file statis.
  matcher: [
    '/((?!api|_next/static|_next/image|favicon.ico|.*\\.(?:png|jpg|jpeg|gif|svg|webp|ico|css|js|map)$).*)',
  ],
};
