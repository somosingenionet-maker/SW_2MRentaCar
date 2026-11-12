import type { Cliente, NotificacionCliente, OrdenTrabajo, Vehiculo } from '../types';
import { FLOTA_CLIENTE_ID } from './flota';
import { formatDate } from './dateFormat';
import { diasHasta } from './alertasEstado';
import { FILTROS_ACEITE, type EstadoFiltros } from './filtrosAceite';

/**
 * Avisos al cliente del taller por el cambio de aceite. Reglas pensadas para no cansar:
 *  · entrega: un resumen cuando se le entrega el coche (filtros cambiados y próximo cambio).
 *  · recordatorio: una vez, unos días antes de la fecha del próximo cambio.
 *  · vencido: una vez, pasada una semana de la fecha sin que se haya hecho el cambio. Después, nada más.
 * Cada aviso sale una sola vez (queda anotado con su «referencia»). Los coches de la flota propia no avisan a nadie.
 */
export const DIAS_ANTES_RECORDATORIO = 15;
const DIAS_TRAS_VENCER = 7;
/** Pasado este tiempo desde la fecha prevista ya no se avisa: ese cliente no ha vuelto y insistir cansa. */
export const DIAS_MAX_VENCIDO = 60;
/** Una entrega más antigua que esto ya no genera su resumen. */
const DIAS_MAX_ENTREGA = 30;

export type EtapaAviso = 'entrega' | 'recordatorio' | 'vencido';
export type TipoEventoAceite = Extract<NotificacionCliente['tipoEvento'], `aceite_${string}`>;
export const tipoEventoAceite = (e: EtapaAviso): TipoEventoAceite => `aceite_${e}`;

export interface AvisoPendiente {
  /** Única por aviso: vehículo + etapa + referencia. */
  clave: string;
  etapa: EtapaAviso;
  vehiculo: Vehiculo;
  cliente: Cliente;
  /** Fecha del próximo cambio (recordatorio y vencido) o id de la orden (entrega). */
  referencia: string;
  /** Texto del correo y de WhatsApp. */
  asunto: string;
  mensaje: string;
  telefono: string;
  correo: string;
  /** Situación para el taller: «Vence en 9 días», «Entregado el 10 nov. 2026»… */
  motivo: string;
  /** Solo en la entrega: falta indicar el próximo cambio, así que el mensaje no lo lleva. */
  sinProximoCambio?: boolean;
}

/** Quien trajo el coche al taller: el cliente de su última orden que no sea la flota propia; si no hay, el que lo tenga asociado. */
export function clienteDelVehiculo(vehiculoId: string, ordenes: OrdenTrabajo[], clientes: Cliente[]): Cliente | undefined {
  const ultima = ordenes
    .filter(o => o.vehiculoId === vehiculoId && o.clienteId && o.clienteId !== FLOTA_CLIENTE_ID && o.estado !== 'cancelado')
    .sort((a, b) => b.fechaActualizacion.localeCompare(a.fechaActualizacion))[0];
  const porOrden = ultima && clientes.find(c => c.id === ultima.clienteId);
  return porOrden ?? clientes.find(c => c.id !== FLOTA_CLIENTE_ID && c.vehiculosAsociados?.includes(vehiculoId));
}

const nombreVehiculo = (v: Vehiculo) => `${v.marca} ${v.modelo} (${v.matricula})`.replace(/\s+/g, ' ').trim();

interface Datos {
  etapa: EtapaAviso;
  cliente: Cliente;
  vehiculo: Vehiculo;
  empresa: { nombre: string; telefono: string };
  /** Próximo cambio (AAAA-MM-DD), si se conoce. */
  proximo?: string;
  /** Km del próximo cambio, si se anotaron. */
  proximoKm?: number | null;
  /** Solo en la entrega. */
  entrega?: { fecha: string; filtros?: EstadoFiltros };
}

/** Texto del aviso: breve, con lo que el cliente necesita y un teléfono para pedir cita. */
export function textoAviso(d: Datos): { asunto: string; mensaje: string } {
  const hola = `Hola ${d.cliente.nombre},`;
  const veh = nombreVehiculo(d.vehiculo);
  const cita = d.empresa.telefono ? `Para pedir cita, llámenos o escríbanos al ${d.empresa.telefono}.` : 'Para pedir cita, escríbanos o llámenos.';
  const firma = d.empresa.nombre;
  const km = d.proximoKm != null ? ` o a los ${d.proximoKm.toLocaleString('es-ES')} km` : '';
  if (d.etapa === 'entrega') {
    const filas = FILTROS_ACEITE
      .filter(f => d.entrega?.filtros?.[f.id] !== undefined)
      .map(f => `${d.entrega!.filtros![f.id] ? '✔' : '✘'} ${f.nombre}: ${d.entrega!.filtros![f.id] ? 'cambiado' : 'no se cambió'}`);
    const partes = [
      `${hola} gracias por confiar en ${firma}. El ${formatDate(d.entrega?.fecha ?? '')} le hicimos el cambio de aceite de su ${veh}.`,
      filas.length > 0 ? `Esto es lo que revisamos:\n${filas.join('\n')}` : '',
      d.proximo ? `Próximo cambio de aceite recomendado: ${formatDate(d.proximo)}${km}${km ? ', lo que ocurra antes' : ''}.` : '',
      cita,
      firma,
    ].filter(Boolean);
    return { asunto: `Cambio de aceite de su ${d.vehiculo.marca} ${d.vehiculo.matricula}`, mensaje: partes.join('\n\n') };
  }
  if (d.etapa === 'recordatorio') {
    return {
      asunto: `Se acerca el cambio de aceite de su ${d.vehiculo.marca} ${d.vehiculo.matricula}`,
      mensaje: [`${hola} le recordamos que el próximo cambio de aceite de su ${veh} está previsto para el ${formatDate(d.proximo ?? '')}${km}${km ? ', lo que ocurra antes' : ''}.`, cita, firma].join('\n\n'),
    };
  }
  return {
    asunto: `Cambio de aceite pendiente de su ${d.vehiculo.marca} ${d.vehiculo.matricula}`,
    mensaje: [`${hola} el cambio de aceite de su ${veh} estaba previsto para el ${formatDate(d.proximo ?? '')}${km} y todavía no lo hemos hecho. Conviene no retrasarlo mucho.`, cita, firma].join('\n\n'),
  };
}

