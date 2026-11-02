import type { Complemento, ExtraReserva, Reserva, SolicitudExtra } from '../types';
import { fmt2 } from './moneda';

/** Las coberturas y seguros no son complementos: ya los modelan los campos de seguro de la reserva. */
export const esCobertura = (nombre: string): boolean => /^\s*cobertura|seguro|todo riesgo/i.test(nombre);

/** Nombre sin el precio que la web añade al final («Sillita infantil - 8€/día» → «Sillita infantil»). */
export const nombreComplemento = (nombre: string): string => nombre.replace(/\s*-\s*\d+(?:[.,]\d+)?\s*€\s*\/\s*día\s*$/i, '').trim();

const redondear = (n: number) => Math.round(n * 100) / 100;

/** Lo que cuesta un complemento: cantidad × precio, y × días si es por día. */
export function totalComplemento(c: { precio: number; porDia: boolean }, cantidad: number, dias: number): number {
  return redondear(c.precio * cantidad * (c.porDia ? dias : 1));
}

/**
 * Importe de los complementos de una reserva. Los que tienen precio (manuales) se recalculan con los días
 * indicados; los de la web conservan lo que cobró la web.
 */
export function totalExtras(extras: ExtraReserva[] | undefined, dias: number): number {
  return redondear((extras ?? []).reduce(
    (suma, e) => suma + (e.precio != null && e.porDia != null ? totalComplemento({ precio: e.precio, porDia: e.porDia }, e.cantidad, dias) : e.total),
    0,
  ));
}

/** Complementos con sus importes puestos al día para `dias` días: los manuales se recalculan, los de la web quedan como estaban. */
export function recalcularExtras(extras: ExtraReserva[] | undefined, dias: number): ExtraReserva[] {
  return (extras ?? []).map(e =>
    e.precio != null && e.porDia != null ? { ...e, total: totalComplemento({ precio: e.precio, porDia: e.porDia }, e.cantidad, dias) } : e);
}

/** Complementos de un pedido de la web, sin coberturas, a su precio de lista (o, en pedidos antiguos, lo que cobró la web). */
export function extrasDePedidoWeb(extras: SolicitudExtra[] | undefined): ExtraReserva[] {
  return (extras ?? [])
    .filter(e => !esCobertura(e.nombre))
    // A precio de lista: el descuento del pedido se resta aparte, no se reparte entre las líneas.
    .map(e => ({ nombre: e.nombre, cantidad: e.cantidad > 0 ? e.cantidad : 1, total: e.subtotal ?? e.total }));
}

/** Complementos elegidos del catálogo para una reserva manual, con sus importes a los días indicados. */
export function extrasManuales(catalogo: Complemento[], cantidades: Record<string, number>, dias: number): ExtraReserva[] {
  return catalogo
    .filter(c => (cantidades[c.id] ?? 0) > 0)
    .map(c => ({
      nombre: c.nombre, cantidad: cantidades[c.id], precio: c.precio, porDia: c.porDia,
      total: totalComplemento(c, cantidades[c.id], dias),
    }));
}

/** «8,00 € / día» o «50,00 € (precio fijo)». */
export const etiquetaPrecioComplemento = (c: { precio: number; porDia: boolean }): string =>
  `${fmt2(c.precio)} €${c.porDia ? ' / día' : ' (precio fijo)'}`;

/** Resumen de una línea para listados: «Sillita infantil × 2, Baca coche». */
export const resumenExtras = (extras: ExtraReserva[] | undefined): string =>
  (extras ?? []).map(e => `${nombreComplemento(e.nombre)}${e.cantidad > 1 ? ` × ${e.cantidad}` : ''}`).join(', ');

// ── Editar los complementos de una reserva ya creada ─────────────────────────

/** Una fila del editor: un complemento del catálogo (o uno ya en la reserva que ya no está en él) y su cantidad. */
export interface FilaEditorExtras {
  clave: string;
  nombre: string;
  precio: number;
  porDia: boolean;
  cantidad: number;
  /** Está en la reserva pero ya no existe o no está disponible en el catálogo. */
  fueraDeCatalogo: boolean;
}

const esManual = (e: ExtraReserva): boolean => e.precio != null && e.porDia != null;
const mismaClave = (a: string, b: string) => nombreComplemento(a).trim().toLowerCase() === nombreComplemento(b).trim().toLowerCase();

/**
 * Filas del editor: los complementos disponibles del catálogo con la cantidad que ya lleva la reserva, más los que
 * lleva y ya no están disponibles (para poder quitarlos o dejarlos). Los complementos de un pedido de la web no se editan.
 */
export function filasEditorExtras(extras: ExtraReserva[] | undefined, catalogo: Complemento[]): FilaEditorExtras[] {
  const manuales = (extras ?? []).filter(esManual);
  const disponibles = catalogo.filter(c => c.activo).sort((a, b) => a.orden - b.orden);
  const filas: FilaEditorExtras[] = disponibles.map(c => ({
    clave: c.id, nombre: c.nombre, precio: c.precio, porDia: c.porDia, fueraDeCatalogo: false,
    cantidad: manuales.filter(e => mismaClave(e.nombre, c.nombre)).reduce((a, e) => a + e.cantidad, 0),
  }));
  for (const e of manuales) {
    if (disponibles.some(c => mismaClave(e.nombre, c.nombre))) continue;
    filas.push({ clave: `fuera:${e.nombre}`, nombre: e.nombre, precio: e.precio!, porDia: e.porDia!, cantidad: e.cantidad, fueraDeCatalogo: true });
  }
  return filas;
}

/**
 * Aplica las cantidades del editor: devuelve los complementos nuevos y el total nuevo. El total cambia solo por lo
 * que cambian los complementos manuales (los de la web se conservan tal cual), así que un precio pactado distinto
 * de días × tarifa no se pierde.
 */
export function aplicarFilasEditor(
  reserva: Pick<Reserva, 'extras' | 'totalCobrado'>, filas: FilaEditorExtras[], dias: number,
): { extras: ExtraReserva[]; total: number; cambio: number } {
  const delPedidoWeb = (reserva.extras ?? []).filter(e => !esManual(e));
  const manualesAntes = (reserva.extras ?? []).filter(esManual).reduce((a, e) => a + e.total, 0);
  const manualesNuevos: ExtraReserva[] = filas
    .filter(f => f.cantidad > 0)
    .map(f => ({ nombre: f.nombre, cantidad: f.cantidad, precio: f.precio, porDia: f.porDia, total: totalComplemento(f, f.cantidad, dias) }));
  const manualesDespues = manualesNuevos.reduce((a, e) => a + e.total, 0);
  const cambio = redondear(manualesDespues - manualesAntes);
  return { extras: [...delPedidoWeb, ...manualesNuevos], total: redondear(reserva.totalCobrado + cambio), cambio };
}
