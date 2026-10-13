import { redirect } from 'next/navigation';

import { auth } from '@/auth';
import { ROLE_HOME } from '@/lib/access';

// Alamat "/" tidak punya isi sendiri: pengguna yang sudah login dikirim ke halaman awal rolenya,
// selain itu ke login. (proxy.ts juga melakukan ini; ini cadangan bila proxy dilewati.)
export default async function Home() {
  const session = await auth();
  redirect(session?.user ? ROLE_HOME[session.user.role] : '/login');
}
