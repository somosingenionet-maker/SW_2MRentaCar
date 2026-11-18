import type { AmpliacionReserva } from '../types';

const r2 = (n: number) => Math.round(n * 100) / 100;

interface Cambio {
  diasAntes: number;
  diasDespues: number;
  totalAntes: number;
  totalDespues: number;
  /** Fecha de devolución (AAAA-MM-DD) tras el cambio. */
  fechaFinNueva: string;
}

/**
 * Qué ampliaciones quedan guardadas tras cambiar las fechas de un alquiler.
 *  · Más días: el total y los días de antes se conservan como «inicial» (solo la primera vez) y los días nuevos, con lo que cuestan
 *    (diferencia de total), se anotan como una ampliación.
 *  · Menos días: se quitan primero de la última ampliación. Si se acorta por debajo de lo inicial, ya no hay ampliación que enseñar.
 *  · Mismos días: no cambia nada (una corrección de precio no sabe a qué parte pertenece).
 */
export function ampliacionTrasCambio(previa: AmpliacionReserva | null | undefined, c: Cambio): AmpliacionReserva | null {
  const dif = c.diasDespues - c.diasAntes;
  const previaValida = previa && previa.extras.length > 0 ? previa : null;
  if (dif === 0) return previaValida;
  if (dif > 0) {
    const base = previaValida ?? { diasBase: c.diasAntes, totalBase: c.totalAntes, extras: [] };
    return { ...base, extras: [...base.extras, { dias: dif, importe: r2(c.totalDespues - c.totalAntes), hasta: c.fechaFinNueva }] };
  }
  if (!previaValida) return null;
  let quitar = -dif;
  let ajusteTotal = c.totalDespues - c.totalAntes; // negativo al acortar
  const extras = previaValida.extras.map(e => ({ ...e }));
  while (quitar > 0 && extras.length > 0) {
    const ultima = extras[extras.length - 1];
    const toma = Math.min(quitar, ultima.dias);
    ultima.dias -= toma;
    quitar -= toma;
    ultima.importe = r2(Math.max(0, ultima.importe + ajusteTotal));
    ajusteTotal = 0;
    ultima.hasta = c.fechaFinNueva;
    if (ultima.dias <= 0) extras.pop();
  }
  if (quitar > 0 || extras.length === 0) return null;
  return { ...previaValida, extras };
}

/**
 * Cuando se cambia el precio o los complementos de una reserva ampliada, esa diferencia pasa al importe inicial
 * (así el total sigue siendo la suma de lo inicial y las ampliaciones).
 */
export function ajustarBaseAmpliacion(previa: AmpliacionReserva | null | undefined, diferencia: number): AmpliacionReserva | null {
  if (!previa || previa.extras.length === 0) return null;
  return { ...previa, totalBase: r2(previa.totalBase + diferencia) };
}
