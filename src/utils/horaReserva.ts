/** Hora en formato 24 h «HH:mm». */
export const HORA_RE = /^([01]\d|2[0-3]):[0-5]\d$/;

/**
 * Valida las horas de entrega y de devolución de una reserva. Devuelve el mensaje de error o null.
 * Son obligatorias: sin ellas el equipo no sabe a qué hora tiene que entregar o recibir el coche.
 */
export function validarHorasReserva(d: { fechaInicio: string; fechaFin: string; horaInicio?: string; horaFin?: string }): string | null {
  if (!d.horaInicio || !HORA_RE.test(d.horaInicio)) return 'Indica la hora de entrega del vehículo al cliente.';
  if (!d.horaFin || !HORA_RE.test(d.horaFin)) return 'Indica la hora de devolución del vehículo.';
  if (d.fechaInicio === d.fechaFin && d.horaFin <= d.horaInicio) {
    return 'Si el alquiler empieza y acaba el mismo día, la hora de devolución debe ser posterior a la de entrega.';
  }
  return null;
}

/** «26/10/2026 · 10:00»; sin hora (reservas anteriores a este campo) solo la fecha. */
export function fechaConHora(fecha: string, hora: string | undefined, fmt: (iso: string) => string): string {
  return hora ? `${fmt(fecha)} · ${hora}` : fmt(fecha);
}