interface Entrada {
  vehiculos: Vehiculo[];
  ordenes: OrdenTrabajo[];
  clientes: Cliente[];
  notificaciones: Pick<NotificacionCliente, 'vehiculoId' | 'tipoEvento' | 'referencia'>[];
  filtrosOT: Record<string, EstadoFiltros>;
  empresa: { nombre: string; telefono: string };
  /** AAAA-MM-DD */
  hoy: string;
}

/** Avisos que toca hacer hoy, los más urgentes primero. Ya avisados, descartados y clientes con «no avisar» no salen. */
export function avisosPendientes(e: Entrada): AvisoPendiente[] {
  const hechos = new Set(e.notificaciones.map(n => `${n.vehiculoId}|${n.tipoEvento}|${n.referencia ?? ''}`));
  const salida: AvisoPendiente[] = [];
  const añade = (etapa: EtapaAviso, vehiculo: Vehiculo, cliente: Cliente, referencia: string, extra: Partial<Datos> & { motivo: string; sinProximoCambio?: boolean }) => {
    if (cliente.noAvisar || cliente.id === FLOTA_CLIENTE_ID) return;
    if (hechos.has(`${vehiculo.id}|${tipoEventoAceite(etapa)}|${referencia}`)) return;
    const telefono = (cliente.telefono ?? '').trim(), correo = (cliente.correo ?? '').trim();
    const { asunto, mensaje } = textoAviso({ etapa, cliente, vehiculo, empresa: e.empresa, ...extra });
    salida.push({ clave: `${vehiculo.id}|${etapa}|${referencia}`, etapa, vehiculo, cliente, referencia, asunto, mensaje, telefono, correo, motivo: extra.motivo, sinProximoCambio: extra.sinProximoCambio });
  };

  // Entrega: órdenes de cambio de aceite entregadas hace poco a un cliente (no a la flota propia).
  for (const ot of e.ordenes) {
    if (!ot.esCambioAceite || ot.estado !== 'entregado' || !ot.clienteId || ot.clienteId === FLOTA_CLIENTE_ID) continue;
    const entregada = ot.fechaEntrega ?? ot.fechaActualizacion.slice(0, 10);
    const hace = diasHasta(entregada, e.hoy);
    if (hace === null || hace > 0 || -hace > DIAS_MAX_ENTREGA) continue;
    const vehiculo = e.vehiculos.find(v => v.id === ot.vehiculoId), cliente = e.clientes.find(c => c.id === ot.clienteId);
    if (!vehiculo || !cliente) continue;
    // El próximo cambio solo vale si la ficha ya tiene un cambio de esta visita (lo anotó el mecánico o el taller).
    const proximo = vehiculo.aceiteFecha && vehiculo.aceiteFecha >= ot.fechaRecepcion && vehiculo.aceiteProximaFecha ? vehiculo.aceiteProximaFecha : undefined;
    añade('entrega', vehiculo, cliente, ot.id, { proximo, proximoKm: proximo ? vehiculo.aceiteProximoKm : null, entrega: { fecha: entregada, filtros: e.filtrosOT[ot.id] }, motivo: `Entregado el ${formatDate(entregada)}`, sinProximoCambio: !proximo });
  }

  // Recordatorio y vencido: según la fecha del próximo cambio de cada vehículo de un cliente.
  for (const v of e.vehiculos) {
    const proximo = v.aceiteProximaFecha;
    const dias = diasHasta(proximo ?? undefined, e.hoy);
    if (!proximo || dias === null) continue;
    const cliente = clienteDelVehiculo(v.id, e.ordenes, e.clientes);
    if (!cliente) continue;
    if (dias >= 0 && dias <= DIAS_ANTES_RECORDATORIO) {
      añade('recordatorio', v, cliente, proximo, { proximo, proximoKm: v.aceiteProximoKm, motivo: dias === 0 ? 'Toca hoy' : `Toca en ${dias} ${dias === 1 ? 'día' : 'días'} (${formatDate(proximo)})` });
    } else if (dias < 0 && -dias >= DIAS_TRAS_VENCER && -dias <= DIAS_MAX_VENCIDO) {
      añade('vencido', v, cliente, proximo, { proximo, proximoKm: v.aceiteProximoKm, motivo: `Pasó hace ${-dias} días (${formatDate(proximo)})` });
    }
  }

  const peso: Record<EtapaAviso, number> = { vencido: 0, entrega: 1, recordatorio: 2 };
  return salida.sort((a, b) => peso[a.etapa] - peso[b.etapa] || a.referencia.localeCompare(b.referencia));
}
