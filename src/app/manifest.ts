import type { MetadataRoute } from 'next';

// Dibutuhkan agar web bisa dipasang ke Layar Utama; di iPhone/iPad itu syarat agar web push berfungsi.
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'SMK Restaurant',
    short_name: 'SMK Resto',
    description: 'Sistem informasi pemesanan dan pembayaran SMK Restaurant',
    start_url: '/dashboard',
    scope: '/',
    display: 'standalone',
    background_color: '#ffffff',
    theme_color: '#171717',
    icons: [
      { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
      { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png' },
      { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
  };
}
