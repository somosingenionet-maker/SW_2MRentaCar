import type { OrdenTrabajo, OTEstado } from '../types';

/** Estados en los que el coche está físicamente en el taller y el mecánico lo trabaja. */
export type EstadoTaller = Extract<OTEstado, 'recibido' | 'en_reparacion' | 'listo'>;
export const ESTADOS_TALLER: EstadoTaller[] = ['recibido', 'en_reparacion', 'listo'];

export const ETIQUETA_ESTADO_TALLER: Record<EstadoTaller, string> = {
  recibido: 'Por empezar',
  en_reparacion: 'En reparación',
  listo: 'Listo',
};

/** Lo que la función `taller-mecanico` devuelve de cada orden: sin precios ni datos del cliente. */
export interface OrdenMecanico {
  id: string;
  numero: string;
  estado: EstadoTaller;
  recepcion: string;
  fechaEstimadaEntrega?: string | null;
  kilometraje?: number | null;
  problema?: string | null;
  diagnostico?: string | null;
  notas?: string | null;
  /** ISO de la última modificación. */
  actualizada?: string | null;
  vehiculo: { matricula?: string | null; marca?: string | null; modelo?: string | null; anio?: number | null; color?: string | null };
  tareas: { id: string; descripcion: string; hecha: boolean; hechaPor?: string | null; hechaEn?: string | null }[];
  piezas: { descripcion: string; cantidad: number }[];
}

export interface PaginaMecanico {
  tecnico: { nombre: string };
  empresa: { nombre: string; color: string; telefono: string };
  ordenes: OrdenMecanico[];
}

/** Tareas hechas y totales de una orden del mecánico. */
export function progresoMecanico(o: Pick<OrdenMecanico, 'tareas'>): { hechas: number; total: number } {
  return { hechas: o.tareas.filter(t => t.hecha).length, total: o.tareas.length };
}

/** Primero lo que se está trabajando, luego lo pendiente de empezar y al final lo ya listo. */
const PRIORIDAD: Record<EstadoTaller, number> = { en_reparacion: 0, recibido: 1, listo: 2 };
export function ordenarParaMecanico(ordenes: OrdenMecanico[]): OrdenMecanico[] {
  return [...ordenes].sort((a, b) => PRIORIDAD[a.estado] - PRIORIDAD[b.estado] || b.recepcion.localeCompare(a.recepcion) || b.numero.localeCompare(a.numero));
}

/** Órdenes que no estaban en la lista anterior: las que acaban de asignarle. Sin lista anterior (primera carga) no hay nuevas. */
export function ordenesNuevas(anteriores: ReadonlySet<string> | null, actuales: Pick<OrdenMecanico, 'id'>[]): string[] {
  if (!anteriores) return [];
  return actuales.map(o => o.id).filter(id => !anteriores.has(id));
}

/** «hace 5 min», «hace 2 h», «hace 3 d». */
export function haceCuanto(iso: string | null | undefined, ahora: number = Date.now()): string {
  if (!iso) return '';
  const t = new Date(iso).getTime();
  if (Number.isNaN(t)) return '';
  const s = Math.max(0, Math.round((ahora - t) / 1000));
  if (s < 45) return 'ahora mismo';
  const min = Math.round(s / 60);
  if (min < 60) return `hace ${min} min`;
  const h = Math.round(min / 60);
  if (h < 24) return `hace ${h} h`;
  return `hace ${Math.round(h / 24)} d`;
}

/** Descripción corta del coche: «Peugeot 3008 (2020, blanco)». */
export function descripcionVehiculo(v: OrdenMecanico['vehiculo']): string {
  const nombre = [v.marca, v.modelo].filter(Boolean).join(' ') || 'Vehículo';
  const detalle = [v.anio, v.color].filter(Boolean).join(', ');
  return detalle ? `${nombre} (${detalle})` : nombre;
}

// ── Lado del personal: tablero del taller ────────────────────────────────────

export interface FichaTaller {
  ot: OrdenTrabajo;
  estado: EstadoTaller;
  hechas: number;
  total: number;
}

/** Tareas de una orden = sus líneas de mano de obra. Hechas = las que el mecánico ha marcado. */
export function progresoOT(ot: Pick<OrdenTrabajo, 'lineas'>, hechasIds: ReadonlySet<string> | undefined): { hechas: number; total: number } {
  const tareas = (ot.lineas ?? []).filter(l => l.tipo === 'mano_de_obra');
  return { total: tareas.length, hechas: tareas.filter(l => hechasIds?.has(l.id)).length };
}

/** Coches que hay ahora en el taller, con su avance: lo que se está trabajando primero. */
export function fichasTaller(ordenes: OrdenTrabajo[], tareasHechas: Record<string, string[]>): FichaTaller[] {
  return ordenes
    .filter((ot): ot is OrdenTrabajo & { estado: EstadoTaller } => (ESTADOS_TALLER as string[]).includes(ot.estado))
    .map(ot => ({ ot, estado: ot.estado, ...progresoOT(ot, new Set(tareasHechas[ot.id] ?? [])) }))
    .sort((a, b) => PRIORIDAD[a.estado] - PRIORIDAD[b.estado] || b.ot.fechaActualizacion.localeCompare(a.ot.fechaActualizacion));
}

/** Agrupa las filas de `ot_tareas` por orden: { otId: [lineaId, ...] }. */
export function agruparTareasHechas(filas: { otId: string; lineaId: string }[]): Record<string, string[]> {
  const r: Record<string, string[]> = {};
  for (const f of filas) (r[f.otId] ??= []).push(f.lineaId);
  return r;
}

// ── Mensajes de WhatsApp al mecánico ─────────────────────────────────────────

/** Aviso de un coche asignado. No lleva el enlace del taller: solo se guarda su hash, así que no se puede volver a mostrar. */
export function mensajeAvisoMecanico(d: { nombre: string; vehiculo: string; matricula: string; problema?: string }): string {
  const problema = (d.problema ?? '').split('\n')[0].trim().slice(0, 140);
  return `Hola ${d.nombre}, te hemos asignado el ${d.vehiculo}${d.matricula ? ` (${d.matricula})` : ''}.${problema ? ` Problema: ${problema}.` : ''} Lo tienes en tu lista del taller.`;
}

/** Primer envío del enlace personal del mecánico. */
export function mensajeEnlaceMecanico(d: { nombre: string; empresa: string; enlace: string }): string {
  return `Hola ${d.nombre}, este es tu enlace personal del taller de ${d.empresa}: ${d.enlace}\n\nÁbrelo desde el móvil y guárdalo (puedes añadirlo a la pantalla de inicio). Ahí verás los coches que te asignemos y podrás marcar las tareas. No lo compartas.`;
}

/** Enlace de WhatsApp con el texto escrito; si hay teléfono abre el chat directamente, si no deja elegir contacto. */
export function enlaceWhatsApp(telefono: string | undefined, texto: string): string {
  const digitos = (telefono ?? '').replace(/\D/g, '');
  return `https://wa.me/${digitos}?text=${encodeURIComponent(texto)}`;
}
