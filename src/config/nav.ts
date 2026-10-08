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
