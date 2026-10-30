import type { Cita } from '../types';

/**
 * A dónde lleva pulsar una cita en la Agenda: a su orden en Taller si ya se convirtió (ahí está el proceso),
 * o a su ficha con todos los datos. Sin permiso de Taller, o si la orden ya no existe, también la ficha.
 */
export function destinoDeCita(cita: Pick<Cita, 'otId'>, ordenIds: ReadonlySet<string>, puedeAbrirOrden: boolean): 'orden' | 'ficha' {
  return puedeAbrirOrden && !!cita.otId && ordenIds.has(cita.otId) ? 'orden' : 'ficha';
}

/** Hora de fin de la cita (HH:mm, hora local) a partir de su inicio y su duración. */
export function horaFinCita(fechaHora: string, duracionMinutos: number): string {
  const fin = new Date(new Date(fechaHora).getTime() + duracionMinutos * 60_000);
  return fin.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
}

/** Recordatorio de la cita para WhatsApp. */
export function mensajeRecordatorioCita(d: { nombre: string; empresa: string; fecha: string; hora: string; motivo: string }): string {
  return `Hola${d.nombre ? ` ${d.nombre}` : ''}, le recordamos su cita en ${d.empresa} el ${d.fecha} a las ${d.hora}${d.motivo ? ` (${d.motivo})` : ''}. Si no puede venir, avísenos y la cambiamos. ¡Gracias!`;
}
