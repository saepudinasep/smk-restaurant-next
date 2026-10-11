'use server';

import { compare, hash } from 'bcryptjs';
import { z } from 'zod';

import type { ActionResult, FieldResult } from '@/actions/result';
import { ROLES } from '@/lib/access';
import { requireRole } from '@/lib/auth-guard';
import { notifyEmployees } from '@/lib/notify';
import { isStrongPassword, PASSWORD_MAX } from '@/lib/password-rules';
import { prisma } from '@/lib/prisma';

// Batas panjang mengikuti data dictionary: Name 100, Handphone 13.
const profileSchema = z.object({
  name: z.string().trim().min(1).max(100),
  handphone: z.string().regex(/^\d{10,13}$/),
});

/** Karyawan mengubah profilnya sendiri. Email dan Position hanya bisa diubah Admin (Manage Employee). */
export async function updateProfile(input: {
  name: string;
  handphone: string;
}): Promise<ActionResult> {
  const me = await requireRole(...ROLES);

  const parsed = profileSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: 'Check the name and handphone, then try again.' };

  try {
    await prisma.employee.update({ where: { id: me.id }, data: parsed.data });
  } catch {
    return { ok: false, error: 'Could not save your profile. Please try again.' };
  }
  return { ok: true };
}

export type PasswordField = 'old' | 'new' | 'confirm' | 'form';

/** Form 08 Change Password: password lama benar, konfirmasi sama, dan password baru memenuhi aturan. */
export async function changePassword(input: {
  oldPassword: string;
  newPassword: string;
  confirmPassword: string;
}): Promise<FieldResult<PasswordField>> {
  const me = await requireRole(...ROLES);
  const { oldPassword, newPassword, confirmPassword } = input;

  if (typeof oldPassword !== 'string' || !oldPassword || oldPassword.length > PASSWORD_MAX)
    return { ok: false, field: 'old', error: 'Old password is required.' };
  if (typeof newPassword !== 'string' || !isStrongPassword(newPassword))
    return {
      ok: false,
      field: 'new',
      error: 'New password must contain an uppercase letter, a lowercase letter and a number.',
    };
  if (confirmPassword !== newPassword)
    return {
      ok: false,
      field: 'confirm',
      error: 'Confirm password does not match the new password.',
    };

  const employee = await prisma.employee.findUnique({
    where: { id: me.id },
    select: { password: true },
  });
  if (!employee || !(await compare(oldPassword, employee.password)))
    return { ok: false, field: 'old', error: 'Old password is incorrect.' };

  try {
    await prisma.employee.update({
      where: { id: me.id },
      data: { password: await hash(newPassword, 10) },
    });
  } catch {
    return { ok: false, field: 'form', error: 'Could not change your password. Please try again.' };
  }

  await notifyEmployees([me.id], {
    type: 'account',
    title: 'Password changed',
    message: 'Your password was changed successfully. If this was not you, ask an Admin for help.',
  });
  return { ok: true };
}
