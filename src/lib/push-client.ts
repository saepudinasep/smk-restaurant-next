import { removePushSubscription, savePushSubscription } from '@/actions/push';

// Kunci publik VAPID (aman dibuka). Dibaca saat build, jadi setelah mengubahnya aplikasi harus dibangun ulang.
const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? '';

export const isPushConfigured = () => Boolean(VAPID_PUBLIC_KEY);

export type PushStatus =
  | 'loading'
  | 'unconfigured' // kunci VAPID belum diisi
  | 'unsupported' // browser tidak mendukung web push
  | 'needs-install' // iPhone/iPad: web push hanya jalan bila web ditambahkan ke Layar Utama
  | 'denied' // izin notifikasi diblokir di pengaturan browser
  | 'off'
  | 'on';

/** Mengubah kunci VAPID (base64url) menjadi byte yang dibutuhkan PushManager. */
export function urlBase64ToUint8Array(base64: string): Uint8Array<ArrayBuffer> {
  const padded = base64 + '='.repeat((4 - (base64.length % 4)) % 4);
  const raw = atob(padded.replace(/-/g, '+').replace(/_/g, '/'));
  const out = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
  return out;
}

function isIosNotInstalled() {
  const ios =
    /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  const standalone =
    window.matchMedia('(display-mode: standalone)').matches ||
    (navigator as Navigator & { standalone?: boolean }).standalone === true;
  return ios && !standalone;
}

const hasPushApis = () => 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;

async function currentSubscription() {
  const reg = await navigator.serviceWorker.getRegistration('/');
  return reg ? reg.pushManager.getSubscription() : null;
}

/** Keadaan web push di browser ini. */
export async function detectPushStatus(): Promise<PushStatus> {
  if (!isPushConfigured()) return 'unconfigured';
  if (typeof window === 'undefined') return 'loading';
  if (isIosNotInstalled()) return 'needs-install';
  if (!hasPushApis()) return 'unsupported';
  if (Notification.permission === 'denied') return 'denied';
  const sub = await currentSubscription();
  return sub && Notification.permission === 'granted' ? 'on' : 'off';
}

const syncKey = (userId: string) => `push-synced:${userId}`;

/** Meminta izin (bila perlu), berlangganan push, dan mendaftarkannya ke server. Panggil dari klik tombol. */
export async function subscribeToPush(): Promise<{ ok: true } | { ok: false; error: string }> {
  if (!isPushConfigured()) return { ok: false, error: 'Push notifications are not configured.' };
  if (!hasPushApis()) return { ok: false, error: 'This browser does not support push notifications.' };

  if (Notification.permission === 'denied')
    return { ok: false, error: 'Notifications are blocked. Allow them in your browser settings, then try again.' };
  if (Notification.permission === 'default') {
    const permission = await Notification.requestPermission();
    if (permission !== 'granted') return { ok: false, error: 'Permission was not granted.' };
  }

  try {
    await navigator.serviceWorker.register('/sw.js', { scope: '/' });
    const reg = await navigator.serviceWorker.ready;
    const sub =
      (await reg.pushManager.getSubscription()) ??
      (await reg.pushManager.subscribe({
        userVisibleOnly: true, // wajib: setiap push harus menampilkan notifikasi
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
      }));

    const json = sub.toJSON();
    const saved = await savePushSubscription({
      endpoint: json.endpoint,
      keys: json.keys,
      userAgent: navigator.userAgent.slice(0, 300),
    });
    return saved.ok ? { ok: true } : { ok: false, error: saved.error };
  } catch (e) {
    console.error(e);
    return { ok: false, error: 'Could not turn on push notifications on this device.' };
  }
}

/** Mematikan push di browser ini: dicabut di server lalu langganan browser dihapus. */
export async function unsubscribeFromPush(): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    const sub = await currentSubscription();
    if (sub) {
      await removePushSubscription({ endpoint: sub.endpoint });
      await sub.unsubscribe();
    }
    return { ok: true };
  } catch (e) {
    console.error(e);
    return { ok: false, error: 'Could not turn off push notifications on this device.' };
  }
}

/**
 * Dipanggil sekali per sesi tab setelah login: bila izin sudah diberikan sebelumnya, perangkat ini
 * didaftarkan ulang diam-diam untuk pengguna yang sedang login (tanpa meminta izin lagi).
 */
export async function ensurePushSubscription(userId: string) {
  if (!isPushConfigured() || typeof window === 'undefined' || !hasPushApis() || isIosNotInstalled()) return;
  if (Notification.permission !== 'granted' || sessionStorage.getItem(syncKey(userId))) return;
  const result = await subscribeToPush();
  if (result.ok) sessionStorage.setItem(syncKey(userId), '1');
}

/**
 * Dipanggil sebelum logout: perangkat ini berhenti menerima notifikasi pengguna yang keluar
 * (penting di perangkat bersama). Langganan browser dibiarkan, dan didaftarkan ulang saat login berikutnya.
 */
export async function unregisterPushOnThisDevice() {
  try {
    if (typeof window === 'undefined' || !hasPushApis()) return;
    const sub = await currentSubscription();
    if (sub) await removePushSubscription({ endpoint: sub.endpoint });
    for (const key of Object.keys(sessionStorage)) if (key.startsWith('push-synced:')) sessionStorage.removeItem(key);
  } catch {
    // jangan menghalangi logout
  }
}
