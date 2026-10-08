/**
 * Cliente "virtual" de las órdenes de trabajo de vehículos de la propia flota
 * de alquiler: no hay un cliente real al que cobrar, solo el coste del taller.
 * Se excluyen de facturación y de las métricas de ventas.
 */
export const FLOTA_CLIENTE_ID = 'flota-propia';

/**
 * El cliente virtual existe como fila en la base de datos (para cumplir la
 * clave foránea de las órdenes de trabajo), pero no es una persona: se quita
 * de las listas de clientes, los contadores y los selectores.
 */
export function sinClienteFlota<T extends { id: string }>(clientes: T[]): T[] {
  return clientes.filter(c => c.id !== FLOTA_CLIENTE_ID);
}
