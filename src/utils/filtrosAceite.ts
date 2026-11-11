/** Filtros que se revisan en un cambio de aceite, en el orden en que se muestran. */
export const FILTROS_ACEITE = [
  { id: 'aire', nombre: 'Filtro de aire' },
  { id: 'aceite', nombre: 'Filtro de aceite' },
  { id: 'diesel', nombre: 'Filtro de diésel' },
  { id: 'habitaculo', nombre: 'Filtro de habitáculo' },
] as const;

export type FiltroId = (typeof FILTROS_ACEITE)[number]['id'];

/** true = cambiado, false = no se cambió (p. ej. un coche de gasolina no lleva filtro de diésel); ausente = sin revisar. */
export type EstadoFiltros = Partial<Record<FiltroId, boolean>>;

export function esFiltroId(v: unknown): v is FiltroId {
  return FILTROS_ACEITE.some(f => f.id === v);
}

/** Estado nuevo de un filtro al pulsar un botón: pulsar el que ya está activo quita la marca. */
export function siguienteEstadoFiltro(actual: boolean | undefined, pulsado: boolean): boolean | null {
  return actual === pulsado ? null : pulsado;
}

/** Filas de `ot_filtros` agrupadas por orden: { otId: { aire: true, diesel: false } }. */
export function agruparFiltros(filas: { otId: string; filtro: string; cambiado: boolean }[]): Record<string, EstadoFiltros> {
  const r: Record<string, EstadoFiltros> = {};
  for (const f of filas) if (esFiltroId(f.filtro)) (r[f.otId] ??= {})[f.filtro] = f.cambiado;
  return r;
}

/** Cuántos filtros siguen sin revisar. */
export function filtrosSinRevisar(estado: EstadoFiltros | undefined): number {
  return FILTROS_ACEITE.filter(f => estado?.[f.id] === undefined).length;
}

export type PartesResumen = { id: FiltroId; nombre: string; estado: 'cambiado' | 'no_cambiado' | 'sin_revisar' }[];

/** Los cuatro filtros con su estado, para pintar el resumen del historial. */
export function resumenFiltros(estado: EstadoFiltros | undefined): PartesResumen {
  return FILTROS_ACEITE.map(f => ({
    id: f.id, nombre: f.nombre,
    estado: estado?.[f.id] === undefined ? 'sin_revisar' : estado[f.id] ? 'cambiado' : 'no_cambiado',
  }));
}
