import 'server-only';

import { v2 as cloudinary } from 'cloudinary';

// Konfigurasi Cloudinary di server. API secret TIDAK PERNAH dikirim ke browser;
// browser hanya menerima tanda tangan sekali pakai untuk satu upload (lihat actions/uploads.ts).
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true,
});

export { cloudinary };

export const isCloudinaryConfigured = () =>
  Boolean(
    process.env.CLOUDINARY_CLOUD_NAME &&
    process.env.CLOUDINARY_API_KEY &&
    process.env.CLOUDINARY_API_SECRET,
  );

/**
 * Semua foto menu disimpan di folder ini, sejajar dengan folder bawaan "samples" di Media Library.
 * Server menolak public_id di luar folder ini (lihat verifyPhoto di actions/menus.ts).
 */
export const MENU_FOLDER = 'smk_restaurants';
export const PHOTO_FORMATS = ['jpg', 'png', 'webp'] as const;
export const MAX_PHOTO_BYTES = 2 * 1024 * 1024;

/**
 * Cara Cloudinary menaruh aset ke folder bergantung pada mode folder akun:
 *  - 'dynamic' (akun baru sejak Juni 2024, bawaan): parameter `folder` tidak boleh dipakai.
 *    Dipakai `asset_folder` (folder di Media Library) + `public_id_prefix` (supaya public_id
 *    dan url juga berawalan nama folder, mis. smk_restaurants/abc123).
 *  - 'fixed' (akun lama): cukup parameter `folder`.
 * Cek di Cloudinary: Media Library > Preferences; bila ada tulisan "Dynamic folders", pakai 'dynamic'.
 * Atur lewat CLOUDINARY_FOLDER_MODE=fixed bila akunmu masih mode lama.
 */
export const folderMode: 'dynamic' | 'fixed' =
  process.env.CLOUDINARY_FOLDER_MODE === 'fixed' ? 'fixed' : 'dynamic';

export const folderParams = (): Record<string, string> =>
  folderMode === 'fixed'
    ? { folder: MENU_FOLDER }
    : { asset_folder: MENU_FOLDER, public_id_prefix: MENU_FOLDER };
