import type { Alerta } from '../types';

/** Días de antelación con los que un vencimiento pasa a «vence pronto». */
export const DIAS_VENCE_PRONTO = 14;

export type EstadoAlerta = 'vencida' | 'pronto' | 'programada' | 'atendida';

/** Alertas que la app enseña: las antiguas de «mantenimiento» (km + 15.000) ya no existen para el usuario. */
export const alertasVisibles = (alertas: Alerta[]): Alerta[] => alertas.filter(a => (a.tipo as string) !== 'mantenimiento');

/** Días hasta la fecha (AAAA-MM-DD) desde `hoy`; negativo si ya pasó. null si la fecha no es válida. */
export function diasHasta(fecha: string | undefined, hoy: string): number | null {
  if (!fecha) return null;
  const a = Date.parse(`${hoy}T00:00:00Z`), b = Date.parse(`${fecha}T00:00:00Z`);
  if (Number.isNaN(a) || Number.isNaN(b)) return null;
  return Math.round((b - a) / 86_400_000);
}

/** Situación de una alerta respecto a hoy. Sin fecha límite cuenta como programada. */
export function estadoAlerta(alerta: Pick<Alerta, 'estado' | 'fechaLimite'>, hoy: string): EstadoAlerta {
  if (alerta.estado === 'atendida') return 'atendida';
  const d = diasHasta(alerta.fechaLimite, hoy);
  if (d === null) return 'programada';
  if (d < 0) return 'vencida';
  return d <= DIAS_VENCE_PRONTO ? 'pronto' : 'programada';
}

export interface ResumenAlertas { vencidas: number; pronto: number; programadas: number; atendidas: number }

export function resumenAlertas(alertas: Alerta[], hoy: string): ResumenAlertas {
  const r: ResumenAlertas = { vencidas: 0, pronto: 0, programadas: 0, atendidas: 0 };
  for (const a of alertasVisibles(alertas)) {
    const e = estadoAlerta(a, hoy);
    if (e === 'vencida') r.vencidas++; else if (e === 'pronto') r.pronto++; else if (e === 'programada') r.programadas++; else r.atendidas++;
  }
  return r;
}

/** Lo que pide atención ya: vencidas + las que vencen pronto. Es el número del globito de la pestaña. */
export const alertasUrgentes = (alertas: Alerta[], hoy: string): number => {
  const r = resumenAlertas(alertas, hoy);
  return r.vencidas + r.pronto;
};

/** Orden de la lista: primero lo más urgente (vencidas, luego por fecha), las atendidas al final. */
export function ordenarAlertas(alertas: Alerta[], hoy: string): Alerta[] {
  const peso = (a: Alerta) => (estadoAlerta(a, hoy) === 'atendida' ? 1 : 0);
  return [...alertas].sort((x, y) => peso(x) - peso(y) || (x.fechaLimite ?? '9999').localeCompare(y.fechaLimite ?? '9999'));
}

/** «Vencida hace 12 días», «Vence hoy», «Vence mañana», «Vence en 9 días», «Programada». */
export function textoPlazo(alerta: Pick<Alerta, 'estado' | 'fechaLimite'>, hoy: string): string {
  const e = estadoAlerta(alerta, hoy);
  if (e === 'atendida') return 'Atendida';
  const d = diasHasta(alerta.fechaLimite, hoy);
  if (d === null) return 'Programada';
  if (d < 0) return `Vencida hace ${-d} ${d === -1 ? 'día' : 'días'}`;
  if (d === 0) return 'Vence hoy';
  if (d === 1) return 'Vence mañana';
  return e === 'pronto' ? `Vence en ${d} días` : `Programada · en ${d} días`;
}
