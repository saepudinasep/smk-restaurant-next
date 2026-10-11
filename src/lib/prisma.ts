import { PrismaClient } from '@/generated/prisma/client';

// Satu instance PrismaClient untuk seluruh aplikasi.
// Di development, hot reload membuat modul dimuat ulang terus; tanpa globalThis
// koneksi ke MongoDB akan menumpuk. Di Vercel (serverless) pola ini juga dipakai
// ulang selama instance function masih hangat.
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma = globalForPrisma.prisma ?? new PrismaClient();

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;
