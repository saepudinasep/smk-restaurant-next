import {
  BarChart3Icon,
  ClipboardListIcon,
  CreditCardIcon,
  LayoutDashboardIcon,
  ReceiptTextIcon,
  UserIcon,
  UsersIcon,
  UtensilsIcon,
} from 'lucide-react';

// Daftar SEMUA menu. Menu yang tampil di sidebar disaring per peran lewat filterNavByRole()
// di lib/access.ts, jadi aturan akses cukup ditulis di satu tempat.
export const navMain = [
  { title: 'Dashboard', url: '/dashboard', icon: LayoutDashboardIcon },
  { title: 'Manage Employee', url: '/manage-employee', icon: UserIcon },
  { title: 'Manage Menu', url: '/manage-menu', icon: UtensilsIcon },
  { title: 'Manage Member', url: '/manage-member', icon: UsersIcon },
  { title: 'Orders', url: '/orders', icon: ClipboardListIcon },
  { title: 'View Orders', url: '/view-orders', icon: ReceiptTextIcon },
  { title: 'Payments', url: '/payments', icon: CreditCardIcon },
  { title: 'Reports', url: '/reports', icon: BarChart3Icon },
];

// Halaman yang tidak muncul di sidebar (dibuka dari menu user), tetapi butuh judul di header.
export const extraPages = [
  { title: 'Account', url: '/account' },
  { title: 'Notifications', url: '/notifications' },
];
