import { Reserva, SolicitudReserva, SolicitudExtra, Vehiculo } from '../types';

/** Días de alquiler entre dos fechas 'YYYY-MM-DD' (mínimo 1). */
export function diasAlquiler(inicio: string, fin: string): number {
  if (!inicio || !fin) return 1;
  const diff = Math.abs(new Date(fin).getTime() - new Date(inicio).getTime());
  return Math.ceil(diff / (1000 * 60 * 60 * 24)) || 1;
}

/** Reservas activas del vehículo que se pisan con el rango dado. */
export function reservasSolapadas(reservas: Reserva[], vehiculoId: string, inicio: string, fin: string): Reserva[] {
  const ini = new Date(inicio).getTime();
  const end = new Date(fin).getTime();
  return reservas.filter(r => {
    if (r.vehiculoId !== vehiculoId || r.estado === 'cancelada') return false;
    return ini <= new Date(r.fechaFin).getTime() && new Date(r.fechaInicio).getTime() <= end;
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

/** '2026-09-13T14:30' → '2026-09-13' (la reserva de la app solo guarda la fecha). */
export const soloFecha = (iso?: string | null): string => (iso ? iso.slice(0, 10) : '');
/** '2026-09-13T14:30' → '14:30'. */
export const soloHora = (iso?: string | null): string => (iso && iso.length >= 16 ? iso.slice(11, 16) : '');
