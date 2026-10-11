'use server';

import type { UploadSignatureResult } from '@/actions/result';
import { requireRole } from '@/lib/auth-guard';
import { PHOTO_FORMATS, cloudinary, folderParams, isCloudinaryConfigured } from '@/lib/cloudinary';

/**
 * Membuat tanda tangan untuk satu upload foto menu. Browser lalu mengirim file LANGSUNG ke Cloudinary
 * (tidak lewat server kita), jadi tidak terkena batas ukuran body Server Action / Vercel.
 * Parameter yang ditandatangani (folder, format yang diizinkan, timestamp) tidak bisa diubah browser:
 * Cloudinary menolak upload bila isinya tidak cocok dengan tanda tangan.
 */
export async function signMenuUpload(): Promise<UploadSignatureResult> {
  await requireRole('Admin');
  if (!isCloudinaryConfigured())
    return {
      ok: false,
      error: 'Photo upload is not configured. Add the CLOUDINARY_* variables to .env.',
    };

  const params = {
    allowed_formats: PHOTO_FORMATS.join(','),
    ...folderParams(), // asset_folder + public_id_prefix (dynamic) atau folder (fixed) -> smk_restaurants
    timestamp: Math.round(Date.now() / 1000),
  };
  const signature = cloudinary.utils.api_sign_request(params, process.env.CLOUDINARY_API_SECRET!);

  return {
    ok: true,
    cloudName: process.env.CLOUDINARY_CLOUD_NAME!,
    apiKey: process.env.CLOUDINARY_API_KEY!,
    signature,
    params: Object.fromEntries(Object.entries(params).map(([k, v]) => [k, String(v)])),
  };
}
