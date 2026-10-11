// Tipe hasil Server Action. Dipisah dari file 'use server' karena file tersebut
// hanya boleh mengekspor fungsi async.
export type ActionResult = { ok: true } | { ok: false; error: string };

/** Hasil yang bisa menunjuk field mana yang bermasalah (mis. password lama salah). */
export type FieldResult<F extends string> = { ok: true } | { ok: false; field: F; error: string };

/**
 * Tanda tangan sekali pakai untuk upload langsung dari browser ke Cloudinary.
 * `params` = semua parameter yang ikut ditandatangani (termasuk timestamp); browser wajib mengirimnya persis sama.
 */
export type UploadSignatureResult =
  | {
      ok: true;
      cloudName: string;
      apiKey: string;
      signature: string;
      params: Record<string, string>;
    }
  | { ok: false; error: string };

/** Hasil pembuatan order: kode order, total dari harga di database, dan jumlah porsi. */
export type CreateOrderResult =
  | { ok: true; orderId: string; total: number; items: number }
  | { ok: false; error: string };

/** Hasil pembayaran: total dari harga di database, dan kembalian (hanya untuk Cash). */
export type PayOrderResult =
  | { ok: true; total: number; change: number | null }
  | { ok: false; error: string };
