/**
 * Cliente "virtual" de las órdenes de trabajo de vehículos de la propia flota
 * de alquiler: no hay un cliente real al que cobrar, solo el coste del taller.
 * Se excluyen de facturación y de las métricas de ventas.
 */
export const FLOTA_CLIENTE_ID = 'flota-propia';
