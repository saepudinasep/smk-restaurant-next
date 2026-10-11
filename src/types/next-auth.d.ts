import type { DefaultSession } from 'next-auth';

import type { RoleName } from '@/lib/access';

declare module 'next-auth' {
  interface User {
    role: RoleName;
    employeeCode: string; // EmployeeID di ERD, mis. E00001
  }
  interface Session {
    user: {
      id: string;
      role: RoleName;
      employeeCode: string;
    } & DefaultSession['user'];
  }
}

// Di Auth.js v5 interface JWT didefinisikan di @auth/core; 'next-auth/jwt' hanya mengekspor ulang.
// Dua-duanya diperluas agar tipe token benar di semua tempat.
declare module '@auth/core/jwt' {
  interface JWT {
    uid: string;
    role: RoleName;
    employeeCode: string;
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    uid: string;
    role: RoleName;
    employeeCode: string;
  }
}
