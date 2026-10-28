import { hoyISO, sumarDias } from './fechas';

export interface DatosCarnet {
  carnetNumero?: string;
  carnetExpedicion?: string;
  carnetVencimiento?: string;
}

/** Días antes del vencimiento a partir de los cuales el carnet se marca «vence pronto». */
export const DIAS_AVISO_CARNET = 60;

/** Valida las fechas del carnet de conducir. Devuelve el mensaje de error o null si todo es correcto. */
export function validarCarnet(d: DatosCarnet, hoy: string = hoyISO()): string | null {
  const exp = d.carnetExpedicion || '';
  const ven = d.carnetVencimiento || '';
  if (exp && exp > hoy) return 'La fecha de expedición del carnet no puede ser futura.';
  if (exp && ven && ven < exp) return 'La fecha de vencimiento del carnet no puede ser anterior a la de expedición.';
  return null;
}

export type EstadoCarnet = 'sin_dato' | 'vencido' | 'por_vencer' | 'vigente';

/** Estado del carnet según su fecha de vencimiento (el propio día de vencimiento todavía vale). */
export function estadoCarnet(vencimiento: string | undefined, hoy: string = hoyISO()): EstadoCarnet {
  if (!vencimiento) return 'sin_dato';
  if (vencimiento < hoy) return 'vencido';
  if (vencimiento <= sumarDias(hoy, DIAS_AVISO_CARNET)) return 'por_vencer';
  return 'vigente';
}

/** Línea de texto para el contrato: «12345678 · expedido 01/03/2020 · vence 01/03/2030». */
export function resumenCarnet(d: DatosCarnet, fmt: (iso: string) => string): string {
  const partes = [
    d.carnetNumero?.trim() || '',
    d.carnetExpedicion ? `expedido ${fmt(d.carnetExpedicion)}` : '',
    d.carnetVencimiento ? `vence ${fmt(d.carnetVencimiento)}` : '',
  ].filter(Boolean);
  return partes.join(' · ');
}
