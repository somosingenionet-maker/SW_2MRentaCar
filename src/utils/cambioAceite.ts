import type { Vehiculo } from '../types';

export type DatosAceite = Pick<Vehiculo, 'aceiteFecha' | 'aceiteKm' | 'aceiteProximaFecha' | 'aceiteProximoKm'>;

/** Días de antelación con los que el próximo cambio pasa a «próximo» (igual que ITV y seguro). */
const DIAS_AVISO_ACEITE = 30;

/** Vacío o solo espacios = sin dato. */
const hayFecha = (f: string | null | undefined): f is string => !!f && f.trim() !== '';

/** Dice qué está mal en los datos de aceite, o '' si están bien. El próximo cambio no puede ser anterior al último. */
export function errorCambioAceite(d: DatosAceite): string {
  if (d.aceiteKm != null && (!Number.isFinite(d.aceiteKm) || d.aceiteKm < 0)) return 'Los kilómetros del cambio de aceite no pueden ser negativos.';
  if (d.aceiteProximoKm != null && (!Number.isFinite(d.aceiteProximoKm) || d.aceiteProximoKm < 0)) return 'Los km del próximo cambio de aceite no pueden ser negativos.';
  if (d.aceiteKm != null && d.aceiteProximoKm != null && d.aceiteProximoKm <= d.aceiteKm) {
    return 'Los km del próximo cambio de aceite tienen que ser mayores que los km del último cambio.';
  }
  if (hayFecha(d.aceiteFecha) && hayFecha(d.aceiteProximaFecha) && d.aceiteProximaFecha < d.aceiteFecha) {
    return 'La fecha del próximo cambio de aceite no puede ser anterior a la del último cambio.';
  }
  return '';
}

export type EstadoProximoCambio = 'vencido' | 'proximo' | 'al_dia';

/** Estado del próximo cambio respecto a `hoy` (AAAA-MM-DD); sin fecha de próximo cambio, null. */
export function estadoProximoCambio(proxima: string | null | undefined, hoy: string): EstadoProximoCambio | null {
  if (!hayFecha(proxima)) return null;
  if (proxima < hoy) return 'vencido';
  const limite = new Date(`${hoy}T00:00:00Z`);
  limite.setUTCDate(limite.getUTCDate() + DIAS_AVISO_ACEITE);
  return proxima <= limite.toISOString().slice(0, 10) ? 'proximo' : 'al_dia';
}

/** Para guardar: campos vacíos como null (en la base `undefined` no se envía y no se podría borrar un dato). */
export function normalizarAceite(d: DatosAceite): { aceiteFecha: string | null; aceiteKm: number | null; aceiteProximaFecha: string | null; aceiteProximoKm: number | null } {
  return {
    aceiteFecha: hayFecha(d.aceiteFecha) ? d.aceiteFecha : null,
    aceiteKm: d.aceiteKm == null || !Number.isFinite(Number(d.aceiteKm)) ? null : Math.round(Number(d.aceiteKm)),
    aceiteProximaFecha: hayFecha(d.aceiteProximaFecha) ? d.aceiteProximaFecha : null,
    aceiteProximoKm: d.aceiteProximoKm == null || !Number.isFinite(Number(d.aceiteProximoKm)) ? null : Math.round(Number(d.aceiteProximoKm)),
  };
}

/**
 * Al entregar una orden de cambio de aceite, la ficha del vehículo se actualiza con la fecha de entrega y los km de la orden
 * (los de salida si constan, si no los de entrada). El próximo cambio se borra: el anterior ya no vale y lo indica el taller.
 * Si la ficha ya tiene un cambio de esta visita o posterior (por ejemplo, lo anotó el mecánico al terminar), no se toca nada: devuelve null.
 */
export function aceiteTrasEntrega(
  actual: DatosAceite,
  ot: { fechaRecepcion?: string | null; fechaEntrega?: string | null; kilometrajeEntrada: number; kilometrajeSalida?: number | null },
  hoy: string,
): { aceiteFecha: string; aceiteKm: number | null; aceiteProximaFecha: null; aceiteProximoKm: null } | null {
  const fecha = hayFecha(ot.fechaEntrega) ? ot.fechaEntrega : hoy;
  if (hayFecha(actual.aceiteFecha) && actual.aceiteFecha >= (hayFecha(ot.fechaRecepcion) ? ot.fechaRecepcion : fecha)) return null;
  const km = ot.kilometrajeSalida || ot.kilometrajeEntrada;
  return { aceiteFecha: fecha, aceiteKm: km > 0 ? Math.round(km) : (actual.aceiteKm ?? null), aceiteProximaFecha: null, aceiteProximoKm: null };
}

const dos = (n: number) => String(n).padStart(2, '0');

/** Fecha (AAAA-MM-DD) tantos meses después de `desde`, sin pasarse de mes (31 ene + 1 mes = 28 feb). */
export function fechaMasMeses(desde: Date, meses: number): string {
  const total = desde.getFullYear() * 12 + desde.getMonth() + meses;
  const anio = Math.floor(total / 12), mes = total % 12;
  const ultimo = new Date(anio, mes + 1, 0).getDate();
  return `${anio}-${dos(mes + 1)}-${dos(Math.min(desde.getDate(), ultimo))}`;
}

/** Hoy (AAAA-MM-DD) con el reloj del aparato. */
export const hoyLocal = (ahora: Date = new Date()): string => `${ahora.getFullYear()}-${dos(ahora.getMonth() + 1)}-${dos(ahora.getDate())}`;
