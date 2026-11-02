import type { Reserva, Vehiculo } from '../types';
import { diasAlquiler } from './solicitudes';

/** El vehículo ofrece seguro a todo riesgo si tiene un precio por día definido. */
export const ofreceSeguro = (v?: Pick<Vehiculo, 'seguroAmpliadoDia'> | null): boolean =>
  v?.seguroAmpliadoDia != null;

/** Total de un alquiler: días × tarifa, más el seguro por día si se contrata y el vehículo lo ofrece. */
export function totalAlquiler(dias: number, tarifaDia: number, seguroDia: number | null | undefined, conSeguro: boolean): number {
  const seguro = conSeguro && seguroDia != null ? dias * seguroDia : 0;
  return dias * tarifaDia + seguro;
}

/** Total que corresponde a una reserva con `dias` días, con la tarifa y el seguro que la propia reserva guarda. */
export function totalDeReserva(r: Pick<Reserva, 'tarifaDiaria' | 'seguroDia' | 'incluyeSeguroTodoRiesgo'>, dias: number): number {
  return totalAlquiler(dias, r.tarifaDiaria, r.seguroDia, r.incluyeSeguroTodoRiesgo);
}

const centimos = (n: number) => Math.round(n * 100);

/**
 * Qué pasa con los días y el total al cambiar las horas de una reserva. El total solo se recalcula en
 * reservas manuales cuyo total era exactamente días × tarifa: nunca en las de la web (el precio lo pone la
 * web) ni si el total se había pactado distinto.
 */
export function totalTrasCambioDeHoras(
  r: Pick<Reserva, 'fechaInicio' | 'fechaFin' | 'horaInicio' | 'horaFin' | 'tarifaDiaria' | 'seguroDia' | 'incluyeSeguroTodoRiesgo' | 'totalCobrado' | 'origen'>,
  horaInicio: string, horaFin: string,
): { diasAntes: number; diasDespues: number; total: number; recalculado: boolean } {
  const diasAntes = diasAlquiler(r.fechaInicio, r.fechaFin, r.horaInicio, r.horaFin);
  const diasDespues = diasAlquiler(r.fechaInicio, r.fechaFin, horaInicio, horaFin);
  const puedeRecalcular = diasAntes !== diasDespues && r.origen !== 'web' && centimos(r.totalCobrado) === centimos(totalDeReserva(r, diasAntes));
  return { diasAntes, diasDespues, total: puedeRecalcular ? totalDeReserva(r, diasDespues) : r.totalCobrado, recalculado: puedeRecalcular };
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
