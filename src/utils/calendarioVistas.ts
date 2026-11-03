import type { Reserva } from '../types';

export type VistaCalendario = 'mes' | 'semana' | 'dia';

const MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
const MESES_CORTOS = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
const DIAS = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];
const DIAS_CORTOS_SEMANA = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];

const dos = (n: number) => String(n).padStart(2, '0');
const aFecha = (iso: string) => { const [a, m, d] = iso.split('-').map(Number); return new Date(a, m - 1, d); };
const aIso = (f: Date) => `${f.getFullYear()}-${dos(f.getMonth() + 1)}-${dos(f.getDate())}`;

/** Suma (o resta) días a una fecha AAAA-MM-DD. */
const sumarDiasIso = (iso: string, dias: number): string => { const f = aFecha(iso); f.setDate(f.getDate() + dias); return aIso(f); };

/** Lunes de la semana de esa fecha (las semanas van de lunes a domingo). */
export const inicioSemana = (iso: string): string => sumarDiasIso(iso, -((aFecha(iso).getDay() + 6) % 7));

/** Los 7 días (lunes a domingo) de la semana de esa fecha. */
export const diasSemana = (iso: string): string[] => { const l = inicioSemana(iso); return Array.from({ length: 7 }, (_, i) => sumarDiasIso(l, i)); };

/** Primer y último día del mes de esa fecha. */
function rangoDelMes(iso: string): { ini: string; fin: string } {
  const f = aFecha(iso);
  return { ini: aIso(new Date(f.getFullYear(), f.getMonth(), 1)), fin: aIso(new Date(f.getFullYear(), f.getMonth() + 1, 0)) };
}

/** Primer y último día que se ven en cada vista. */
export function rangoVisible(ancla: string, vista: VistaCalendario): { ini: string; fin: string } {
  if (vista === 'mes') return rangoDelMes(ancla);
  if (vista === 'semana') { const d = diasSemana(ancla); return { ini: d[0], fin: d[6] }; }
  return { ini: ancla, fin: ancla };
}

/** Fecha de referencia tras pulsar anterior (-1) o siguiente (+1): un mes, una semana o un día. */
export function moverAncla(ancla: string, vista: VistaCalendario, sentido: -1 | 1): string {
  if (vista === 'dia') return sumarDiasIso(ancla, sentido);
  if (vista === 'semana') return sumarDiasIso(ancla, 7 * sentido);
  const f = aFecha(ancla);
  return aIso(new Date(f.getFullYear(), f.getMonth() + sentido, 1));
}

/** Al pasar a semana o día se parte de hoy si cae en lo que se estaba viendo; si no, del primer día de lo visto. */
export function anclaAlCambiarVista(ancla: string, vistaActual: VistaCalendario, hoy: string): string {
  const { ini, fin } = rangoVisible(ancla, vistaActual);
  return hoy >= ini && hoy <= fin ? hoy : ini;
}

/** Título de la barra: «noviembre 2026», «2 – 8 nov 2026» o «lunes 2 de noviembre de 2026». */
export function etiquetaRango(ancla: string, vista: VistaCalendario): string {
  const f = aFecha(ancla);
  if (vista === 'mes') return `${MESES[f.getMonth()][0].toUpperCase()}${MESES[f.getMonth()].slice(1)} ${f.getFullYear()}`;
  if (vista === 'dia') return `${DIAS[f.getDay()]} ${f.getDate()} de ${MESES[f.getMonth()]} de ${f.getFullYear()}`;
  const dias = diasSemana(ancla);
  const a = aFecha(dias[0]); const b = aFecha(dias[6]);
  if (a.getFullYear() !== b.getFullYear()) return `${a.getDate()} ${MESES_CORTOS[a.getMonth()]} ${a.getFullYear()} – ${b.getDate()} ${MESES_CORTOS[b.getMonth()]} ${b.getFullYear()}`;
  if (a.getMonth() !== b.getMonth()) return `${a.getDate()} ${MESES_CORTOS[a.getMonth()]} – ${b.getDate()} ${MESES_CORTOS[b.getMonth()]} ${b.getFullYear()}`;
  return `${a.getDate()} – ${b.getDate()} ${MESES_CORTOS[b.getMonth()]} ${b.getFullYear()}`;
}

/** Nombre corto del día de la semana de una fecha (Lun, Mar…). */
export const diaCorto = (iso: string): string => DIAS_CORTOS_SEMANA[(aFecha(iso).getDay() + 6) % 7];
/** Número del día del mes. */
export const numeroDia = (iso: string): number => aFecha(iso).getDate();

export type MovimientoDelDia = 'entrega' | 'devolucion' | 'entrega_y_devolucion' | 'en_curso';

/** Qué toca ese día con la reserva: entregar el coche, recibirlo o simplemente que sigue alquilado. */
export function movimientoDelDia(r: Pick<Reserva, 'fechaInicio' | 'fechaFin'>, iso: string): MovimientoDelDia {
  const entrega = r.fechaInicio === iso;
  const devolucion = r.fechaFin === iso;
  if (entrega && devolucion) return 'entrega_y_devolucion';
  return entrega ? 'entrega' : devolucion ? 'devolucion' : 'en_curso';
}

/** Orden de un día: primero las entregas, luego las devoluciones, al final las que siguen en curso; dentro, por hora. */
export function ordenarDelDia<T extends Pick<Reserva, 'fechaInicio' | 'fechaFin' | 'horaInicio' | 'horaFin'>>(reservas: T[], iso: string): T[] {
  const peso = (r: T) => { const m = movimientoDelDia(r, iso); return m === 'en_curso' ? 2 : m === 'devolucion' ? 1 : 0; };
  const hora = (r: T) => (movimientoDelDia(r, iso) === 'devolucion' ? r.horaFin : r.horaInicio) ?? '99:99';
  return [...reservas].sort((a, b) => peso(a) - peso(b) || hora(a).localeCompare(hora(b)));
}
