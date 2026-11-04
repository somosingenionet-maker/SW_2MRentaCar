import type { Reserva } from '../types';
import { parseFianza, tarifaDeReferencia, totalDeReserva } from './condicionesAlquiler';

export type ModoPrecio = 'fijo' | 'dia';

type DatosPrecio = Pick<Reserva, 'seguroDia' | 'incluyeSeguroTodoRiesgo' | 'extras' | 'descuento'>;

/** Importe escrito en un campo de precio: acepta coma o punto; null si está vacío, no es número o no es mayor que 0. */
export function importePositivo(texto: string): number | null {
  const n = parseFianza(texto);
  return n != null && n > 0 ? n : null;
}

/**
 * Cambia cómo se cobra el alquiler de una reserva: a un precio total pactado («fijo») o por días × tarifa («dia»).
 * El seguro y los complementos se suman aparte en los dos casos. Devuelve lo que hay que guardar, o el error.
 */
export function aplicarPrecio(
  r: DatosPrecio, modo: ModoPrecio, valor: string, dias: number,
): { ok: true; tarifaDiaria: number; precioFijo: number | null; totalCobrado: number } | { ok: false; error: string } {
  const importe = importePositivo(valor);
  if (importe == null) return { ok: false, error: modo === 'fijo' ? 'Indica el precio cerrado del alquiler (mayor que 0).' : 'Indica la tarifa por día (mayor que 0).' };
  const precioFijo = modo === 'fijo' ? importe : null;
  const tarifaDiaria = modo === 'fijo' ? tarifaDeReferencia(importe, dias) : importe;
  const bruto = totalDeReserva({ ...r, tarifaDiaria, precioFijo }, dias);
  return { ok: true, tarifaDiaria, precioFijo, totalCobrado: Math.round((bruto - (r.descuento ?? 0)) * 100) / 100 };
}

/** Lo que cuesta hoy el alquiler en sí (sin seguro ni complementos): el precio cerrado, o días × tarifa. */
export const importeAlquiler = (r: Pick<Reserva, 'precioFijo' | 'tarifaDiaria'>, dias: number): number =>
  r.precioFijo != null ? r.precioFijo : Math.round(dias * r.tarifaDiaria * 100) / 100;
