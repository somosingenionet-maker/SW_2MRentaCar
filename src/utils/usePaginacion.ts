import { useCallback, useEffect, useMemo, useState } from 'react';

export const OPCIONES_POR_PAGINA = [10, 30, 50] as const;

const leerTamano = (clave: string, defecto: number): number => {
  try {
    const guardado = Number(localStorage.getItem(`2m_pagina_${clave}`));
    return (OPCIONES_POR_PAGINA as readonly number[]).includes(guardado) ? guardado : defecto;
  } catch {
    return defecto;
  }
};

/**
 * Paginación de una lista con selector de cuántas filas ver (10, 30 o 50).
 * `clave` identifica la lista para recordar la elección entre visitas.
 * `reiniciarCuando`: texto que cambia con los filtros activos; al cambiar, vuelve a la página 1.
 * Si la lista se acorta (un filtro, un borrado) y la página actual deja de existir, vuelve a la última.
 */
export function usePaginacion<T>(items: T[], clave: string, reiniciarCuando = '', porDefecto: number = OPCIONES_POR_PAGINA[0]) {
  const [pageSize, setPageSizeState] = useState(() => leerTamano(clave, porDefecto));
  const [page, setPage] = useState(1);
  // Si cambia el filtro, se vuelve a la primera página (patrón de React: ajustar el estado durante el render).
  const [filtroAnterior, setFiltroAnterior] = useState(reiniciarCuando);
  if (filtroAnterior !== reiniciarCuando) {
    setFiltroAnterior(reiniciarCuando);
    setPage(1);
  }

  const totalPaginas = Math.max(1, Math.ceil(items.length / pageSize));
  useEffect(() => {
    if (page > totalPaginas) setPage(totalPaginas);
  }, [page, totalPaginas]);

  const setPageSize = useCallback((n: number) => {
    setPageSizeState(n);
    setPage(1);
    try { localStorage.setItem(`2m_pagina_${clave}`, String(n)); } catch { /* sin almacenamiento: no se recuerda */ }
  }, [clave]);

  const visibles = useMemo(() => items.slice((page - 1) * pageSize, page * pageSize), [items, page, pageSize]);

  return {
    /** Las filas de la página actual. */
    items: visibles,
    page,
    setPage,
    /** Para pasar tal cual a <Pagination {...paginacion.props} />. */
    props: { currentPage: page, totalItems: items.length, pageSize, onPageChange: setPage, onPageSizeChange: setPageSize },
  };
}
