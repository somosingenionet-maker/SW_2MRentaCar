import type { Complemento, ExtraReserva, SolicitudExtra } from '../types';

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

/** Complementos de un pedido de la web, sin coberturas, tal como los cobró la web. */
export function extrasDePedidoWeb(extras: SolicitudExtra[] | undefined): ExtraReserva[] {
  return (extras ?? [])
    .filter(e => !esCobertura(e.nombre))
    .map(e => ({ nombre: e.nombre, cantidad: e.cantidad > 0 ? e.cantidad : 1, total: e.total }));
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
  `${c.precio.toFixed(2)} €${c.porDia ? ' / día' : ' (precio fijo)'}`;

/** Resumen de una línea para listados: «Sillita infantil × 2, Baca coche». */
export const resumenExtras = (extras: ExtraReserva[] | undefined): string =>
  (extras ?? []).map(e => `${nombreComplemento(e.nombre)}${e.cantidad > 1 ? ` × ${e.cantidad}` : ''}`).join(', ');
