'use server';

import { hash } from 'bcryptjs';
import { revalidatePath } from 'next/cache';

import type { ActionResult } from '@/actions/result';
import { Prisma } from '@/generated/prisma/client';
import { requireRole } from '@/lib/auth-guard';
import { nextEmployeeCode } from '@/lib/codes';
import { notifyEmployees } from '@/lib/notify';
import { prisma } from '@/lib/prisma';
import { employeeSchema, employeeUpdateSchema } from '@/lib/validations';

// Password awal karyawan baru (HANYA dev/demo). Wajib diganti pemiliknya lewat halaman Account.
const DEFAULT_PASSWORD =
  process.env.DEFAULT_USER_PASSWORD ?? process.env.SEED_DEFAULT_PASSWORD ?? 'Smk12345';

const EMAIL_TAKEN = 'Email is already used by another employee.';
const NOT_FOUND = 'Employee not found. It may have been deleted.';

const isKnown = (e: unknown, code: string): e is Prisma.PrismaClientKnownRequestError =>
  e instanceof Prisma.PrismaClientKnownRequestError && e.code === code;
const violatesEmail = (e: Prisma.PrismaClientKnownRequestError) =>
  String(e.meta?.target ?? '').includes('email');

export async function createEmployee(input: unknown): Promise<ActionResult> {
  await requireRole('Admin');
  const parsed = employeeSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message };
  const e = parsed.data;

  const password = await hash(DEFAULT_PASSWORD, 10);

  // ID dibuat di server (maks + 1). Bila bentrok dengan penyimpanan lain pada saat yang sama, ulangi.
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const latest = await prisma.employee.findFirst({
        orderBy: { employeeCode: 'desc' },
        select: { employeeCode: true },
      });
      const created = await prisma.employee.create({
        data: {
          employeeCode: nextEmployeeCode(latest ? [latest.employeeCode] : []),
          name: e.name,
          email: e.email,
          password,
          handphone: e.handphone,
          position: e.position,
        },
      });
      revalidatePath('/manage-employee');
      await notifyEmployees([created.id], {
        type: 'system',
        title: 'Welcome to SMK Restaurant',
        message:
          'Your account has been created. Change the default password and review your details in Account.',
      });
      return { ok: true };
    } catch (err) {
      if (isKnown(err, 'P2002')) {
        if (violatesEmail(err)) return { ok: false, error: EMAIL_TAKEN };
        continue; // kode karyawan bentrok, coba lagi dengan nomor baru
      }
      console.error(err);
      return { ok: false, error: 'Something went wrong. Please try again.' };
    }
  }
  return { ok: false, error: 'Could not generate an employee ID. Please try again.' };
}

export async function updateEmployee(input: unknown): Promise<ActionResult> {
  const me = await requireRole('Admin');
  const parsed = employeeUpdateSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message };
  const { employeeId, ...e } = parsed.data;

  try {
    const current = await prisma.employee.findUnique({
      where: { employeeCode: employeeId },
      select: { id: true, position: true },
    });
    if (!current) return { ok: false, error: NOT_FOUND };

    if (current.position !== e.position) {
      // Mengubah position diri sendiri membuat akses hilang seketika
      if (current.id === me.id)
        return {
          ok: false,
          error: 'You cannot change your own position. Ask another Admin to do it.',
        };
      // Aplikasi harus selalu punya minimal satu Admin
      if (
        current.position === 'Admin' &&
        (await prisma.employee.count({ where: { position: 'Admin' } })) <= 1
      )
        return { ok: false, error: 'At least one Admin is required. Assign another Admin first.' };
    }

    await prisma.employee.update({
      where: { id: current.id },
      data: { name: e.name, email: e.email, handphone: e.handphone, position: e.position },
    });
  } catch (err) {
    if (isKnown(err, 'P2002')) return { ok: false, error: EMAIL_TAKEN };
    if (isKnown(err, 'P2025')) return { ok: false, error: NOT_FOUND };
    console.error(err);
    return { ok: false, error: 'Something went wrong. Please try again.' };
  }

  revalidatePath('/manage-employee');
  return { ok: true };
}

export async function deleteEmployee(employeeId: string): Promise<ActionResult> {
  const me = await requireRole('Admin');

  try {
    const target = await prisma.employee.findUnique({
      where: { employeeCode: employeeId },
      select: { id: true, name: true, position: true },
    });
    if (!target) return { ok: false, error: NOT_FOUND };

    if (target.id === me.id) return { ok: false, error: 'You cannot delete your own account.' };

    if (
      target.position === 'Admin' &&
      (await prisma.employee.count({ where: { position: 'Admin' } })) <= 1
    )
      return {
        ok: false,
        error: 'At least one Admin is required. This account cannot be deleted.',
      };

    // Karyawan yang sudah membuat order tidak boleh dihapus (riwayat order harus tetap utuh)
    if ((await prisma.headerOrder.count({ where: { employeeId: target.id } })) > 0)
      return { ok: false, error: `${target.name} already handled orders and cannot be deleted.` };

    await prisma.employee.delete({ where: { id: target.id } });
  } catch (err) {
    console.error(err);
    return { ok: false, error: 'Employee could not be deleted.' };
  }

  revalidatePath('/manage-employee');
  return { ok: true };
}
