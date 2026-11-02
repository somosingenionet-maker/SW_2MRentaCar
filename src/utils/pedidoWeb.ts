import type { Reserva, SolicitudReserva } from '../types';
import { coberturaDePago } from './solicitudes';
import { extrasDePedidoWeb, nombreComplemento } from './complementos';

const redondear = (n: number) => Math.round(n * 100) / 100;

/**
 * Datos económicos de la reserva que sale de un pedido de la web, a PRECIO DE LISTA: cada línea con su
 * precio normal y el descuento aparte (WooCommerce reparte un cupón entre las líneas y un portabicicletas
 * de 40 € figuraba como 37,50 €). El total cobrado no cambia: lista − descuento = total del pedido.
 * Los pedidos antiguos sin precios de lista conservan lo que cobró la web y no llevan descuento aparte.
 */
export function datosReservaWeb(
  sol: Pick<SolicitudReserva, 'vehiculoTotal' | 'vehiculoSubtotal' | 'extras' | 'descuento' | 'cupones'>, dias: number,
): Pick<Reserva, 'tarifaDiaria' | 'seguroDia' | 'incluyeSeguroTodoRiesgo' | 'extras' | 'descuento' | 'cupon'> {
  const conLista = sol.vehiculoSubtotal != null;
  const alquiler = conLista ? sol.vehiculoSubtotal! : sol.vehiculoTotal;
  const cobertura = coberturaDePago(sol.extras ?? []);
  const codigos = (sol.cupones ?? []).map(c => c.codigo).filter(Boolean).join(', ');
  return {
    tarifaDiaria: redondear(alquiler / Math.max(1, dias)),
    incluyeSeguroTodoRiesgo: cobertura != null,
    seguroDia: cobertura ? redondear((cobertura.subtotal ?? cobertura.total) / Math.max(1, dias)) : undefined,
    extras: extrasDePedidoWeb(sol.extras),
    descuento: conLista ? sol.descuento ?? 0 : 0,
    cupon: conLista && codigos ? codigos : undefined,
  };
}

/** Líneas de un pedido de la web tal como se ven al asignarlo: cada una a su precio de lista y el descuento aparte. */
export function lineasDePedidoWeb(
  sol: Pick<SolicitudReserva, 'vehiculoTotal' | 'vehiculoSubtotal' | 'extras' | 'descuento' | 'cupones'>,
): { texto: string; importe: number }[] {
  const conLista = sol.vehiculoSubtotal != null;
  const lineas = [
    { texto: 'Alquiler del vehículo', importe: conLista ? sol.vehiculoSubtotal! : sol.vehiculoTotal },
    ...(sol.extras ?? []).map(e => ({ texto: nombreComplemento(e.nombre), importe: e.subtotal ?? e.total })),
  ];
  if (conLista && (sol.descuento ?? 0) > 0) {
    const codigos = (sol.cupones ?? []).map(c => c.codigo).filter(Boolean).join(', ');
    lineas.push({ texto: `Descuento${codigos ? ` (cupón ${codigos})` : ''}`, importe: -(sol.descuento ?? 0) });
  }
  return lineas;
}
