'use server';

import { revalidatePath } from 'next/cache';

import type { ActionResult } from '@/actions/result';
import { Prisma } from '@/generated/prisma/client';
import { requireRole } from '@/lib/auth-guard';
import { nextMemberCode } from '@/lib/codes';
import { dateToDb } from '@/lib/mappers';
import { prisma } from '@/lib/prisma';
import { memberSchema, memberUpdateSchema } from '@/lib/validations';

const EMAIL_TAKEN = 'Email is already used by another member.';
const NOT_FOUND = 'Member not found. It may have been deleted.';

const isUniqueViolation = (e: unknown): e is Prisma.PrismaClientKnownRequestError =>
  e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002';
const violatesEmail = (e: Prisma.PrismaClientKnownRequestError) =>
  String(e.meta?.target ?? '').includes('email');

export async function createMember(input: unknown): Promise<ActionResult> {
  await requireRole('Admin');
  const parsed = memberSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message };
  const m = parsed.data;

  // ID dibuat di server (maks + 1). Bila bentrok dengan penyimpanan lain pada saat yang sama, ulangi.
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const latest = await prisma.member.findFirst({
        orderBy: { memberCode: 'desc' },
        select: { memberCode: true },
      });
      await prisma.member.create({
        data: {
          memberCode: nextMemberCode(latest ? [latest.memberCode] : []),
          name: m.name,
          email: m.email,
          handphone: m.handphone,
          joinDate: dateToDb(m.joinDate),
        },
      });
      revalidatePath('/manage-member');
      return { ok: true };
    } catch (e) {
      if (isUniqueViolation(e)) {
        if (violatesEmail(e)) return { ok: false, error: EMAIL_TAKEN };
        continue; // kode member bentrok, coba lagi dengan nomor baru
      }
      console.error(e);
      return { ok: false, error: 'Something went wrong. Please try again.' };
    }
  }
  return { ok: false, error: 'Could not generate a member ID. Please try again.' };
}

export async function updateMember(input: unknown): Promise<ActionResult> {
  await requireRole('Admin');
  const parsed = memberUpdateSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message };
  const { memberId, ...m } = parsed.data;

  try {
    await prisma.member.update({
      where: { memberCode: memberId },
      data: {
        name: m.name,
        email: m.email,
        handphone: m.handphone,
        joinDate: dateToDb(m.joinDate),
      },
    });
  } catch (e) {
    if (isUniqueViolation(e)) return { ok: false, error: EMAIL_TAKEN };
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2025')
      return { ok: false, error: NOT_FOUND };
    console.error(e);
    return { ok: false, error: 'Something went wrong. Please try again.' };
  }

  revalidatePath('/manage-member');
  return { ok: true };
}

export async function deleteMember(memberId: string): Promise<ActionResult> {
  await requireRole('Admin');

  try {
    const member = await prisma.member.findUnique({
      where: { memberCode: memberId },
      select: { id: true, name: true },
    });
    if (!member) return { ok: false, error: NOT_FOUND };

    // Member yang sudah punya order tidak boleh dihapus (riwayat order harus tetap utuh)
    const orders = await prisma.headerOrder.count({ where: { memberId: member.id } });
    if (orders > 0)
      return {
        ok: false,
        error: `${member.name} already has order history and cannot be deleted.`,
      };

    await prisma.member.delete({ where: { id: member.id } });
  } catch (e) {
    console.error(e);
    return { ok: false, error: 'Member could not be deleted.' };
  }

  revalidatePath('/manage-member');
  return { ok: true };
}
