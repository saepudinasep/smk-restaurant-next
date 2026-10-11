import { requireRole } from '@/lib/auth-guard';
import type { Employee } from '@/lib/types';
import { prisma } from '@/lib/prisma';

export async function getEmployeesPageData() {
  await requireRole('Admin');

  const rows = await prisma.employee.findMany({ orderBy: { employeeCode: 'asc' } });

  // password tidak pernah diambil ke UI
  const employees: Employee[] = rows.map((e) => ({
    employeeId: e.employeeCode,
    name: e.name,
    email: e.email,
    handphone: e.handphone,
    position: e.position,
  }));

  return { employees };
}
