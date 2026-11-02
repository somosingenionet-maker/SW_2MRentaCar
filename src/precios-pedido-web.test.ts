import { describe, it, expect } from 'vitest';
import { preciosDePedido, type LineaPedido } from '../supabase/functions/woo-webhook/precios';

// Pedidos REALES de la web de 2M (solo líneas, cupones y totales; sin datos personales).
const esVehiculo = (i: LineaPedido) => /o similar/i.test(i.name ?? '');

const pedido2178 = {
  total: 219, discount_total: 10,
  coupon_lines: [{ code: '10mallorca', discount: '10.00' }],
  line_items: [
    { name: 'Opel Mokka o similar', product_id: 1, quantity: 1, subtotal: '120.00', total: '117.50' },
    { name: 'Cobertura Plus Relax - 15€/día', product_id: 2, quantity: 1, subtotal: '45.00', total: '42.50' },
    { name: 'Sillita infantil - 8€/día', product_id: 3, quantity: 1, subtotal: '24.00', total: '21.50' },
    { name: 'Portabicicletas', product_id: 4, quantity: 1, subtotal: '40.00', total: '37.50' },
  ],
};
const pedido2102 = {
  total: 162, discount_total: 18, coupon_lines: [],
  line_items: [
    { name: 'Renault Megane o similar', product_id: 5, quantity: 1, subtotal: '120.00', total: '102.00' },
    { name: 'Cobertura Plus Relax - 15€/día', product_id: 2, quantity: 1, subtotal: '60.00', total: '60.00' },
  ],
};
const pedidoSinDescuento = {
  total: 480, discount_total: 0,
  line_items: [
    { name: 'Renault Clio o similar', product_id: 6, quantity: 1, subtotal: '300.00', total: '300.00' },
    { name: 'Cobertura Plus Relax - 15€/día', product_id: 2, quantity: 1, subtotal: '180.00', total: '180.00' },
  ],
};

const suma = (p: ReturnType<typeof preciosDePedido>) => p.vehiculo_subtotal + p.extras.reduce((a, e) => a + e.subtotal, 0);
const r2 = (n: number) => Math.round(n * 100) / 100;

describe('importes de un pedido de la web', () => {
  it('pedido 2178: cada línea a su precio de lista y el cupón aparte', () => {
    const p = preciosDePedido(pedido2178.line_items, pedido2178.coupon_lines, esVehiculo);
    expect(p.vehiculo_subtotal).toBe(120);
    expect(p.vehiculo_total).toBe(117.5);
    expect(p.extras.map(e => [e.nombre, e.subtotal, e.total])).toEqual([
      ['Cobertura Plus Relax - 15€/día', 45, 42.5],
      ['Sillita infantil - 8€/día', 24, 21.5],
      ['Portabicicletas', 40, 37.5],
    ]);
    expect(p.cupones).toEqual([{ codigo: '10mallorca', importe: 10 }]);
  });

  it.each([['2178', pedido2178], ['2102', pedido2102], ['sin descuento', pedidoSinDescuento]] as const)(
    'pedido %s: suma de precios de lista − descuento = total que pagó el cliente',
    (_n, o) => {
      const p = preciosDePedido(o.line_items, (o as { coupon_lines?: never[] }).coupon_lines, esVehiculo);
      expect(r2(suma(p) - o.discount_total)).toBe(o.total);
      // Y lo cobrado por línea (con su parte del descuento) suma lo mismo.
      expect(r2(p.vehiculo_total + p.extras.reduce((a, e) => a + e.total, 0))).toBe(o.total);
    },
  );

  it('un descuento sin cupón (pedido 2102) no inventa códigos', () => {
    expect(preciosDePedido(pedido2102.line_items, pedido2102.coupon_lines, esVehiculo).cupones).toEqual([]);
    expect(preciosDePedido(pedidoSinDescuento.line_items, undefined, esVehiculo).cupones).toEqual([]);
  });

  it('si una línea no trae precio de lista, usa lo cobrado', () => {
    const p = preciosDePedido([{ name: 'Seat Ibiza o similar', total: '50.00' }, { name: 'Baca Coche', total: '50.00' }], undefined, esVehiculo);
    expect(p.vehiculo_subtotal).toBe(50);
    expect(p.extras[0]).toMatchObject({ subtotal: 50, total: 50, cantidad: 1 });
  });

  it('valores raros no rompen: importes vacíos o inválidos cuentan como 0', () => {
    const p = preciosDePedido([{ name: 'Fiat Panda o similar', subtotal: '', total: 'abc' }], [{ code: 'X', discount: 'mal' }], esVehiculo);
    expect(p.vehiculo_subtotal).toBe(0);
    expect(p.cupones).toEqual([{ codigo: 'X', importe: 0 }]);
  });

  it('un pedido sin vehículo reconocible deja todas las líneas como extras', () => {
    const p = preciosDePedido([{ name: 'Baca Coche', subtotal: '50', total: '50' }], undefined, esVehiculo);
    expect(p.vehiculo).toBeUndefined();
    expect(p.extras).toHaveLength(1);
  });
});
