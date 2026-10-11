// Penerjemah antara nilai di database (Date, enum tanpa spasi, field opsional)
// dan bentuk yang dipakai komponen UI ('YYYY-MM-DD', 'Credit Card', string kosong).

export const dateToUi = (d: Date | null): string => (d ? d.toISOString().slice(0, 10) : '');
export const dateToDb = (iso: string): Date => new Date(`${iso}T00:00:00.000Z`);

/** Zona waktu restoran (Malang, Jawa Timur). Tanggal order mengikuti zona ini, bukan zona server (UTC di hosting). */
export const RESTAURANT_TIME_ZONE = 'Asia/Jakarta';

/** Tanggal hari ini di zona restoran, format YYYY-MM-DD. */
export const todayInRestaurant = (now: Date = new Date()): string =>
  new Intl.DateTimeFormat('en-CA', {
    timeZone: RESTAURANT_TIME_ZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(now);

// Enum di database tidak boleh berspasi ('CreditCard'); di UI tampil 'Credit Card'.
export const paymentToDb = {
  Cash: 'Cash',
  'Credit Card': 'CreditCard',
  'Debit Card': 'DebitCard',
} as const;

export const paymentToUi = {
  Cash: 'Cash',
  CreditCard: 'Credit Card',
  DebitCard: 'Debit Card',
} as const;

/** Tanggal dan jam (HH:mm) suatu waktu di zona restoran. */
export function dateTimeInRestaurant(d: Date): { date: string; time: string } {
  return {
    date: todayInRestaurant(d),
    time: new Intl.DateTimeFormat('en-GB', {
      timeZone: RESTAURANT_TIME_ZONE,
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    }).format(d),
  };
}
