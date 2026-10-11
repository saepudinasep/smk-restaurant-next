import type { RoleName } from '@/lib/access';
import type { MenuCategory } from '@/lib/menu-categories';

// Bentuk data yang dipakai komponen UI. Nama field mengikuti Data Dictionary (camelCase);
// ID tampilan (M0000001, E00001, MenuID) berasal dari kolom *Code / menuNumber di database.

export type Member = {
  memberId: string; // nchar(8), mis. M0000001
  name: string; // nvarchar(50)
  email: string; // nvarchar(50)
  handphone: string; // nvarchar(13)
  joinDate: string; // YYYY-MM-DD
};

// Password tidak pernah dikirim ke UI.
export type Employee = {
  employeeId: string; // nchar(6), mis. E00001
  name: string; // nvarchar(100)
  email: string; // nvarchar(50)
  handphone: string; // nvarchar(13)
  position: RoleName; // Admin | Chef | Cashier
};

export type Menu = {
  menuId: number; // MenuID (integer)
  name: string; // nvarchar(50)
  price: number; // Rupiah
  category: MenuCategory; // Food | Drink | Dessert
  photo: string; // url Cloudinary, path lokal, atau nama file di /public/menus
};
