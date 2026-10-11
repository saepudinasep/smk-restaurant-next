// Alamat foto menu. Nilai kolom `photo` bisa berupa:
//  - url Cloudinary (https://res.cloudinary.com/...)  -> foto yang di-upload lewat aplikasi
//  - path lokal (/menus/ayamtelurasin.jpg)             -> foto contoh di /public
//  - nama file saja (ayamtelurasin.jpg)                -> data dummy lama, dianggap ada di /public/menus

const LOCAL_DIR = '/menus';

export function resolvePhotoSrc(photo: string): string {
  if (!photo) return '';
  if (/^(https?:)?\/\//i.test(photo) || photo.startsWith('/') || photo.startsWith('blob:'))
    return photo;
  return `${LOCAL_DIR}/${photo}`;
}

/**
 * Untuk url Cloudinary: minta format & kualitas otomatis dan lebar maksimal `width` px,
 * supaya foto kecil dan cepat dimuat. Url lain dikembalikan apa adanya.
 */
export function optimizeCloudinary(src: string, width = 800): string {
  if (!/^https:\/\/res\.cloudinary\.com\//.test(src) || !src.includes('/image/upload/')) return src;
  if (/\/image\/upload\/[^/]*(?:f_auto|q_auto|w_\d+)/.test(src)) return src; // sudah ada transformasi
  return src.replace('/image/upload/', `/image/upload/f_auto,q_auto,w_${width}/`);
}
