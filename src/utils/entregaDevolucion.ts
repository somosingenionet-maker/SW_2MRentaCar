import type { Reserva, MovimientoVehiculo, NivelCombustible } from '../types';

/** Niveles de combustible, de más a menos, con su valor en "cuartos de depósito". */
export const COMBUSTIBLES: { valor: NivelCombustible; etiqueta: string; cuartos: number }[] = [
  { valor: 'lleno', etiqueta: 'Lleno', cuartos: 4 },
  { valor: 'tres_cuartos', etiqueta: '3/4', cuartos: 3 },
  { valor: 'medio', etiqueta: '1/2', cuartos: 2 },
  { valor: 'cuarto', etiqueta: '1/4', cuartos: 1 },
  { valor: 'reserva', etiqueta: 'Reserva', cuartos: 0 },
];

export const etiquetaCombustible = (n?: NivelCombustible): string =>
  COMBUSTIBLES.find(c => c.valor === n)?.etiqueta ?? '—';

const cuartos = (n: NivelCombustible) => COMBUSTIBLES.find(c => c.valor === n)?.cuartos ?? 0;

/** Kilómetros hechos durante el alquiler, o null si falta alguno de los dos registros. */
export function kmRecorridos(entrega?: MovimientoVehiculo | null, devolucion?: MovimientoVehiculo | null): number | null {
  if (!entrega || !devolucion) return null;
  return devolucion.km - entrega.km;
}

/** Cuartos de depósito que faltan al devolver respecto a la entrega (0 si vuelve igual o con más). */
export function combustibleFaltante(entrega?: MovimientoVehiculo | null, devolucion?: MovimientoVehiculo | null): number {
  if (!entrega || !devolucion) return 0;
  return Math.max(0, cuartos(entrega.combustible) - cuartos(devolucion.combustible));
}

const dia = (iso: string) => iso.slice(0, 10);

/**
 * Último día que el coche está ocupado por esta reserva. Si se devolvió, el día real de la
 * devolución (puede liberar el coche antes de lo previsto); si pasó la fecha de fin y aún no
 * ha vuelto, sigue ocupado hasta hoy; en el resto, la fecha de fin prevista.
 */
export function finEfectivo(r: Reserva, hoy: string): string {
  if (r.devolucion) return dia(r.devolucion.fechaHora);
  if (r.entrega && r.fechaFin < hoy) return hoy;
  return r.fechaFin;
}

export type EstadoReserva = 'anulada' | 'finalizada' | 'retrasada' | 'en_curso' | 'por_entregar' | 'proxima' | 'activa';

/**
 * Estado de una reserva. Lo que se registró (entrega/devolución) manda sobre las fechas;
 * las reservas sin registros (anteriores a esta función) se interpretan por sus fechas, como antes.
 */
export function estadoReserva(r: Reserva, hoy: string): EstadoReserva {
  if (r.estado === 'cancelada') return 'anulada';
  if (r.devolucion) return 'finalizada';
  if (r.entrega) return r.fechaFin < hoy ? 'retrasada' : 'en_curso';
  if (r.fechaFin < hoy) return 'finalizada';
  if (r.fechaInicio > hoy) return 'proxima';
  return 'por_entregar';
}

/** Va al historial: anulada, devuelta, o terminada por fechas sin llegar a entregarse. */
export const esHistorica = (r: Reserva, hoy: string): boolean => {
  const e = estadoReserva(r, hoy);
  return e === 'anulada' || e === 'finalizada';
};

export const ESTADO_META: Record<EstadoReserva, { label: string; cls: string }> = {
  anulada:      { label: 'Anulada',             cls: 'bg-rose-50 text-rose-600' },
  finalizada:   { label: 'Finalizada',          cls: 'bg-slate-100 text-slate-500' },
  retrasada:    { label: 'Devolución retrasada', cls: 'bg-rose-100 text-rose-700' },
  en_curso:     { label: 'En curso',            cls: 'bg-emerald-50 text-emerald-600' },
  por_entregar: { label: 'Por entregar',        cls: 'bg-amber-50 text-amber-700' },
  proxima:      { label: 'Próxima',             cls: 'bg-blue-50 text-blue-600' },
  activa:       { label: 'Activa',              cls: 'bg-emerald-50 text-emerald-600' },
};
