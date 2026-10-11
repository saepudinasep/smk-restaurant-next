import { redirect } from 'next/navigation';

// Halaman bawaan create-next-app diganti: alamat "/" langsung ke login.
// Setelah Auth.js terpasang, proxy.ts yang mengarahkan pengguna yang sudah login ke halaman rolenya.
export default function Home() {
  redirect('/login');
}
