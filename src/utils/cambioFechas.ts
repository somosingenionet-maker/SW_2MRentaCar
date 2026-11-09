import type { Reserva } from '../types';
import { totalTrasCambioDePeriodo } from './condicionesAlquiler';
import { validarHorasReserva } from './horaReserva';
import { aplicarPrecio, importePositivo } from './precioAlquiler';
import { recalcularExtras } from './complementos';
import { reservaQueOcupa } from './cambioVehiculo';
import { formatDate } from './dateFormat';

/** ¿Se pueden cambiar las fechas de esta reserva? Una vez entregado el coche, la fecha de entrega ya no se toca (sí la de devolución: ampliar o acortar). */
export function puedeCambiarFechas(r: Pick<Reserva, 'estado' | 'entrega' | 'devolucion'>): { ok: true; inicioBloqueado: boolean } | { ok: false; motivo: string } {
  if (r.estado === 'cancelada') return { ok: false, motivo: 'La reserva está anulada.' };
  if (r.devolucion) return { ok: false, motivo: 'El coche ya se devolvió: el alquiler terminó.' };
  return { ok: true, inicioBloqueado: !!r.entrega };
}

export interface BorradorFechas {
  fechaInicio: string;
  fechaFin: string;
  horaInicio: string;
  horaFin: string;
  /** Lo escrito en el campo del dinero (precio cerrado o total). null = todavía se muestra la propuesta. */
  valor: string | null;
}

type Datos = Pick<Reserva, 'id' | 'vehiculoId' | 'fechaInicio' | 'fechaFin' | 'horaInicio' | 'horaFin' | 'tarifaDiaria' | 'precioFijo' | 'seguroDia' | 'incluyeSeguroTodoRiesgo' | 'totalCobrado' | 'origen' | 'extras' | 'descuento'>;

/** Qué se le propone al cobrar con las fechas nuevas: el precio cerrado (si lo hay) o el total, y de dónde sale. */
export function propuestaCambioFechas(r: Datos, b: Pick<BorradorFechas, 'fechaInicio' | 'fechaFin' | 'horaInicio' | 'horaFin'>): {
  modo: 'fijo' | 'total'; propuesta: number; diasAntes: number; diasDespues: number; recalculado: boolean;
} {
  const t = totalTrasCambioDePeriodo(r, b);
  if (r.precioFijo != null) return { modo: 'fijo', propuesta: r.precioFijo, diasAntes: t.diasAntes, diasDespues: t.diasDespues, recalculado: false };
  return { modo: 'total', propuesta: t.recalculado ? t.total : t.proporcional, diasAntes: t.diasAntes, diasDespues: t.diasDespues, recalculado: t.recalculado };
}

/** Lo que se muestra en el campo del dinero: lo que ha escrito el usuario o, si no ha escrito nada, la propuesta. */
export const valorMostrado = (r: Datos, b: BorradorFechas): string => b.valor ?? String(propuestaCambioFechas(r, b).propuesta);

export type ResultadoCambioFechas =
  | { ok: true; cambios: Pick<Reserva, 'fechaInicio' | 'fechaFin' | 'horaInicio' | 'horaFin' | 'tarifaDiaria' | 'totalCobrado' | 'extras'> & { precioFijo?: number | null }; diasAntes: number; diasDespues: number; sinCambios: boolean }
  | { ok: false; error: string };

/** Valida las fechas nuevas y calcula lo que hay que guardar: fechas, horas, total y, si procede, precio cerrado y complementos. */
export function aplicarCambioFechas(r: Datos, otras: Pick<Reserva, 'id' | 'vehiculoId' | 'fechaInicio' | 'fechaFin' | 'estado' | 'entrega' | 'devolucion'>[], b: BorradorFechas, inicioBloqueado: boolean): ResultadoCambioFechas {
  const fechaInicio = inicioBloqueado ? r.fechaInicio : b.fechaInicio;
  if (!fechaInicio || !b.fechaFin) return { ok: false, error: 'Indica la fecha de entrega y la de devolución.' };
  if (b.fechaFin < fechaInicio) return { ok: false, error: 'La fecha de devolución no puede ser anterior a la de entrega.' };
  const errHoras = validarHorasReserva({ fechaInicio, fechaFin: b.fechaFin, horaInicio: b.horaInicio, horaFin: b.horaFin });
  if (errHoras) return { ok: false, error: errHoras };

  const ocupa = reservaQueOcupa(otras as Reserva[], { id: r.id, fechaInicio, fechaFin: b.fechaFin }, r.vehiculoId);
  if (ocupa) return { ok: false, error: `Con esas fechas el coche choca con otra reserva (del ${formatDate(ocupa.fechaInicio)} al ${formatDate(ocupa.fechaFin)}). Elige otras fechas, cambia de vehículo o anula esa reserva.` };

  const nuevo = { fechaInicio, fechaFin: b.fechaFin, horaInicio: b.horaInicio, horaFin: b.horaFin };
  const t = totalTrasCambioDePeriodo(r, nuevo);
  const sinCambios = fechaInicio === r.fechaInicio && b.fechaFin === r.fechaFin && b.horaInicio === (r.horaInicio ?? '') && b.horaFin === (r.horaFin ?? '');
  const valor = valorMostrado(r, b);

  if (r.precioFijo != null) {
    // Con precio cerrado el alquiler no depende de los días; el seguro y los complementos por día sí.
    const extras = r.origen === 'web' ? r.extras : recalcularExtras(r.extras, t.diasDespues);
    const p = aplicarPrecio({ ...r, extras }, 'fijo', valor, t.diasDespues);
    if (!p.ok) return { ok: false, error: p.error };
    return { ok: true, sinCambios, diasAntes: t.diasAntes, diasDespues: t.diasDespues, cambios: { ...nuevo, tarifaDiaria: p.tarifaDiaria, precioFijo: p.precioFijo, totalCobrado: p.totalCobrado, extras } };
  }
  const total = importePositivo(valor);
  if (total == null) return { ok: false, error: 'Indica el total de la reserva (mayor que 0).' };
  return { ok: true, sinCambios, diasAntes: t.diasAntes, diasDespues: t.diasDespues, cambios: { ...nuevo, tarifaDiaria: r.tarifaDiaria, totalCobrado: total, extras: t.extras } };
}
