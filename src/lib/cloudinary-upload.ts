import { signMenuUpload } from '@/actions/uploads';

export type UploadResult = { ok: true; publicId: string } | { ok: false; error: string };

/**
 * Upload foto menu langsung dari browser ke Cloudinary memakai tanda tangan dari server.
 * Mengembalikan public_id; url foto yang disimpan ditentukan server setelah memeriksa aset itu.
 */
export async function uploadMenuPhoto(file: File): Promise<UploadResult> {
  const sig = await signMenuUpload();
  if (!sig.ok) return sig;

  // Semua parameter yang ikut ditandatangani harus dikirim persis sama (folder, format, timestamp, ...)
  const body = new FormData();
  body.append('file', file);
  body.append('api_key', sig.apiKey);
  body.append('signature', sig.signature);
  for (const [key, value] of Object.entries(sig.params)) body.append(key, value);

  try {
    const res = await fetch(`https://api.cloudinary.com/v1_1/${sig.cloudName}/image/upload`, {
      method: 'POST',
      body,
    });
    const json = (await res.json().catch(() => null)) as {
      public_id?: string;
      error?: { message?: string };
    } | null;
    if (!res.ok || !json?.public_id)
      return { ok: false, error: json?.error?.message ?? 'Photo upload failed. Please try again.' };
    return { ok: true, publicId: json.public_id };
  } catch {
    return {
      ok: false,
      error: 'Could not reach the photo service. Check your connection and try again.',
    };
  }
}
