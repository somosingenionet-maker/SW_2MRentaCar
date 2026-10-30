import type { Cliente, ContratoFirmado, EmpresaContrato, Reserva, SnapshotContrato, SolicitudReserva, Vehiculo } from '../types';
import { lugaresReserva } from './lugarReserva';

/** JSON con las claves ordenadas y sin campos vacíos de `undefined`: misma entrada, mismo texto, antes y después de pasar por la base de datos. */
export function jsonCanonico(valor: unknown): string {
  if (valor === null || typeof valor !== 'object') return JSON.stringify(valor) ?? 'null';
  if (Array.isArray(valor)) return `[${valor.map(v => jsonCanonico(v === undefined ? null : v)).join(',')}]`;
  const o = valor as Record<string, unknown>;
  return `{${Object.keys(o).filter(k => o[k] !== undefined).sort().map(k => `${JSON.stringify(k)}:${jsonCanonico(o[k])}`).join(',')}}`;
}

/** Copia de lo que muestra el contrato en este momento (sin historial del cliente ni datos que el contrato no usa). */
export function crearSnapshot(
  reserva: Reserva, cliente: Cliente | undefined, vehiculo: Vehiculo | undefined,
  solicitud: SolicitudReserva | undefined, empresa: EmpresaContrato,
): SnapshotContrato {
  const lugares = lugaresReserva(reserva, solicitud);
  const copia: SnapshotContrato = {
    reserva: {
      id: reserva.id, vehiculoId: reserva.vehiculoId, clienteId: reserva.clienteId,
      fechaInicio: reserva.fechaInicio, fechaFin: reserva.fechaFin, horaInicio: reserva.horaInicio, horaFin: reserva.horaFin,
      lugarRecogida: lugares.recogida || undefined, lugarDevolucion: lugares.devolucion || undefined,
      tarifaDiaria: reserva.tarifaDiaria, totalCobrado: reserva.totalCobrado,
      incluyeSeguroTodoRiesgo: reserva.incluyeSeguroTodoRiesgo, fianza: reserva.fianza, seguroDia: reserva.seguroDia,
    },
    cliente: cliente ? {
      nombre: cliente.nombre, apellidos: cliente.apellidos, nifNiePasaporte: cliente.nifNiePasaporte, correo: cliente.correo,
      telefono: cliente.telefono, direccion: cliente.direccion, ciudad: cliente.ciudad, pais: cliente.pais,
      carnetNumero: cliente.carnetNumero, carnetExpedicion: cliente.carnetExpedicion, carnetVencimiento: cliente.carnetVencimiento,
    } : null,
    vehiculo: vehiculo ? {
      marca: vehiculo.marca, modelo: vehiculo.modelo, matricula: vehiculo.matricula, bastidor: vehiculo.bastidor,
      transmision: vehiculo.transmision, aseguradora: vehiculo.aseguradora, kilometraje: vehiculo.kilometraje,
    } : null,
    empresa: {
      nombre: empresa.nombre, razonSocial: empresa.razonSocial, nif: empresa.nif, direccionFiscal: empresa.direccionFiscal,
      ciudad: empresa.ciudad, pais: empresa.pais, telefono: empresa.telefono,
    },
    solicitud: solicitud ? {
      referenciaExterna: solicitud.referenciaExterna, lugarRecogida: solicitud.lugarRecogida, lugarDevolucion: solicitud.lugarDevolucion,
    } : null,
  };
  // Sin `undefined`: lo que se guarda y lo que se vuelve a leer es idéntico.
  return JSON.parse(JSON.stringify(copia)) as SnapshotContrato;
}

type DatosHuella = Pick<ContratoFirmado, 'contrato' | 'idioma' | 'firmaPng' | 'firmadoEn'>;

/** SHA-256 (hex, mayúsculas) del contrato firmado. */
export async function calcularHuella({ contrato, idioma, firmaPng, firmadoEn }: DatosHuella): Promise<string> {
  const texto = jsonCanonico({ contrato, idioma, firmaPng, firmadoEn: new Date(firmadoEn).toISOString() });
  const bytes = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(texto));
  return [...new Uint8Array(bytes)].map(b => b.toString(16).padStart(2, '0')).join('').toUpperCase();
}

/** ¿Lo guardado sigue siendo exactamente lo que se firmó? */
export async function integridadCorrecta(c: ContratoFirmado): Promise<boolean> {
  return (await calcularHuella(c)) === c.huella.toUpperCase();
}

export const referenciaCorta = (huella: string) => huella.slice(0, 8).toUpperCase();

/** Fecha y hora de la firma, en la hora local del aparato, para el texto del contrato. */
export function fechaHoraFirma(iso: string, idioma: 'es' | 'en'): string {
  const d = new Date(iso);
  const locale = idioma === 'en' ? 'en-GB' : 'es-ES';
  return `${d.toLocaleDateString(locale, { day: 'numeric', month: 'short', year: 'numeric' })} ${d.toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit', hour12: false })}`;
}

/** Qué ha cambiado en la reserva desde que se firmó el contrato (vacío = nada que afecte a lo firmado). */
export function cambiosTrasFirma(
  firmado: SnapshotContrato, reserva: Reserva, solicitud?: Pick<SolicitudReserva, 'lugarRecogida' | 'lugarDevolucion'>,
): string[] {
  const antes = firmado.reserva;
  const lugares = lugaresReserva(reserva, solicitud);
  const cambios: string[] = [];
  if (antes.clienteId !== reserva.clienteId) cambios.push('el cliente');
  if (antes.vehiculoId !== reserva.vehiculoId) cambios.push('el vehículo');
  if (antes.fechaInicio !== reserva.fechaInicio || antes.fechaFin !== reserva.fechaFin) cambios.push('las fechas');
  if ((antes.horaInicio ?? '') !== (reserva.horaInicio ?? '') || (antes.horaFin ?? '') !== (reserva.horaFin ?? '')) cambios.push('las horas');
  if ((antes.lugarRecogida ?? '') !== lugares.recogida || (antes.lugarDevolucion ?? '') !== lugares.devolucion) cambios.push('los lugares');
  if (antes.totalCobrado !== reserva.totalCobrado || antes.tarifaDiaria !== reserva.tarifaDiaria) cambios.push('el importe');
  if ((antes.fianza ?? 0) !== (reserva.fianza ?? 0)) cambios.push('la fianza');
  return cambios;
}

export type Punto = { x: number; y: number };

/**
 * ¿Hay una firma de verdad y no un toque suelto? Los puntos van normalizados (x de 0 a 1 sobre el ancho,
 * y de 0 a `relacion` sobre el alto, para medir en las mismas unidades). Hace falta un trazo con recorrido.
 */
export function firmaSuficiente(trazos: Punto[][]): boolean {
  let puntos = 0;
  let longitud = 0;
  for (const t of trazos) {
    puntos += t.length;
    for (let i = 1; i < t.length; i++) longitud += Math.hypot(t[i].x - t[i - 1].x, t[i].y - t[i - 1].y);
  }
  return puntos >= 6 && longitud >= 0.25;
}
