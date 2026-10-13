import type { Prisma } from '@/generated/prisma/client';

// Di MongoDB, field opsional bisa BERNILAI null atau TIDAK ADA sama sekali (unset). Sejak Prisma 3.11.1,
// `where: { field: null }` hanya cocok dengan yang bernilai null; dokumen yang field-nya tidak ada
// dilewati kecuali ditanyakan lewat `{ isSet: false }`. Dokumen yang dibuat tanpa menulis field itu
// (mis. order baru dari halaman Orders) akan "hilang" dari filter biasa. Selalu pakai dua filter ini.

/** Order yang belum dibayar: `payment` bernilai null ATAU tidak ada. */
export const unpaidWhere: Prisma.HeaderOrderWhereInput = {
  OR: [{ payment: null }, { payment: { isSet: false } }],
};

/** Notifikasi yang belum dibaca: `readAt` bernilai null ATAU tidak ada. */
export const unreadWhere: Prisma.NotificationWhereInput = {
  OR: [{ readAt: null }, { readAt: { isSet: false } }],
};
