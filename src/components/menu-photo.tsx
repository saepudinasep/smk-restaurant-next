'use client';

import * as React from 'react';
import { ImageIcon } from 'lucide-react';

import { cn } from '@/lib/utils';

// Foto bawaan diambil dari /public/menus/<nama-file>. Foto yang baru di-upload sementara
// ditampilkan lewat object URL (photoUrl) sampai ada penyimpanan sungguhan (mis. Cloudinary).
const PHOTO_DIR = '/menus';

export type MenuPhotoSource = { name: string; photo: string; photoUrl?: string };

/** Foto menu; kalau file tidak ditemukan tampil placeholder, bukan gambar rusak. */
export function MenuPhoto({
  menu,
  className = 'size-10',
}: {
  menu: MenuPhotoSource;
  className?: string;
}) {
  const src = menu.photoUrl ?? (menu.photo ? `${PHOTO_DIR}/${menu.photo}` : '');
  const [failedSrc, setFailedSrc] = React.useState('');

  if (!src || failedSrc === src) {
    return (
      <div
        role='img'
        aria-label={`No photo for ${menu.name || 'menu'}`}
        className={cn(
          'flex shrink-0 items-center justify-center rounded-md border bg-muted text-muted-foreground',
          className,
        )}
      >
        <ImageIcon className='size-1/3 max-h-8 max-w-8 min-h-4 min-w-4' />
      </div>
    );
  }
  return (
    // eslint-disable-next-line @next/next/no-img-element -- object URL / file lokal, tidak cocok untuk next/image
    <img
      src={src}
      alt={menu.name}
      onError={() => setFailedSrc(src)}
      className={cn('shrink-0 rounded-md border object-cover', className)}
    />
  );
}
