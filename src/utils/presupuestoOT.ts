import type { Cliente, OrdenTrabajo, Vehiculo } from '../types';
import { FLOTA_CLIENTE_ID } from './flota';
import { fmt2 } from './moneda';

/** Estados en los que se puede preparar y enviar el presupuesto al cliente: antes de recibir el coche y con el coche ya en el taller. */
const ESTADOS_CON_PRESUPUESTO: OrdenTrabajo['estado'][] = ['presupuesto', 'recibido', 'en_reparacion'];

/** ¿La orden admite presupuesto para el cliente? Los coches de la flota propia no presupuestan a nadie. */
export function admitePresupuesto(ot: Pick<OrdenTrabajo, 'estado' | 'clienteId'>): boolean {
  return ESTADOS_CON_PRESUPUESTO.includes(ot.estado) && ot.clienteId !== FLOTA_CLIENTE_ID;
}

export type SituacionPresupuesto = 'sin_enviar' | 'enviado' | 'aprobado';

/** Aprobado solo existe una vez recibido el coche; un presupuesto aún no recibido está enviado o sin enviar. */
export function situacionPresupuesto(ot: Pick<OrdenTrabajo, 'presupuestoEstado' | 'presupuestoAprobado'>): SituacionPresupuesto {
  if (ot.presupuestoAprobado) return 'aprobado';
  return ot.presupuestoEstado === 'enviado' ? 'enviado' : 'sin_enviar';
}

/** Texto del presupuesto para WhatsApp o correo: lo que se hace, cuánto cuesta y cómo aprobarlo. */
export function mensajePresupuesto(d: {
  cliente?: Pick<Cliente, 'nombre'>;
  vehiculo?: Pick<Vehiculo, 'marca' | 'modelo' | 'matricula'>;
  ot: Pick<OrdenTrabajo, 'numero' | 'lineas' | 'subtotal' | 'totalIva' | 'total' | 'ivaPct'>;
  empresa: { nombre: string; telefono: string };
}): string {
  const coche = d.vehiculo ? `${d.vehiculo.marca} ${d.vehiculo.modelo}${d.vehiculo.matricula ? ` (${d.vehiculo.matricula})` : ''}`.replace(/\s+/g, ' ') : 'su vehículo';
  const lineas = d.ot.lineas.map(l => `• ${l.descripcion}${l.cantidad !== 1 ? ` × ${l.cantidad}` : ''}: ${fmt2(l.subtotal)} €`);
  return [
    `Hola ${d.cliente?.nombre ?? ''},`.replace(/ ,$/, ','),
    `Tras revisar su ${coche}, este es el presupuesto ${d.ot.numero}:`,
    lineas.join('\n'),
    `Base: ${fmt2(d.ot.subtotal)} €\nIVA (${d.ot.ivaPct}%): ${fmt2(d.ot.totalIva)} €\nTOTAL: ${fmt2(d.ot.total)} €`,
    `Si está de acuerdo, respóndanos a este mensaje${d.empresa.telefono ? ` o llámenos al ${d.empresa.telefono}` : ''} y empezamos con la reparación.`,
    d.empresa.nombre,
  ].join('\n\n');
}
