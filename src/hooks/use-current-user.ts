'use client';

import { useSession } from 'next-auth/react';

/** Pengguna yang sedang login (dari sesi Auth.js), atau undefined bila belum login. */
export function useCurrentUser() {
  const user = useSession().data?.user;
  if (!user) return undefined;
  return {
    id: user.id,
    employeeCode: user.employeeCode, // mis. E00001
    name: user.name ?? '',
    email: user.email ?? '',
    role: user.role,
  };
}
