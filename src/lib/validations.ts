import { z } from 'zod';

import { ROLES } from '@/lib/access';

// Batas panjang mengikuti data dictionary SMK Restaurant (LKS SMK XXVI 2018).
// Skema dipakai oleh Server Action; form di browser memakai aturan yang sama untuk pesan cepat.

// Pengguna bisa membuka form di zona waktu yang lebih maju dari UTC (mis. WIB); beri toleransi 1 hari.
const latestJoinDate = () => new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().slice(0, 10);

export const memberSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, 'Name is required.')
    .max(50, 'Name must be at most 50 characters.'),
  email: z
    .string()
    .trim()
    .toLowerCase()
    .min(1, 'Email is required.')
    .max(50, 'Email must be at most 50 characters.')
    .pipe(z.email('Enter a valid email address.')),
  handphone: z.string().regex(/^\d{10,13}$/, 'Handphone must be 10-13 digits.'),
  joinDate: z.iso
    .date('Join date must be a valid date.')
    .refine((d) => d <= latestJoinDate(), 'Join date cannot be in the future.'),
});

// Saat update, ID tampilan (M0000001) menunjuk baris yang diubah
export const memberUpdateSchema = memberSchema.extend({
  memberId: z.string().trim().min(1, 'Member ID is required.').max(8),
});

export const employeeSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, 'Name is required.')
    .max(100, 'Name must be at most 100 characters.'),
  email: z
    .string()
    .trim()
    .toLowerCase()
    .min(1, 'Email is required.')
    .max(50, 'Email must be at most 50 characters.')
    .pipe(z.email('Enter a valid email address.')),
  handphone: z.string().regex(/^\d{10,13}$/, 'Handphone must be 10-13 digits.'),
  position: z.enum(ROLES, 'Position must be Admin, Chef or Cashier.'),
});

// Saat update, ID tampilan (E00001) menunjuk baris yang diubah
export const employeeUpdateSchema = employeeSchema.extend({
  employeeId: z.string().trim().min(1, 'Employee ID is required.').max(6),
});

export const menuSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, 'Name is required.')
    .max(50, 'Name must be at most 50 characters.'),
  price: z
    .number('Price must be a number.')
    .int('Price must be a whole number.')
    .min(1, 'Price must be greater than 0.')
    .max(999_999_999, 'Price is too high.'),
  // public_id aset Cloudinary yang baru di-upload; kosong = pakai foto yang sudah ada
  photoPublicId: z.string().trim().max(200).optional(),
});

// Saat update, MenuID (angka) menunjuk baris yang diubah
export const menuUpdateSchema = menuSchema.extend({
  menuId: z.number().int().min(1),
});

export const orderSchema = z.object({
  memberId: z.string().trim().min(1, 'Select a member for this order.').max(8),
  items: z
    .array(
      z.object({
        menuId: z.number().int().min(1),
        qty: z
          .number()
          .int()
          .min(1, 'Quantity must be at least 1.')
          .max(99, 'Quantity must be at most 99.'),
      }),
    )
    .min(1, 'Add at least one menu to the order.')
    .max(50, 'An order can contain at most 50 different menus.')
    .refine(
      (items) => new Set(items.map((i) => i.menuId)).size === items.length,
      'Each menu can only appear once.',
    ),
});

export const ITEM_STATUSES = ['Pending', 'Cooking', 'Deliver'] as const;

export const dishStatusSchema = z.object({
  // id rincian order = ObjectId MongoDB (24 karakter heksadesimal)
  detailIds: z
    .array(z.string().regex(/^[0-9a-f]{24}$/, 'Invalid dish.'))
    .min(1)
    .max(50),
  status: z.enum(ITEM_STATUSES, 'Status must be Pending, Cooking or Deliver.'),
});

export const PAYMENT_TYPES = ['Cash', 'Credit Card', 'Debit Card'] as const;
export const BANKS = ['BNI', 'BCA', 'BRI', 'Mandiri'] as const;
export type PaymentType = (typeof PAYMENT_TYPES)[number];
export type Bank = (typeof BANKS)[number];

// Pembayaran divalidasi bertahap: (1) order + tipe, lalu (2) isian sesuai tipe.
// Nomor kartu SENGAJA tidak ikut dikirim ke server: ERD tidak menyimpannya, jadi hanya diperiksa di browser.
export const payBaseSchema = z.object({
  orderId: z.string().trim().min(1, 'Order is required.').max(10),
  payment: z.enum(PAYMENT_TYPES, 'Select a payment type.'),
});
export const payCashSchema = z.object({
  received: z
    .number('Amount received is required.')
    .int('Amount received must be a whole number.')
    .min(0)
    .max(9_999_999_999),
});
export const payCardSchema = z.object({
  bank: z.enum(BANKS, 'Select the bank.'),
});
