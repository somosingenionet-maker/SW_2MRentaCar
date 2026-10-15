import { ChevronLeft, ChevronRight } from 'lucide-react';
import { OPCIONES_POR_PAGINA } from '../utils/usePaginacion';

interface PaginationProps {
  currentPage: number;
  totalItems: number;
  pageSize: number;
  onPageChange: (page: number) => void;
  /** Si se pasa, se muestra el selector "Mostrar 10 / 30 / 50". */
  onPageSizeChange?: (size: number) => void;
}

export default function Pagination({ currentPage, totalItems, pageSize, onPageChange, onPageSizeChange }: PaginationProps) {
  const totalPages = Math.ceil(totalItems / pageSize);
  // El selector solo hace falta si la lista puede llegar a no caber en la primera opción.
  const verSelector = !!onPageSizeChange && totalItems > OPCIONES_POR_PAGINA[0];
  if (totalPages <= 1 && !verSelector) return null;

  const start = totalItems === 0 ? 0 : (currentPage - 1) * pageSize + 1;
  const end = Math.min(currentPage * pageSize, totalItems);

  return (
    <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 pt-3 border-t border-slate-100 text-xs text-slate-500">
      <div className="flex items-center gap-3">
        {verSelector && (
          <label className="flex items-center gap-1.5 font-medium">
            Mostrar
            <select
              value={pageSize}
              onChange={e => onPageSizeChange!(Number(e.target.value))}
              className="border border-slate-200 rounded-lg px-2 py-1 text-xs font-bold text-slate-700 bg-white focus:outline-none focus:ring-1 focus:ring-blue-500 cursor-pointer"
            >
              {OPCIONES_POR_PAGINA.map(n => <option key={n} value={n}>{n}</option>)}
            </select>
          </label>
        )}
        <span className="font-medium">
          {start}–{end} de <strong className="text-slate-700">{totalItems}</strong>
        </span>
      </div>

      {totalPages > 1 && (
        <div className="flex items-center gap-1">
          <button
            onClick={() => onPageChange(currentPage - 1)}
            disabled={currentPage === 1}
            aria-label="Página anterior"
            className="p-1.5 rounded-lg hover:bg-slate-100 disabled:opacity-30 disabled:cursor-not-allowed transition cursor-pointer"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>

          {Array.from({ length: totalPages }, (_, i) => i + 1)
            .filter(p => p === 1 || p === totalPages || Math.abs(p - currentPage) <= 1)
            .reduce<(number | '…')[]>((acc, p, idx, arr) => {
              if (idx > 0 && typeof arr[idx - 1] === 'number' && (p as number) - (arr[idx - 1] as number) > 1) {
                acc.push('…');
              }
              acc.push(p);
              return acc;
            }, [])
            .map((p, idx) =>
              p === '…' ? (
                <span key={`ellipsis-${idx}`} className="px-1 text-slate-300">…</span>
              ) : (
                <button
                  key={p}
                  onClick={() => onPageChange(p as number)}
                  className={`w-7 h-7 rounded-lg text-xs font-bold transition cursor-pointer ${
                    p === currentPage
                      ? 'bg-blue-600 text-white'
                      : 'hover:bg-slate-100 text-slate-600'
                  }`}
                >
                  {p}
                </button>
              )
            )}

          <button
            onClick={() => onPageChange(currentPage + 1)}
            disabled={currentPage === totalPages}
            aria-label="Página siguiente"
            className="p-1.5 rounded-lg hover:bg-slate-100 disabled:opacity-30 disabled:cursor-not-allowed transition cursor-pointer"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  );
}
