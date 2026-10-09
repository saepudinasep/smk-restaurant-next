import { employees } from '@/lib/dummy-data';

// Pengguna yang sedang login (dummy). Nanti ganti dengan data dari sesi login.
// Login memakai Email + Password (tabel Msemployee); Position menentukan role: Admin / Chef / Cashier.
// Password ditaruh di sini (bukan di dummy-data) karena form Manage Employee tidak pernah menampilkannya.
// Ganti ID ini untuk melihat sidebar tiap peran: E00001 = Admin, E00002 = Chef, E00004 = Cashier.
const DUMMY_LOGIN_AS = 'E00001';

export const currentUser = {
  employeeId: DUMMY_LOGIN_AS,
  password: 'Admin123', // dummy; harus memenuhi aturan: huruf besar, huruf kecil, dan angka
};

/** Profil karyawan yang sedang login (objek yang sama dengan isi `employees`). */
export const currentProfile = employees.find((e) => e.employeeId === currentUser.employeeId)!;

/** Bentuk yang dibutuhkan NavUser di sidebar. */
export const sidebarUser = () => ({
  name: currentProfile.name,
  email: currentProfile.email,
  avatar: '', // ERD tidak punya kolom foto karyawan, jadi avatar selalu inisial
});
