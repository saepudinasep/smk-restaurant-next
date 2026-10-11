// Kategori menu. Nilainya sama dengan enum MenuCategory di prisma/schema.prisma.

export const MENU_CATEGORIES = ['Food', 'Drink', 'Dessert'] as const;
export type MenuCategory = (typeof MENU_CATEGORIES)[number];

/** Nilai filter di UI: semua kategori atau salah satunya. */
export type CategoryFilter = 'all' | MenuCategory;

/** Nama satu menu, mis. di badge dan form. */
export const CATEGORY_LABEL: Record<MenuCategory, string> = {
  Food: 'Food',
  Drink: 'Drink',
  Dessert: 'Dessert',
};

/** Nama kelompok, mis. di tab filter. */
export const CATEGORY_TAB_LABEL: Record<MenuCategory, string> = {
  Food: 'Food',
  Drink: 'Drinks',
  Dessert: 'Desserts',
};

/** Penjualan satu kategori: pendapatan (Rupiah) dan jumlah porsi, hanya dari order yang sudah dibayar. */
export type CategorySales = { income: number; portions: number };
export type SalesByCategory = Record<MenuCategory, CategorySales>;

export const emptySalesByCategory = (): SalesByCategory => ({
  Food: { income: 0, portions: 0 },
  Drink: { income: 0, portions: 0 },
  Dessert: { income: 0, portions: 0 },
});

/** Menjumlahkan beberapa ringkasan (mis. beberapa bulan) menjadi satu daftar per kategori. */
export function sumSalesByCategory(list: SalesByCategory[]): { category: MenuCategory; income: number; portions: number }[] {
  return MENU_CATEGORIES.map((category) => ({
    category,
    income: list.reduce((sum, s) => sum + s[category].income, 0),
    portions: list.reduce((sum, s) => sum + s[category].portions, 0),
  }));
}
