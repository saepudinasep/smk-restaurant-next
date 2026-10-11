'use client';

import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  CATEGORY_TAB_LABEL,
  MENU_CATEGORIES,
  type CategoryFilter as CategoryFilterValue,
  type MenuCategory,
} from '@/lib/menu-categories';

/** Tab filter kategori menu (All / Food / Drinks / Desserts) lengkap dengan jumlahnya. Dipakai di Manage Menu dan Orders. */
export function CategoryFilter({
  items,
  value,
  onChange,
}: {
  items: { category: MenuCategory }[];
  value: CategoryFilterValue;
  onChange: (value: CategoryFilterValue) => void;
}) {
  const count = (c: MenuCategory) => items.filter((i) => i.category === c).length;

  return (
    <Tabs value={value} onValueChange={(v) => onChange(v as CategoryFilterValue)}>
      <TabsList>
        <TabsTrigger value='all'>All ({items.length})</TabsTrigger>
        {MENU_CATEGORIES.map((c) => (
          <TabsTrigger key={c} value={c}>
            {CATEGORY_TAB_LABEL[c]} ({count(c)})
          </TabsTrigger>
        ))}
      </TabsList>
    </Tabs>
  );
}
