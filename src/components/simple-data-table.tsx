'use client';

import * as React from 'react';
import {
  ChevronLeftIcon,
  ChevronRightIcon,
  ChevronsLeftIcon,
  ChevronsRightIcon,
  MoreHorizontalIcon,
  PencilIcon,
  Trash2Icon,
} from 'lucide-react';

import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Spinner } from '@/components/ui/spinner';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

export type Column<T> = {
  header: string;
  cell: (row: T) => React.ReactNode;
  className?: string;
};

type Props<T> = {
  data: T[];
  columns: Column<T>[];
  getRowId: (row: T) => string;
  /** Kalau diisi, kolom Search muncul. */
  searchText?: (row: T) => string;
  /** Kalau diisi, menu "Update" muncul di kolom Actions. */
  onEdit?: (row: T) => void;
  /** Teks menu aksi edit. Default "Update". */
  editLabel?: string;
  /** Kalau diisi, menu "Delete" muncul (dengan konfirmasi). */
  /**
   * Boleh async: dialog tetap terbuka dengan spinner sampai selesai.
   * Jika mengembalikan { ok: false, error }, dialog tetap terbuka dan menampilkan pesan error.
   */
  onDelete?: (row: T) => void | Promise<void | { ok: boolean; error?: string }>;
  /** Teks pada konfirmasi hapus, misal nama siswa. */
  getRowLabel?: (row: T) => string;
  pageSizeOptions?: number[];
  /** Tombol tambahan di sisi kanan toolbar, misal tombol Insert. */
  toolbarActions?: React.ReactNode;
  /** Tampilkan skeleton saat data sedang dibaca. */
  loading?: boolean;
};

