// Format tampilan. Ditulis manual (tanpa Intl / zona waktu) supaya hasil di server dan di browser
// selalu sama persis, sehingga tidak ada hydration mismatch.

export const MONTHS = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
] as const;

const SHORT_MONTHS = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
];

/** 385000 -> 'Rp 385.000' */
export const formatRupiah = (n: number) => `Rp ${String(n).replace(/\B(?=(\d{3})+(?!\d))/g, '.')}`;

/** '2026-10-06' -> '6 Oct 2026' */
export function formatDate(iso: string) {
  const [y, m, d] = iso.split('-').map(Number);
  return `${d} ${SHORT_MONTHS[m - 1]} ${y}`;
}

/** 2300000 -> '2,3 jt' (untuk sumbu & label chart "Income in Million"). */
export const formatMillion = (n: number) =>
  `${String(Math.round(n / 100000) / 10).replace('.', ',')} jt`;
