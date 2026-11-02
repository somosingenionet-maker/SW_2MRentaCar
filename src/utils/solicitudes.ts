import { Reserva, SolicitudReserva, SolicitudExtra, Vehiculo } from '../types';
import { finEfectivo } from './entregaDevolucion';
import { hoyISO } from './fechas';

const MINUTOS_DIA = 24 * 60;
const HORA = /^([01]\d|2[0-3]):([0-5]\d)$/;

/** Minutos desde las 00:00 de una hora 'HH:mm', o null si falta o no es válida. */
function minutosDelDia(hora?: string): number | null {
  const m = hora ? HORA.exec(hora) : null;
  return m ? Number(m[1]) * 60 + Number(m[2]) : null;
}

/**
 * Minutos entre la entrega y la devolución, o null si no se pueden contar con horas (falta alguna).
 * Se cuenta en hora de reloj de la oficina, sin ajustes por cambio de hora: «mismas horas al día siguiente» es 1 día.
 */
function minutosDeAlquiler(inicio: string, fin: string, horaInicio?: string, horaFin?: string): number | null {
  const a = minutosDelDia(horaInicio);
  const b = minutosDelDia(horaFin);
  if (a == null || b == null) return null;
  return (new Date(fin).getTime() - new Date(inicio).getTime()) / 60000 + (b - a);
}

/**
 * Días de alquiler. Con horas de entrega y devolución se cuentan periodos de 24 h y cada fracción
 * cuenta como un día más (el mismo criterio con el que cobra la web de 2M: del 1 a las 12:00 al 4 a las
 * 19:00 son 3 días y 7 h = 4 días; del 10 a las 11:00 al 22 a las 11:00, 12 días). Sin horas, se cuenta
 * la diferencia entre fechas, como antes. Mínimo 1.
 */
export function diasAlquiler(inicio: string, fin: string, horaInicio?: string, horaFin?: string): number {
  if (!inicio || !fin) return 1;
  const minutos = minutosDeAlquiler(inicio, fin, horaInicio, horaFin);
  if (minutos != null) return Math.max(1, Math.ceil(minutos / MINUTOS_DIA));
  const diff = Math.abs(new Date(fin).getTime() - new Date(inicio).getTime());
  return Math.ceil(diff / (1000 * 60 * 60 * 24)) || 1;
}

/** Duración exacta, p. ej. «3 días y 7 h», cuando las horas hacen que los días facturados sean más que los completos. Si no, null. */
export function duracionExacta(inicio: string, fin: string, horaInicio?: string, horaFin?: string): string | null {
  const minutos = inicio && fin ? minutosDeAlquiler(inicio, fin, horaInicio, horaFin) : null;
  if (minutos == null || minutos <= 0 || minutos % MINUTOS_DIA === 0) return null;
  const dias = Math.floor(minutos / MINUTOS_DIA);
  const horas = Math.floor((minutos % MINUTOS_DIA) / 60);
  const min = Math.round(minutos % 60);
  const partes = [
    dias > 0 ? `${dias} ${dias === 1 ? 'día' : 'días'}` : '',
    horas > 0 ? `${horas} h` : '',
    min > 0 ? `${min} min` : '',
  ].filter(Boolean);
  return partes.length > 1 ? `${partes.slice(0, -1).join(', ')} y ${partes[partes.length - 1]}` : partes[0];
}

/**
 * Reservas activas del vehículo que se pisan con el rango dado. Cuenta hasta el día real en que
 * el coche queda libre: una devolución anticipada lo libera antes, y un coche entregado que aún
 * no ha vuelto sigue ocupado aunque haya pasado su fecha de fin.
 */
export function reservasSolapadas(reservas: Reserva[], vehiculoId: string, inicio: string, fin: string, hoy: string = hoyISO()): Reserva[] {
  const ini = new Date(inicio).getTime();
  const end = new Date(fin).getTime();
  return reservas.filter(r => {
    if (r.vehiculoId !== vehiculoId || r.estado === 'cancelada') return false;
    return ini <= new Date(finEfectivo(r, hoy)).getTime() && new Date(r.fechaInicio).getTime() <= end;
  });
}

