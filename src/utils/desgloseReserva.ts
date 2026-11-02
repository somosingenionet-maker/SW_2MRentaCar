import type { Reserva } from '../types';

/** Una línea del desglose económico de una reserva. El texto lo pone quien lo pinta (ficha o contrato, en su idioma). */
export type LineaDesglose =
  | { tipo: 'alquiler'; dias: number; precio: number; importe: number }
  | { tipo: 'seguro'; dias: number; precio: number; importe: number }
  /** Seguro a todo riesgo incluido pero sin precio guardado (reservas antiguas): sin importe propio. */
  | { tipo: 'seguro-incluido'; importe: null }
  /** Sin seguro a todo riesgo: póliza de terceros básica, incluida. */
  | { tipo: 'terceros'; importe: null }
  | { tipo: 'extra'; nombre: string; cantidad: number; precio?: number; porDia?: boolean; importe: number }
  | { tipo: 'descuento'; cupon?: string; importe: number }
  /** Diferencia entre la suma de las líneas y el total guardado: redondeo, o un total que no sale de la cuenta. */
  | { tipo: 'ajuste'; importe: number };

type Datos = Pick<Reserva, 'tarifaDiaria' | 'seguroDia' | 'incluyeSeguroTodoRiesgo' | 'totalCobrado' | 'fianza' | 'extras' | 'descuento' | 'cupon'>;

const r2 = (n: number) => Math.round(n * 100) / 100;

/**
 * Desglose de lo que se cobra: alquiler, seguro, complementos y descuento, a precio de lista, de modo que la
 * suma de las líneas es SIEMPRE el total (si no sale exacto, una línea de ajuste lo dice en vez de esconderlo).
 * La fianza es un depósito aparte y no forma parte del total.
 */
export function desgloseReserva(r: Datos, dias: number): { lineas: LineaDesglose[]; total: number; fianza: number } {
  const lineas: LineaDesglose[] = [{ tipo: 'alquiler', dias, precio: r.tarifaDiaria, importe: r2(dias * r.tarifaDiaria) }];

  if (r.incluyeSeguroTodoRiesgo) {
    lineas.push(r.seguroDia != null
      ? { tipo: 'seguro', dias, precio: r.seguroDia, importe: r2(dias * r.seguroDia) }
      : { tipo: 'seguro-incluido', importe: null });
  } else {
    lineas.push({ tipo: 'terceros', importe: null });
  }

  for (const e of r.extras ?? []) {
    lineas.push({ tipo: 'extra', nombre: e.nombre, cantidad: e.cantidad, precio: e.precio, porDia: e.porDia, importe: e.total });
  }
  if ((r.descuento ?? 0) > 0) lineas.push({ tipo: 'descuento', cupon: r.cupon || undefined, importe: -r2(r.descuento!) });

  const suma = r2(lineas.reduce((a, l) => a + (l.importe ?? 0), 0));
  const diferencia = r2(r.totalCobrado - suma);
  if (Math.abs(diferencia) >= 0.005) lineas.push({ tipo: 'ajuste', importe: diferencia });

  return { lineas, total: r.totalCobrado, fianza: r.fianza ?? 0 };
}

/** ¿Hay un ajuste que no es solo redondeo (más de 5 céntimos)? Conviene revisar el total. */
export const hayAjusteImportante = (lineas: LineaDesglose[]): boolean =>
  lineas.some(l => l.tipo === 'ajuste' && Math.abs(l.importe) > 0.05);
