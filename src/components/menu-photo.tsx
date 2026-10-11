'use client';

import * as React from 'react';
import { ImageIcon } from 'lucide-react';

import { optimizeCloudinary, resolvePhotoSrc } from '@/lib/photo';
import { cn } from '@/lib/utils';

export type MenuPhotoSource = {
  name: string;
  /** Nilai kolom photo: url Cloudinary, path lokal, atau nama file di /public/menus */
  photo: string;
  /** Pratinjau sementara (object URL) saat file baru dipilih di form, sebelum disimpan */
  photoUrl?: string;
};

/** Foto menu; kalau file tidak ditemukan tampil placeholder, bukan gambar rusak. */
export function MenuPhoto({
  menu,
  className = 'size-10',
}: {
  menu: MenuPhotoSource;
  className?: string;
}) {
  const src = menu.photoUrl ?? optimizeCloudinary(resolvePhotoSrc(menu.photo));
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
    // eslint-disable-next-line @next/next/no-img-element -- url Cloudinary / object URL, tidak memakai next/image
    <img
      src={src}
      alt={menu.name}
      onError={() => setFailedSrc(src)}
      className={cn('shrink-0 rounded-md border object-cover', className)}
    />
  );
}
