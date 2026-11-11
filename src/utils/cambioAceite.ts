import type { Vehiculo } from '../types';

export type DatosAceite = Pick<Vehiculo, 'aceiteFecha' | 'aceiteKm' | 'aceiteProximaFecha'>;

/** Días de antelación con los que el próximo cambio pasa a «próximo» (igual que ITV y seguro). */
const DIAS_AVISO_ACEITE = 30;

/** Vacío o solo espacios = sin dato. */
const hayFecha = (f: string | null | undefined): f is string => !!f && f.trim() !== '';

/** Dice qué está mal en los datos de aceite, o '' si están bien. El próximo cambio no puede ser anterior al último. */
export function errorCambioAceite(d: DatosAceite): string {
  if (d.aceiteKm != null && (!Number.isFinite(d.aceiteKm) || d.aceiteKm < 0)) return 'Los kilómetros del cambio de aceite no pueden ser negativos.';
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
export function normalizarAceite(d: DatosAceite): { aceiteFecha: string | null; aceiteKm: number | null; aceiteProximaFecha: string | null } {
  return {
    aceiteFecha: hayFecha(d.aceiteFecha) ? d.aceiteFecha : null,
    aceiteKm: d.aceiteKm == null || !Number.isFinite(Number(d.aceiteKm)) ? null : Math.round(Number(d.aceiteKm)),
    aceiteProximaFecha: hayFecha(d.aceiteProximaFecha) ? d.aceiteProximaFecha : null,
  };
}
