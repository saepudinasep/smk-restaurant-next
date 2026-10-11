import NextAuth from 'next-auth';
import Credentials from 'next-auth/providers/credentials';

import { authConfig } from '@/auth.config';
import { authorizeCredentials } from '@/lib/authorize';
import { prisma } from '@/lib/prisma';

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  providers: [
    Credentials({
      credentials: { email: {}, password: {} },
      authorize: authorizeCredentials,
    }),
  ],
  callbacks: {
    ...authConfig.callbacks,
    // Saat client memanggil update() (mis. setelah nama diubah di Account), nama & email di token
    // dibaca ulang dari database. Dilakukan di sini, bukan di authConfig, karena proxy.ts tidak boleh memakai Prisma.
    async jwt(params) {
      const token = authConfig.callbacks.jwt(params);
      if (params.trigger === 'update') {
        const employee = await prisma.employee.findUnique({
          where: { id: token.uid },
          select: { name: true, email: true },
        });
        if (employee) {
          token.name = employee.name;
          token.email = employee.email;
        }
      }
      return token;
    },
  },
});