export function SimpleDataTable<T>({
  data,
  columns,
  getRowId,
  searchText,
  onEdit,
  editLabel = 'Update',
  onDelete,
  getRowLabel,
  pageSizeOptions = [5, 10, 20],
  toolbarActions,
  loading = false,
}: Props<T>) {
  const [q, setQ] = React.useState('');
  const [page, setPage] = React.useState(0);
  const [pageSize, setPageSize] = React.useState(pageSizeOptions[0]);
  const [toDelete, setToDelete] = React.useState<T | null>(null);
  const [deleting, setDeleting] = React.useState(false);
  const [deleteError, setDeleteError] = React.useState('');

  const filtered = searchText
    ? data.filter((r) => searchText(r).toLowerCase().includes(q.toLowerCase()))
    : data;

  const pageCount = Math.max(1, Math.ceil(filtered.length / pageSize));
  const currentPage = Math.min(page, pageCount - 1); // otomatis mundur kalau data berkurang
  const start = currentPage * pageSize;
  const rows = filtered.slice(start, start + pageSize);
  const hasActions = Boolean(onEdit || onDelete);

  return (
    <div className='flex flex-col gap-3'>
      {(searchText || toolbarActions) && (
        <div className='flex items-center justify-between gap-2'>
          {searchText ? (
            <Input
              placeholder='Search...'
              value={q}
              onChange={(e) => {
                setQ(e.target.value);
                setPage(0);
              }}
              className='max-w-xs'
            />
          ) : (
            <span />
          )}
          {toolbarActions}
        </div>
      )}

      <div className='overflow-hidden rounded-lg border'>
        <Table>
          <TableHeader className='bg-muted'>
            <TableRow>
              {columns.map((c) => (
                <TableHead key={c.header} className={c.className}>
                  {c.header}
                </TableHead>
              ))}
              {hasActions && <TableHead className='w-12 text-right'>Actions</TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading &&
              Array.from({ length: pageSize }).map((_, i) => (
                <TableRow key={`skeleton-${i}`} aria-busy='true'>
                  {columns.map((c) => (
                    <TableCell key={c.header}>
                      <Skeleton className='h-4 w-full max-w-40' />
                    </TableCell>
                  ))}
                  {hasActions && (
                    <TableCell className='text-right'>
                      <Skeleton className='ml-auto size-6' />
                    </TableCell>
                  )}
                </TableRow>
              ))}
            {!loading &&
              rows.map((r) => (
                <TableRow key={getRowId(r)}>
                  {columns.map((c) => (
                    <TableCell key={c.header} className={c.className}>
                      {c.cell(r)}
                    </TableCell>
                  ))}
                  {hasActions && (
                    <TableCell className='text-right'>
                      <DropdownMenu>
                        <DropdownMenuTrigger render={<Button variant='ghost' size='icon-sm' />}>
                          <MoreHorizontalIcon />
                          <span className='sr-only'>Open actions</span>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align='end' className='w-32'>
                          {onEdit && (
                            <DropdownMenuItem onClick={() => onEdit(r)}>
                              <PencilIcon />
                              <span>{editLabel}</span>
                            </DropdownMenuItem>
                          )}
                          {onEdit && onDelete && <DropdownMenuSeparator />}
                          {onDelete && (
                            <DropdownMenuItem
                              variant='destructive'
                              onClick={() => {
                                setDeleteError('');
                                setToDelete(r);
                              }}
                            >
                              <Trash2Icon />
                              <span>Delete</span>
                            </DropdownMenuItem>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  )}
                </TableRow>
              ))}
            {!loading && rows.length === 0 && (
              <TableRow>
                <TableCell
                  colSpan={columns.length + (hasActions ? 1 : 0)}
                  className='h-24 text-center text-muted-foreground'
                >
                  No data found.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      <div className='flex flex-col items-center justify-between gap-3 text-sm sm:flex-row'>
        <div className='text-muted-foreground'>
          {loading ? (
            <span className='inline-flex items-center gap-2'>
              <Spinner />
              Loading data...
            </span>
          ) : filtered.length === 0 ? (
            '0 rows'
          ) : (
            `Showing ${start + 1}-${Math.min(start + pageSize, filtered.length)} of ${filtered.length}`
          )}
        </div>
        <div className='flex items-center gap-4'>
          <div className='flex items-center gap-2'>
            <span className='hidden sm:inline'>Rows per page</span>
            <Select
              value={String(pageSize)}
              onValueChange={(v) => {
                if (!v) return;
                setPageSize(Number(v));
                setPage(0);
              }}
            >
              <SelectTrigger size='sm' className='w-18' aria-label='Rows per page'>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {pageSizeOptions.map((n) => (
                  <SelectItem key={n} value={String(n)}>
                    {n}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <span className='tabular-nums'>
            Page {currentPage + 1} of {pageCount}
          </span>
          <div className='flex items-center gap-1'>
            <Button
              variant='outline'
              size='icon-sm'
              disabled={currentPage === 0}
              onClick={() => setPage(0)}
              aria-label='First page'
            >
              <ChevronsLeftIcon />
            </Button>
            <Button
              variant='outline'
              size='icon-sm'
              disabled={currentPage === 0}
              onClick={() => setPage(currentPage - 1)}
              aria-label='Previous page'
            >
              <ChevronLeftIcon />
            </Button>
            <Button
              variant='outline'
              size='icon-sm'
              disabled={currentPage >= pageCount - 1}
              onClick={() => setPage(currentPage + 1)}
              aria-label='Next page'
            >
              <ChevronRightIcon />
            </Button>
            <Button
              variant='outline'
              size='icon-sm'
              disabled={currentPage >= pageCount - 1}
              onClick={() => setPage(pageCount - 1)}
              aria-label='Last page'
            >
              <ChevronsRightIcon />
            </Button>
          </div>
        </div>
      </div>

      {/* Konfirmasi hapus — dialog di tengah layar */}
      <AlertDialog
        open={toDelete !== null}
        onOpenChange={(open) => !open && !deleting && setToDelete(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this row?</AlertDialogTitle>
            <AlertDialogDescription>
              {toDelete && getRowLabel ? `"${getRowLabel(toDelete)}" ` : 'This item '}
              will be permanently removed. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          {deleteError && (
            <p
              role='alert'
              className='rounded-lg border border-destructive/40 bg-destructive/5 px-3 py-2 text-sm text-destructive'
            >
              {deleteError}
            </p>
          )}
          <AlertDialogFooter>
            <Button variant='outline' disabled={deleting} onClick={() => setToDelete(null)}>
              Cancel
            </Button>
            <Button
              variant='destructive'
              disabled={deleting}
              onClick={async () => {
                if (!toDelete) return;
                setDeleting(true);
                setDeleteError('');
                try {
                  const result = await onDelete?.(toDelete);
                  if (result && result.ok === false) {
                    setDeleteError(result.error ?? 'Failed to delete.'); // dialog tetap terbuka
                  } else {
                    setToDelete(null);
                  }
                } catch {
                  setDeleteError('Network error. Please try again.');
                } finally {
                  setDeleting(false);
                }
              }}
            >
              {deleting && <Spinner />}
              {deleting ? 'Deleting...' : 'Delete'}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
