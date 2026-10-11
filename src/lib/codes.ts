// Pembuat ID tampilan (E00001, M0000001, ...). MongoDB tidak punya auto increment, jadi angka
// berikutnya dihitung dari kode terbesar yang ada. Fungsi murni: dipakai server (saat menyimpan)
// dan client (untuk pratinjau di form). Bila dua pengguna menyimpan bersamaan, indeks unik di
// database menolak yang kedua dan Server Action mengulang dengan angka baru.

const nextNumber = (codes: string[]) =>
  Math.max(
    0,
    ...codes.map((c) => Number.parseInt(c.slice(1), 10)).filter((n) => !Number.isNaN(n)),
  ) + 1;

/** M0000001 (8 karakter) */
export const nextMemberCode = (codes: string[]) => `M${String(nextNumber(codes)).padStart(7, '0')}`;

/** E00001 (6 karakter) */
export const nextEmployeeCode = (codes: string[]) =>
  `E${String(nextNumber(codes)).padStart(5, '0')}`;

/** MenuID (integer): angka terbesar + 1. */
export const nextMenuNumber = (numbers: number[]) => Math.max(0, ...numbers) + 1;

/**
 * OrderID (10 karakter) = tahun + bulan + urutan 4 digit pada bulan itu, mis. 2026100008.
 * `date` = YYYY-MM-DD; `codes` = kode order yang sudah ada (cukup yang sebulan itu, atau semuanya).
 */
export function nextOrderCode(date: string, codes: string[]) {
  const prefix = date.slice(0, 7).replace('-', '');
  const max = Math.max(
    0,
    ...codes
      .filter((c) => c.startsWith(prefix))
      .map((c) => Number.parseInt(c.slice(6), 10))
      .filter((n) => !Number.isNaN(n)),
  );
  return `${prefix}${String(max + 1).padStart(4, '0')}`;
}
