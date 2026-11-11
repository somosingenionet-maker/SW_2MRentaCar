/** Tiempos que el mecánico puede elegir al terminar una tarea, en minutos. */
export const OPCIONES_DURACION = [15, 30, 45, 60, 75, 90, 120, 150, 180, 240, 300, 360] as const;

/** «15 min», «1 h», «1 h 15 min», «2 h 30 min». Sin dato válido, cadena vacía. */
export function formatoDuracion(minutos: number | null | undefined): string {
  if (minutos == null || !Number.isFinite(minutos) || minutos <= 0) return '';
  const total = Math.round(minutos);
  const h = Math.floor(total / 60), m = total % 60;
  if (h === 0) return `${m} min`;
  return m === 0 ? `${h} h` : `${h} h ${m} min`;
}

/** Suma de las duraciones indicadas. `conDato` cuenta cuántas tareas la tienen (las antiguas no). */
export function tiempoRegistrado(duraciones: (number | null | undefined)[]): { minutos: number; conDato: number } {
  let minutos = 0, conDato = 0;
  for (const d of duraciones) if (typeof d === 'number' && d > 0) { minutos += d; conDato++; }
  return { minutos, conDato };
}

/** Horas que se cobran: la suma de la cantidad de las líneas de mano de obra (la cantidad es en horas). */
export function horasCobradas(lineas: { tipo: string; cantidad: number }[] | undefined): number {
  return (lineas ?? []).filter(l => l.tipo === 'mano_de_obra').reduce((s, l) => s + (Number.isFinite(l.cantidad) ? l.cantidad : 0), 0);
}

/** «2 h» / «1,5 h» (horas cobradas, con coma). */
export function formatoHorasCobradas(horas: number): string {
  return `${Number.isInteger(horas) ? horas : horas.toFixed(2).replace(/\.?0+$/, '').replace('.', ',')} h`;
}

/** Agrupa las filas de `ot_tareas` con duración: { otId: { lineaId: minutos } }. Las filas sin duración no entran. */
export function agruparDuraciones(filas: { otId: string; lineaId: string; duracionMin?: number | null }[]): Record<string, Record<string, number>> {
  const r: Record<string, Record<string, number>> = {};
  for (const f of filas) if (typeof f.duracionMin === 'number' && f.duracionMin > 0) (r[f.otId] ??= {})[f.lineaId] = f.duracionMin;
  return r;
}
