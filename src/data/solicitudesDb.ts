import { supabase } from '../lib/supabase';
import { rowToObj } from '../lib/caseMap';
import { fetchPaginado } from './db';
import { SolicitudReserva } from '../types';

// Todas las columnas menos `payload` (el pedido original, pesado e innecesario en pantalla).
const COLUMNAS = [
  'id', 'origen', 'referencia_externa', 'estado_externo', 'estado_gestion',
  'cliente_nombre', 'cliente_apellidos', 'cliente_email', 'cliente_telefono',
  'cliente_direccion', 'cliente_ciudad', 'cliente_pais', 'carnet_categoria', 'cliente_documento',
  'fecha_recogida', 'fecha_devolucion', 'lugar_recogida', 'lugar_devolucion',
  'vehiculo_nombre', 'vehiculo_web_id', 'vehiculo_total', 'extras', 'descuento',
  'total', 'metodo_pago', 'pagado', 'fecha_pedido', 'cliente_id', 'reserva_id',
].join(',');

export async function fetchSolicitudes(): Promise<SolicitudReserva[]> {
  return (await fetchPaginado('solicitudes_reserva', COLUMNAS)).map(r => rowToObj<SolicitudReserva>(r));
}

/**
 * Solo toca los campos de gestión del equipo. Nunca reescribe los datos del
 * pedido, que pertenecen a la web y pueden haberse actualizado entre tanto.
 */
export async function updateGestionSolicitud(
  id: string,
  cambios: { estadoGestion: SolicitudReserva['estadoGestion']; clienteId?: string; reservaId?: string },
): Promise<void> {
  const fila: Record<string, unknown> = { estado_gestion: cambios.estadoGestion };
  if (cambios.clienteId !== undefined) fila.cliente_id = cambios.clienteId;
  if (cambios.reservaId !== undefined) fila.reserva_id = cambios.reservaId;
  const { error } = await supabase.from('solicitudes_reserva').update(fila).eq('id', id);
  if (error) throw error;
}
