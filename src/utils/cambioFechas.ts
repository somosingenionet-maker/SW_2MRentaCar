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

/** Cómo se cobran los días que se añaden: un precio cerrado por todos ellos, o un valor por día. */
export type ModoExtra = 'cerrado' | 'dia';

export interface BorradorFechas {
  fechaInicio: string;
  fechaFin: string;
  horaInicio: string;
  horaFin: string;
  /** Lo escrito en el campo del dinero (precio cerrado o total). null = todavía se muestra la propuesta. */
  valor: string | null;
  /** Solo al ampliar: cómo se pacta lo de los días adicionales y lo escrito (null = todavía se muestra la sugerencia). */
  modoExtra?: ModoExtra;
  valorExtra?: string | null;
}

type Datos = Pick<Reserva, 'id' | 'vehiculoId' | 'fechaInicio' | 'fechaFin' | 'horaInicio' | 'horaFin' | 'tarifaDiaria' | 'precioFijo' | 'seguroDia' | 'incluyeSeguroTodoRiesgo' | 'totalCobrado' | 'origen' | 'extras' | 'descuento'> & Partial<Pick<Reserva, 'ampliacion'>>;

/** Qué se le propone al cobrar con las fechas nuevas: el precio cerrado (si lo hay) o el total, y de dónde sale. */
export function propuestaCambioFechas(r: Datos, b: Pick<BorradorFechas, 'fechaInicio' | 'fechaFin' | 'horaInicio' | 'horaFin'>): {
  modo: 'fijo' | 'total'; propuesta: number; diasAntes: number; diasDespues: number; recalculado: boolean;
} {
  const t = totalTrasCambioDePeriodo(r, b);
  if (r.precioFijo != null) return { modo: 'fijo', propuesta: r.precioFijo, diasAntes: t.diasAntes, diasDespues: t.diasDespues, recalculado: false };
  return { modo: 'total', propuesta: t.recalculado ? t.total : t.proporcional, diasAntes: t.diasAntes, diasDespues: t.diasDespues, recalculado: t.recalculado };
}

/**
 * Al ampliar (más días que antes) el precio inicial no se toca: se pacta solo lo de los días adicionales, a un precio cerrado o por día.
 * Devuelve null si no se amplía. `sugerido` es el valor por día que salía antes de recalcular solo (vacío si la reserva no se recalcula sola).
 */
export function propuestaExtension(r: Datos, b: BorradorFechas): { dias: number; modo: ModoExtra; sugerido: string; valor: string; importe: number | null; precioDia: number | null } | null {
  const t = totalTrasCambioDePeriodo(r, b);
  const dias = t.diasDespues - t.diasAntes;
  if (dias <= 0) return null;
  const sugeridoNum = t.recalculado && r.precioFijo == null ? Math.round(((t.total - r.totalCobrado) / dias) * 100) / 100 : null;
  const sugerido = sugeridoNum != null && sugeridoNum > 0 ? String(sugeridoNum) : '';
  const modo: ModoExtra = b.modoExtra ?? (sugerido ? 'dia' : 'cerrado');
  const valor = b.valorExtra ?? (modo === 'dia' ? sugerido : '');
  const n = importePositivo(valor);
  return {
    dias, modo, sugerido, valor,
    importe: n == null ? null : Math.round((modo === 'dia' ? n * dias : n) * 100) / 100,
    precioDia: modo === 'dia' ? n : null,
  };
}

/** Lo que se muestra en el campo del dinero: lo que ha escrito el usuario o, si no ha escrito nada, la propuesta. */
export const valorMostrado = (r: Datos, b: BorradorFechas): string => b.valor ?? String(propuestaCambioFechas(r, b).propuesta);

export type ResultadoCambioFechas =
  | { ok: true; cambios: Pick<Reserva, 'fechaInicio' | 'fechaFin' | 'horaInicio' | 'horaFin' | 'tarifaDiaria' | 'totalCobrado' | 'extras'> & { precioFijo?: number | null }; diasAntes: number; diasDespues: number; sinCambios: boolean;
      /** Solo si se amplía: los días adicionales y cómo se pactaron. */ extension?: { dias: number; importe: number; modo: ModoExtra; precioDia?: number } }
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

  // Ampliar: el precio inicial queda como está y se suma lo pactado por los días adicionales.
  const ext = propuestaExtension(r, b);
  if (ext) {
    if (ext.importe == null) {
      return { ok: false, error: ext.modo === 'dia' ? `Indica el valor por día de los ${ext.dias} ${ext.dias === 1 ? 'día adicional' : 'días adicionales'} (mayor que 0).` : `Indica el precio cerrado de los ${ext.dias} ${ext.dias === 1 ? 'día adicional' : 'días adicionales'} (mayor que 0).` };
    }
    const totalCobrado = Math.round((r.totalCobrado + ext.importe) * 100) / 100;
    return {
      ok: true, sinCambios, diasAntes: t.diasAntes, diasDespues: t.diasDespues,
      cambios: { ...nuevo, tarifaDiaria: r.tarifaDiaria, totalCobrado, extras: r.extras },
      extension: { dias: ext.dias, importe: ext.importe, modo: ext.modo, ...(ext.precioDia != null ? { precioDia: ext.precioDia } : {}) },
    };
  }

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
