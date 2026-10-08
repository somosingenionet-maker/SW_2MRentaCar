import { useCallback, useMemo, useState } from 'react';

/**
 * Elemento "abierto" en un panel de detalle (ficha de cliente, vehículo, orden...).
 * Guarda solo su id y lo busca siempre en la lista vigente: así el panel refleja
 * los cambios, y si la app recarga los datos reales tras un guardado fallido,
 * el panel también vuelve al estado guardado (con una copia propia se quedaría
 * enseñando algo que no existe). Si el elemento desaparece, el panel se cierra.
 */
export function useSeleccion<T extends { id: string }>(lista: T[]): [T | null, (item: T | null) => void] {
  const [id, setId] = useState<string | null>(null);
  const seleccionado = useMemo(() => (id ? lista.find(x => x.id === id) ?? null : null), [lista, id]);
  const seleccionar = useCallback((item: T | null) => setId(item ? item.id : null), []);
  return [seleccionado, seleccionar];
}
