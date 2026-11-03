import type { Reserva, Vehiculo } from '../types';
import { reservasSolapadas } from './solicitudes';
import { tarifaDeTemporada } from './tarifasAlquiler';
import { fmt2 } from './moneda';

/** ¿Se puede cambiar el coche de esta reserva? Solo antes de entregarlo: la entrega registra km y estado de ese coche. */
export function puedeCambiarVehiculo(r: Pick<Reserva, 'estado' | 'entrega' | 'devolucion'>): { ok: true } | { ok: false; motivo: string } {
  if (r.estado === 'cancelada') return { ok: false, motivo: 'La reserva está anulada.' };
  if (r.devolucion) return { ok: false, motivo: 'El coche ya se devolvió.' };
  if (r.entrega) return { ok: false, motivo: 'El coche ya se entregó: su registro de entrega (km y estado) es de ese coche y no se puede pasar a otro desde aquí.' };
  return { ok: true };
}

/** Otra reserva (no anulada) que ocupa el coche en las fechas de ésta, si la hay. */
export function reservaQueOcupa(reservas: Reserva[], reserva: Pick<Reserva, 'id' | 'fechaInicio' | 'fechaFin'>, vehiculoId: string): Reserva | undefined {
  return reservasSolapadas(reservas.filter(r => r.id !== reserva.id), vehiculoId, reserva.fechaInicio, reserva.fechaFin)[0];
}

/** Lo que cambia (o no) al pasar la reserva a otro coche: el precio acordado y la fianza se mantienen. */
export function avisosCambioVehiculo(
  reserva: Pick<Reserva, 'tarifaDiaria' | 'temporada' | 'incluyeSeguroTodoRiesgo'>, nuevo: Pick<Vehiculo, 'tarifasAlquiler' | 'seguroAmpliadoDia'>,
): string[] {
  const avisos: string[] = [];
  const tarifaNuevo = tarifaDeTemporada(nuevo.tarifasAlquiler, reserva.temporada);
  if (tarifaNuevo != null && Math.round(tarifaNuevo * 100) !== Math.round(reserva.tarifaDiaria * 100)) {
    avisos.push(`La reserva mantiene su precio acordado (${fmt2(reserva.tarifaDiaria)} €/día); el coche nuevo está a ${fmt2(tarifaNuevo)} €/día en esa tarifa.`);
  }
  if (reserva.incluyeSeguroTodoRiesgo && nuevo.seguroAmpliadoDia == null) {
    avisos.push('La reserva lleva el seguro a todo riesgo y el coche nuevo no lo ofrece: revisa la cobertura con el cliente.');
  }
  return avisos;
}
