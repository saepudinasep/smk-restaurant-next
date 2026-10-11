// Tipe notifikasi untuk UI. Isinya dibaca dari database (lihat lib/data/notifications.ts).

export type NotificationType = 'order' | 'kitchen' | 'payment' | 'account' | 'system';

export type AppNotification = {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  date: string; // YYYY-MM-DD (zona restoran)
  time: string; // HH:mm (zona restoran)
  read: boolean;
};

const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/** Format manual (tanpa Intl/zona waktu) supaya hasil server dan client selalu sama. */
export function formatDateTime(date: string, time: string) {
  const [y, m, d] = date.split('-').map(Number);
  return `${d} ${months[m - 1]} ${y} · ${time}`;
}
