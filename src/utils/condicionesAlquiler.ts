import type { Vehiculo } from '../types';

/** El vehículo ofrece seguro a todo riesgo si tiene un precio por día definido. */
export const ofreceSeguro = (v?: Pick<Vehiculo, 'seguroAmpliadoDia'> | null): boolean =>
  v?.seguroAmpliadoDia != null;

/** Total de un alquiler: días × tarifa, más el seguro por día si se contrata y el vehículo lo ofrece. */
export function totalAlquiler(dias: number, tarifaDia: number, seguroDia: number | null | undefined, conSeguro: boolean): number {
  const seguro = conSeguro && seguroDia != null ? dias * seguroDia : 0;
  return dias * tarifaDia + seguro;
}

export const etiquetaTransmision = (t?: Vehiculo['transmision']): string =>
  t === 'automatico' ? 'Automático' : t === 'manual' ? 'Manual' : '—';

/** Valores por defecto al marcar un coche como de alquiler (los habituales de un turismo de 2M). */
export const CONDICIONES_POR_DEFECTO = { transmision: 'manual', fianza: 500, seguroAmpliadoDia: 15 } as const;

/** Texto inicial del campo «Fianza» de una reserva: el importe habitual del vehículo (0 si no tiene). */
export const fianzaSugerida = (v?: Pick<Vehiculo, 'fianza'> | null): string => String(v?.fianza ?? 0);

/**
 * Interpreta lo escrito en el campo «Fianza (€)». Acepta coma o punto decimal y redondea a céntimos.
 * Devuelve null si está vacío, no es un número o es negativo. El 0 es válido: «sin fianza».
 */
export function parseFianza(texto: string): number | null {
  const limpio = texto.trim().replace(',', '.');
  if (!/^\d+(\.\d+)?$/.test(limpio)) return null;
  const n = Math.round(Number(limpio) * 100) / 100;
  return Number.isFinite(n) ? n : null;
}
