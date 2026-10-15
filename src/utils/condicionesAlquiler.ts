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
