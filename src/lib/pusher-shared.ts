// Nama kanal dan bentuk pesan realtime. File murni: dipakai server (menerbitkan) dan browser (mendengarkan).

export const NOTIFICATION_EVENT = 'notification';

/** Kanal pribadi satu karyawan. Hanya pemiliknya yang diberi izin berlangganan (lihat /api/pusher/auth). */
export const userChannel = (employeeId: string) => `private-user-${employeeId}`;

export type RealtimePayload = {
  type: string; // order | kitchen | payment | account | system
  title: string;
  message: string;
  url?: string; // halaman yang relevan, untuk tombol "Open" pada toast
};
