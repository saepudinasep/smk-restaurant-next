'use server';

import { AuthError } from 'next-auth';

import { signIn, signOut } from '@/auth';
import { ROLE_HOME, canAccess, safeRedirect } from '@/lib/access';
import { authorizeCredentials } from '@/lib/authorize';

export type LoginState = { error?: string; redirectTo?: string } | undefined;

/**
 * Dipakai oleh useActionState di form login. Mengembalikan pesan error, atau alamat tujuan
 * (`redirectTo`) yang lalu dibuka form dengan navigasi PENUH (window.location), bukan navigasi lembut.
 *
 * Kenapa tidak redirect dari server: setelah login, sesi di browser (SessionProvider) harus dimuat
 * ulang dari server. Navigasi penuh menjamin sidebar, nama, role, Pusher, dan push langsung benar
 * tanpa perlu refresh manual, dan tujuannya langsung halaman sesuai role (bukan "/" lalu dialihkan proxy).
 */
export async function login(_prev: LoginState, formData: FormData): Promise<LoginState> {
  const email = String(formData.get('email') ?? '').trim();
  const password = String(formData.get('password') ?? '');
  const callbackUrl = safeRedirect(String(formData.get('callbackUrl') ?? ''));

  if (!email || !password) return { error: 'Email dan password wajib diisi.' };

  // Periksa kredensial lebih dulu agar pesan salahnya pasti dan role pengguna diketahui
  const user = await authorizeCredentials({ email, password });
  if (!user) return { error: 'Email atau password salah. Silakan coba lagi.' };

  try {
    await signIn('credentials', { email, password, redirect: false }); // hanya menulis cookie sesi
  } catch (error) {
    if (error instanceof AuthError) return { error: 'Terjadi kesalahan. Silakan coba lagi.' };
    throw error;
  }

  // Tujuan: halaman yang tadi dituju bila boleh dibuka role ini; selain itu halaman awal role
  const path = callbackUrl.split(/[?#]/)[0];
  const redirectTo =
    callbackUrl !== '/' && canAccess(user.role, path) ? callbackUrl : ROLE_HOME[user.role];
  return { redirectTo };
}

/** Menghapus sesi. Tujuan (/login) dibuka klien dengan navigasi penuh supaya sesi di browser ikut bersih. */
export async function logout() {
  await signOut({ redirect: false });
}
