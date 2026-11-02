// Importes de un pedido de WooCommerce: cada línea a su precio de LISTA (`subtotal`) y lo que cobró la web
// (`total`, que ya lleva su parte del descuento), más los cupones. Código puro, sin APIs de Deno, para poder
// probarlo con pedidos reales (src/precios-pedido-web.test.ts).
//
// WooCommerce reparte el descuento de un cupón entre las líneas: un cupón de 10 € en un pedido de 4 líneas
// resta 2,50 € a cada una. La app muestra cada línea a su precio normal y el descuento aparte; por eso guardamos
// los dos importes. Siempre se cumple: suma de precios de lista − descuento total = total del pedido.

export type LineaPedido = { name?: string; product_id?: number; quantity?: number; subtotal?: string; total?: string };
export type CuponPedido = { code?: string; discount?: string };

const num = (v: unknown): number => {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
};

export function preciosDePedido(items: LineaPedido[], cupones: CuponPedido[] | undefined, esVehiculo: (i: LineaPedido) => boolean) {
  const vehiculo = items.find(esVehiculo);
  const extras = items.filter(i => i !== vehiculo);
  return {
    vehiculo,
    vehiculo_total: num(vehiculo?.total),
    vehiculo_subtotal: num(vehiculo?.subtotal ?? vehiculo?.total),
    extras: extras.map(i => ({
      nombre: i.name ?? '',
      cantidad: i.quantity ?? 1,
      total: num(i.total),
      subtotal: num(i.subtotal ?? i.total),
    })),
    cupones: (cupones ?? [])
      .map(c => ({ codigo: String(c.code ?? ''), importe: num(c.discount) }))
      .filter(c => c.codigo !== '' || c.importe !== 0),
  };
}
