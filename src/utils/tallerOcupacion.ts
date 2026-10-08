import { OrdenTrabajo } from '../types';

/** Estados en los que el vehículo está físicamente dentro del taller. */
const ESTADOS_EN_TALLER = ['recibido', 'en_reparacion', 'listo'];

/**
 * Rango de días [inicio, fin] (AAAA-MM-DD) en que un vehículo ocupa el taller
 * por una OT: desde que ingresa hasta que se entrega. Si aún no se ha
 * entregado, sigue creciendo día a día (hasta hoy, o hasta la fecha estimada
 * si cae más adelante) para que se siga viendo "en curso".
 */
export function otRangoDias(ot: OrdenTrabajo, hoy: string): [string, string] {
  if (ot.fechaEntrega) return [ot.fechaRecepcion, ot.fechaEntrega];
  const fin = ot.fechaEstimadaEntrega && ot.fechaEstimadaEntrega > hoy ? ot.fechaEstimadaEntrega : hoy;
  return [ot.fechaRecepcion, fin];
}

export function otOcupaDia(ot: OrdenTrabajo, key: string, hoy: string): boolean {
  const [inicio, fin] = otRangoDias(ot, hoy);
  return inicio <= key && key <= fin;
}

const vehiculosDistintos = (ordenes: OrdenTrabajo[]): number =>
  new Set(ordenes.map(ot => ot.vehiculoId || ot.id)).size;

/** Vehículos que hay ahora mismo dentro del taller (un coche con dos OT cuenta una vez). */
export function vehiculosEnTaller(ordenes: OrdenTrabajo[]): number {
  return vehiculosDistintos(ordenes.filter(ot => ESTADOS_EN_TALLER.includes(ot.estado)));
}

/**
 * Vehículos que ocupan el taller un día concreto. Los presupuestos y las OT
 * canceladas no ocupan sitio. Desde hoy en adelante una OT ya entregada no
 * cuenta: así el recuento de hoy coincide con el de "ahora mismo".
 */
export function ocupacionDia(ordenes: OrdenTrabajo[], key: string, hoy: string): number {
  return vehiculosDistintos(ordenes.filter(ot => {
    if (ot.estado === 'presupuesto' || ot.estado === 'cancelado') return false;
    if (ot.estado === 'entregado' && key >= hoy) return false;
    return otOcupaDia(ot, key, hoy);
  }));
}

export type NivelCupo = 'sin-limite' | 'libre' | 'casi-lleno' | 'completo' | 'excedido';

/** Situación respecto al cupo. capacidad 0 (o vacía) = no hay límite definido. */
export function nivelCupo(ocupados: number, capacidad: number): NivelCupo {
  if (!capacidad || capacidad <= 0) return 'sin-limite';
  if (ocupados > capacidad) return 'excedido';
  if (ocupados === capacidad) return 'completo';
  if (ocupados >= capacidad * 0.8) return 'casi-lleno';
  return 'libre';
}

/** Cuándo y con cuántos km entró el vehículo (el momento exacto sale del historial de la OT). */
export function ingresoDeOT(ot: OrdenTrabajo): { fechaHora: string | null; km: number } | null {
  if (ot.estado === 'presupuesto' || ot.estado === 'cancelado') return null;
  const evento = (ot.historial ?? []).find(e => /recibido en taller/i.test(e.descripcion));
  return { fechaHora: evento?.fecha ?? null, km: ot.kilometrajeEntrada };
}
