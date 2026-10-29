import type { Reserva, SolicitudReserva } from '../types';

/** Sugerencias al escribir el lugar de entrega o devolución (son texto libre). */
export const LUGARES_HABITUALES = ['Cami de son Gotleu, 8 bajos, 07008', 'Aeropuerto, Palma de Mallorca'];

/**
 * Lugar de entrega y de devolución de una reserva. Si la reserva no lo tiene guardado
 * (anterior a este campo) se toma el del pedido de la web del que viene.
 */
export function lugaresReserva(
  reserva: Pick<Reserva, 'lugarRecogida' | 'lugarDevolucion'>,
  solicitud?: Pick<SolicitudReserva, 'lugarRecogida' | 'lugarDevolucion'>,
): { recogida: string; devolucion: string } {
  const limpio = (v?: string | null) => (v ?? '').trim();
  return {
    recogida: limpio(reserva.lugarRecogida) || limpio(solicitud?.lugarRecogida),
    devolucion: limpio(reserva.lugarDevolucion) || limpio(solicitud?.lugarDevolucion),
  };
}
