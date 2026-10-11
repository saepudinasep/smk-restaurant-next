'use server';

import { revalidatePath } from 'next/cache';

import type { ActionResult } from '@/actions/result';
import { Prisma } from '@/generated/prisma/client';
import { requireRole } from '@/lib/auth-guard';
import { MAX_PHOTO_BYTES, MENU_FOLDER, PHOTO_FORMATS, cloudinary } from '@/lib/cloudinary';
import { nextMenuNumber } from '@/lib/codes';
import { prisma } from '@/lib/prisma';
import { menuSchema, menuUpdateSchema } from '@/lib/validations';

const NAME_TAKEN = 'A menu with this name already exists.';
const NOT_FOUND = 'Menu not found. It may have been deleted.';
const PHOTO_USED = 'This photo is already used by another menu. Upload it again.';

const isKnown = (e: unknown, code: string): e is Prisma.PrismaClientKnownRequestError =>
  e instanceof Prisma.PrismaClientKnownRequestError && e.code === code;
const violatesName = (e: Prisma.PrismaClientKnownRequestError) =>
  String(e.meta?.target ?? '').includes('name');

/** Hapus aset di Cloudinary. Gagal tidak menggagalkan operasi utama (hanya meninggalkan file yatim). */
async function discard(publicId?: string | null) {
  if (!publicId) return;
  try {
    await cloudinary.uploader.destroy(publicId, { resource_type: 'image', invalidate: true });
  } catch (e) {
    console.error('Cloudinary destroy failed', publicId, e);
  }
}

/**
 * Browser hanya mengirim public_id; url, ukuran, dan format TIDAK dipercaya dari browser.
 * Aset diperiksa langsung ke Cloudinary: harus ada, berada di folder menu, bertipe JPG/PNG/WEBP, <= 2 MB.
 */
async function verifyPhoto(
  publicId: string,
): Promise<{ ok: true; url: string; publicId: string } | { ok: false; error: string }> {
  if (!publicId.startsWith(`${MENU_FOLDER}/`))
    return { ok: false, error: 'Invalid photo. Upload it again.' };
  try {
    const r = await cloudinary.api.resource(publicId, { resource_type: 'image' });
    if (r.bytes > MAX_PHOTO_BYTES || !(PHOTO_FORMATS as readonly string[]).includes(r.format)) {
      await discard(publicId);
      return { ok: false, error: 'Photo must be a JPG, PNG or WEBP image up to 2 MB.' };
    }
    return { ok: true, url: r.secure_url as string, publicId: r.public_id as string };
  } catch {
    return { ok: false, error: 'The uploaded photo was not found. Please upload it again.' };
  }
}

export async function createMenu(input: unknown): Promise<ActionResult> {
  await requireRole('Admin');
  const parsed = menuSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message };
  const m = parsed.data;
  if (!m.photoPublicId) return { ok: false, error: 'Photo is required.' };

  const photo = await verifyPhoto(m.photoPublicId);
  if (!photo.ok) return photo;
  if (
    await prisma.menu.findFirst({ where: { photoPublicId: photo.publicId }, select: { id: true } })
  )
    return { ok: false, error: PHOTO_USED }; // aset milik menu lain: jangan dihapus

  // MenuID dibuat di server (maks + 1). Bila bentrok dengan penyimpanan lain pada saat yang sama, ulangi.
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const latest = await prisma.menu.findFirst({
        orderBy: { menuNumber: 'desc' },
        select: { menuNumber: true },
      });
      await prisma.menu.create({
        data: {
          menuNumber: nextMenuNumber(latest ? [latest.menuNumber] : []),
          name: m.name,
          price: m.price,
          category: m.category,
          photo: photo.url,
          photoPublicId: photo.publicId,
        },
      });
      revalidatePath('/manage-menu');
      return { ok: true };
    } catch (e) {
      if (isKnown(e, 'P2002')) {
        if (violatesName(e)) {
          await discard(photo.publicId);
          return { ok: false, error: NAME_TAKEN };
        }
        continue; // nomor menu bentrok, coba lagi dengan nomor baru
      }
      console.error(e);
      await discard(photo.publicId);
      return { ok: false, error: 'Something went wrong. Please try again.' };
    }
  }
  await discard(photo.publicId);
  return { ok: false, error: 'Could not generate a menu ID. Please try again.' };
}

export async function updateMenu(input: unknown): Promise<ActionResult> {
  await requireRole('Admin');
  const parsed = menuUpdateSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message };
  const { menuId, photoPublicId, ...m } = parsed.data;

  const current = await prisma.menu.findUnique({
    where: { menuNumber: menuId },
    select: { id: true, photoPublicId: true },
  });
  if (!current) {
    await discard(photoPublicId);
    return { ok: false, error: NOT_FOUND };
  }

  // Foto baru hanya bila browser mengirim public_id yang berbeda dari foto sekarang
  let newPhoto: { url: string; publicId: string } | null = null;
  if (photoPublicId && photoPublicId !== current.photoPublicId) {
    const verified = await verifyPhoto(photoPublicId);
    if (!verified.ok) return verified;
    if (
      await prisma.menu.findFirst({
        where: { photoPublicId: verified.publicId },
        select: { id: true },
      })
    )
      return { ok: false, error: PHOTO_USED };
    newPhoto = verified;
  }

  try {
    await prisma.menu.update({
      where: { id: current.id },
      data: {
        name: m.name,
        price: m.price,
        category: m.category,
        ...(newPhoto && { photo: newPhoto.url, photoPublicId: newPhoto.publicId }),
      },
    });
  } catch (e) {
    await discard(newPhoto?.publicId);
    if (isKnown(e, 'P2002')) return { ok: false, error: NAME_TAKEN };
    if (isKnown(e, 'P2025')) return { ok: false, error: NOT_FOUND };
    console.error(e);
    return { ok: false, error: 'Something went wrong. Please try again.' };
  }

  if (newPhoto) await discard(current.photoPublicId); // foto lama sudah tidak dipakai
  revalidatePath('/manage-menu');
  return { ok: true };
}

export async function deleteMenu(menuId: number): Promise<ActionResult> {
  await requireRole('Admin');

  try {
    const menu = await prisma.menu.findUnique({
      where: { menuNumber: menuId },
      select: { id: true, name: true, photoPublicId: true },
    });
    if (!menu) return { ok: false, error: NOT_FOUND };

    // Menu yang pernah dipesan tidak boleh dihapus (riwayat order harus tetap utuh)
    if ((await prisma.detailOrder.count({ where: { menuId: menu.id } })) > 0)
      return {
        ok: false,
        error: `${menu.name} is already part of an order and cannot be deleted.`,
      };

    await prisma.menu.delete({ where: { id: menu.id } });
    await discard(menu.photoPublicId);
  } catch (e) {
    console.error(e);
    return { ok: false, error: 'Menu could not be deleted.' };
  }

  revalidatePath('/manage-menu');
  return { ok: true };
}
