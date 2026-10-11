// Aturan password dari soal (form 08 Change Password): wajib mengandung huruf besar,
// huruf kecil, dan angka. Batas 50 karakter mengikuti kolom password (nvarchar 50).
// Dipakai oleh form (daftar centang) dan oleh Server Action, jadi aturannya cukup ditulis sekali.

export const PASSWORD_MAX = 50;

export const PASSWORD_RULES = [
  { key: 'upper', label: 'An uppercase letter (A-Z)', test: (p: string) => /[A-Z]/.test(p) },
  { key: 'lower', label: 'A lowercase letter (a-z)', test: (p: string) => /[a-z]/.test(p) },
  { key: 'number', label: 'A number (0-9)', test: (p: string) => /\d/.test(p) },
] as const;

export const isStrongPassword = (p: string) =>
  p.length <= PASSWORD_MAX && PASSWORD_RULES.every((r) => r.test(p));