const sinAcentos = (s: string) => s.normalize('NFD').replace(/[\u0300-\u036f]/g, '');

/** "Renault Clio o similar (Automático)" → "renault clio". */
function normalizarModelo(s: string): string {
  return sinAcentos(s.toLowerCase())
    .replace(/\(.*?\)/g, ' ')
    .replace(/\bo similar\b/g, ' ')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

/** Vehículos de la flota de alquiler cuyo marca+modelo coincide con el modelo pedido en la web. */
export function vehiculosCompatibles(sol: SolicitudReserva, vehiculos: Vehiculo[]): Vehiculo[] {
  const pedido = normalizarModelo(sol.vehiculoNombre);
  if (!pedido) return [];
  return vehiculos.filter(v => {
    if (!v.esFlotaAlquiler) return false;
    const propio = normalizarModelo(`${v.marca} ${v.modelo}`);
    return propio.length > 0 && (pedido.includes(propio) || propio.includes(pedido));
  });
}

const ESTADOS_CANCELADOS = new Set(['cancelled', 'refunded', 'failed']);

/** El pedido se canceló, reembolsó o falló en la web. */
export const canceladaEnWeb = (sol: SolicitudReserva): boolean => ESTADOS_CANCELADOS.has(sol.estadoExterno);

/** Algún extra es una cobertura/seguro (equivale al "todo riesgo" de la reserva). */
export const incluyeCobertura = (extras: SolicitudExtra[]): boolean =>
  extras.some(e => /cobertura|seguro|todo riesgo/i.test(e.nombre));

/** Texto y color del estado del pedido en la web. */
export function estadoWebMeta(sol: SolicitudReserva): { label: string; cls: string } {
  switch (sol.estadoExterno) {
    case 'processing': return { label: 'Pagada', cls: 'bg-emerald-50 text-emerald-700' };
    case 'on-hold': return { label: 'Pago al recoger', cls: 'bg-amber-50 text-amber-700' };
    case 'pending': return { label: 'Pendiente de pago', cls: 'bg-amber-50 text-amber-700' };
    case 'completed': return { label: 'Completada', cls: 'bg-slate-100 text-slate-600' };
    case 'cancelled': return { label: 'Cancelada en la web', cls: 'bg-rose-50 text-rose-600' };
    case 'refunded': return { label: 'Reembolsada', cls: 'bg-rose-50 text-rose-600' };
    case 'failed': return { label: 'Pago fallido', cls: 'bg-rose-50 text-rose-600' };
    default: return { label: sol.estadoExterno || 'Sin estado', cls: 'bg-slate-100 text-slate-500' };
  }
}

/**
 * Pedidos de la web ya pasados (estado «histórica») que cubren un día. Se muestran en el calendario
 * solo como referencia: ya no son trabajo pendiente. Los cancelados, reembolsados o fallidos no se
 * cuentan, porque nunca llegaron a ser un alquiler.
 */
export function webPasadasDelDia(solicitudes: SolicitudReserva[], iso: string): SolicitudReserva[] {
  return solicitudes.filter(s => {
    if (s.estadoGestion !== 'historica' || canceladaEnWeb(s) || !s.fechaRecogida) return false;
    const ini = s.fechaRecogida.slice(0, 10);
    const fin = s.fechaDevolucion ? s.fechaDevolucion.slice(0, 10) : ini;
    return ini <= iso && fin >= iso;
  });
}

/** '2026-09-13T14:30' → '2026-09-13' (la reserva de la app solo guarda la fecha). */
export const soloFecha = (iso?: string | null): string => (iso ? iso.slice(0, 10) : '');
/** '2026-09-13T14:30' → '14:30'. */
export const soloHora = (iso?: string | null): string => (iso && iso.length >= 16 ? iso.slice(11, 16) : '');
