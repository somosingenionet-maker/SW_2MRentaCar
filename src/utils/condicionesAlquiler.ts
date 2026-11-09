import type { Reserva, Vehiculo } from '../types';
import { diasAlquiler } from './solicitudes';
import { totalExtras, recalcularExtras } from './complementos';

/** El vehículo ofrece seguro a todo riesgo si tiene un precio por día definido. */
export const ofreceSeguro = (v?: Pick<Vehiculo, 'seguroAmpliadoDia'> | null): boolean =>
  v?.seguroAmpliadoDia != null;

/**
 * Total de un alquiler: días × tarifa (o el precio cerrado, si lo hay), más el seguro por día si se contrata y el
 * vehículo lo ofrece. El precio cerrado es solo el del alquiler: el seguro por día se suma aparte.
 */
export function totalAlquiler(dias: number, tarifaDia: number, seguroDia: number | null | undefined, conSeguro: boolean, precioFijo?: number | null): number {
  const seguro = conSeguro && seguroDia != null ? dias * seguroDia : 0;
  return Math.round(((precioFijo ?? dias * tarifaDia) + seguro) * 100) / 100;
}

/** Tarifa por día de referencia de un precio cerrado (se muestra en listados; el cobro es el precio cerrado). */
export const tarifaDeReferencia = (precioFijo: number, dias: number): number => Math.round((precioFijo / Math.max(1, dias)) * 100) / 100;

/** Total que corresponde a una reserva con `dias` días: alquiler y seguro, más sus complementos (los de precio por día se recalculan). */
export function totalDeReserva(r: Pick<Reserva, 'tarifaDiaria' | 'seguroDia' | 'incluyeSeguroTodoRiesgo' | 'precioFijo'> & { extras?: Reserva['extras'] }, dias: number): number {
  return Math.round((totalAlquiler(dias, r.tarifaDiaria, r.seguroDia, r.incluyeSeguroTodoRiesgo, r.precioFijo) + totalExtras(r.extras, dias)) * 100) / 100;
}

const centimos = (n: number) => Math.round(n * 100);

type DatosCambio = Pick<Reserva, 'fechaInicio' | 'fechaFin' | 'horaInicio' | 'horaFin' | 'tarifaDiaria' | 'precioFijo' | 'seguroDia' | 'incluyeSeguroTodoRiesgo' | 'totalCobrado' | 'origen' | 'extras'>;

/** Fechas y horas nuevas de una reserva; lo que no se indica se queda como está. */
export type PeriodoNuevo = Partial<Pick<Reserva, 'fechaInicio' | 'fechaFin' | 'horaInicio' | 'horaFin'>>;

/**
 * Qué pasa con los días y el total al cambiar las fechas o las horas de una reserva. El total solo se recalcula en
 * reservas manuales cuyo total era exactamente días × tarifa (o el precio cerrado más seguro y complementos): nunca en
 * las de la web (el precio lo pone la web) ni si el total se había pactado distinto. Cuando no se recalcula,
 * `proporcional` es una propuesta (el total actual más los días de más o de menos a la tarifa de la reserva) para que
 * quien la edite la confirme o la corrija.
 */
export function totalTrasCambioDePeriodo(
  r: DatosCambio, nuevo: PeriodoNuevo,
): { diasAntes: number; diasDespues: number; total: number; recalculado: boolean; extras: Reserva['extras']; proporcional: number } {
  const diasAntes = diasAlquiler(r.fechaInicio, r.fechaFin, r.horaInicio, r.horaFin);
  const diasDespues = diasAlquiler(nuevo.fechaInicio ?? r.fechaInicio, nuevo.fechaFin ?? r.fechaFin, nuevo.horaInicio ?? r.horaInicio, nuevo.horaFin ?? r.horaFin);
  const puedeRecalcular = diasAntes !== diasDespues && r.origen !== 'web' && centimos(r.totalCobrado) === centimos(totalDeReserva(r, diasAntes));
  const porDia = r.precioFijo != null ? 0 : r.tarifaDiaria + (r.incluyeSeguroTodoRiesgo ? r.seguroDia ?? 0 : 0);
  return {
    diasAntes, diasDespues, recalculado: puedeRecalcular,
    total: puedeRecalcular ? totalDeReserva(r, diasDespues) : r.totalCobrado,
    // Los importes de los complementos por día cambian con los días, igual que el total.
    extras: puedeRecalcular ? recalcularExtras(r.extras, diasDespues) : r.extras,
    proporcional: Math.max(0, Math.round((r.totalCobrado + (diasDespues - diasAntes) * porDia) * 100) / 100),
  };
}

/** Caso particular: solo cambian las horas. */
export function totalTrasCambioDeHoras(r: DatosCambio, horaInicio: string, horaFin: string) {
  const { proporcional: _proporcional, ...resto } = totalTrasCambioDePeriodo(r, { horaInicio, horaFin });
  return resto;
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
