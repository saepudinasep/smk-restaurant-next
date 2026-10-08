export type NotificationType = 'order' | 'kitchen' | 'payment' | 'account' | 'system';

export type AppNotification = {
  id: number;
  type: NotificationType;
  title: string;
  message: string;
  date: string; // YYYY-MM-DD
  time: string; // HH:mm
  read: boolean;
};

// Data dummy. ERD tidak punya tabel notifikasi, jadi nanti perlu tabel baru
// (mis. Notification: id, employeeId, type, title, message, createdAt, readAt).
export const initialNotifications: AppNotification[] = [
  { id: 1, type: 'order', title: 'New order placed', message: 'Order 2026100007 was placed for Joko Susilo. 3 dishes are waiting for the kitchen.', date: '2026-10-08', time: '19:42', read: false },
  { id: 2, type: 'kitchen', title: 'Dish ready to deliver', message: 'Gurame Asam Manis for order 2026100004 is ready to be delivered.', date: '2026-10-08', time: '19:30', read: false },
  { id: 3, type: 'payment', title: 'Payment received', message: 'Order 2026100003 was paid with Credit Card (BNI), Rp 385.000.', date: '2026-10-08', time: '18:55', read: false },
  { id: 4, type: 'order', title: 'Order waiting for payment', message: 'Order 2026100005 has been fully delivered and is waiting for payment.', date: '2026-10-08', time: '18:20', read: false },
  { id: 5, type: 'account', title: 'Password changed', message: 'Your password was changed successfully.', date: '2026-10-07', time: '10:02', read: true },
  { id: 6, type: 'system', title: 'Monthly report available', message: 'The income report for September is ready to view in Report.', date: '2026-10-01', time: '08:00', read: true },
  { id: 7, type: 'kitchen', title: 'Kitchen is busy', message: '6 dishes are pending. Check View Orders to prioritise the oldest orders.', date: '2026-09-30', time: '12:15', read: true },
  { id: 8, type: 'payment', title: 'Payment received', message: 'Order 2026090006 was paid with Cash, Rp 275.000.', date: '2026-09-29', time: '20:05', read: true },
  { id: 9, type: 'system', title: 'Welcome to SMK Restaurant', message: 'Your account has been created. Review your details in Account.', date: '2026-09-01', time: '07:00', read: true },
  { id: 10, type: 'system', title: 'Maintenance notice', message: 'The system will be unavailable on Sunday 02:00 - 03:00.', date: '2026-08-27', time: '18:00', read: true },
];

const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/** Format manual (tanpa Intl/zona waktu) supaya hasil server dan client selalu sama. */
export function formatDateTime(date: string, time: string) {
  const [y, m, d] = date.split('-').map(Number);
  return `${d} ${months[m - 1]} ${y} · ${time}`;
}
