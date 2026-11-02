import { describe, it, expect } from 'vitest';
import { datosReservaWeb } from './pedidoWeb';
import { desgloseReserva } from './desgloseReserva';
import type { Reserva, SolicitudReserva } from '../types';

type Sol = Pick<SolicitudReserva, 'vehiculoTotal' | 'vehiculoSubtotal' | 'extras' | 'descuento' | 'cupones'>;

// Pedidos REALES de la web de 2M (solo los importes): la suma de precios de lista − descuento es el total que pagó el cliente.
const pedido2178: Sol & { total: number } = {
  vehiculoTotal: 117.5, vehiculoSubtotal: 120, descuento: 10, cupones: [{ codigo: '10mallorca', importe: 10 }], total: 219,
  extras: [
    { nombre: 'Cobertura Plus Relax - 15€/día', cantidad: 1, total: 42.5, subtotal: 45 },
    { nombre: 'Sillita infantil - 8€/día', cantidad: 1, total: 21.5, subtotal: 24 },
    { nombre: 'Portabicicletas', cantidad: 1, total: 37.5, subtotal: 40 },
  ],
};
const pedido2102: Sol & { total: number } = {
  vehiculoTotal: 102, vehiculoSubtotal: 120, descuento: 18, cupones: [], total: 162,
  extras: [{ nombre: 'Cobertura Plus Relax - 15€/día', cantidad: 1, total: 60, subtotal: 60 }],
};
const pedido2062: Sol & { total: number } = {
  vehiculoTotal: 300, vehiculoSubtotal: 300, descuento: 0, cupones: [], total: 480,
  extras: [{ nombre: 'Cobertura Plus Relax - 15€/día', cantidad: 1, total: 180, subtotal: 180 }],
};

/** Reserva tal como la montaría la app a partir del pedido, para comprobar que el desglose suma el total. */
const reservaDe = (p: Sol & { total: number }, dias: number): Reserva =>
  ({ ...datosReservaWeb(p, dias), totalCobrado: p.total, fianza: 500 }) as Reserva;

describe('reserva a partir de un pedido de la web, a precio de lista', () => {
  it('pedido 2178 (cupón fijo de 10 €): portabicicletas a 40 €, sillita a 24 €, el cupón aparte', () => {
    const d = datosReservaWeb(pedido2178, 3);
    expect(d.tarifaDiaria).toBe(40);
    expect(d.seguroDia).toBe(15);
    expect(d.incluyeSeguroTodoRiesgo).toBe(true);
    expect(d.extras).toEqual([
      { nombre: 'Sillita infantil - 8€/día', cantidad: 1, total: 24 },
      { nombre: 'Portabicicletas', cantidad: 1, total: 40 },
    ]);
    expect(d.descuento).toBe(10);
    expect(d.cupon).toBe('10mallorca');
  });

  it('pedido 2102 (descuento del 15 % sin código): alquiler a 120 € y 18 € de descuento aparte', () => {
    const d = datosReservaWeb(pedido2102, 4);
    expect(d).toMatchObject({ tarifaDiaria: 30, seguroDia: 15, descuento: 18, cupon: undefined });
  });

  it.each([['2178', pedido2178, 3], ['2102', pedido2102, 4], ['2062', pedido2062, 12]] as const)(
    'pedido %s: las líneas del desglose suman exactamente lo que pagó el cliente, sin ajustes',
    (_n, p, dias) => {
      const { lineas, total } = desgloseReserva(reservaDe(p, dias), dias);
      expect(lineas.some(l => l.tipo === 'ajuste')).toBe(false);
      expect(Math.round(lineas.reduce((a, l) => a + (l.importe ?? 0), 0) * 100) / 100).toBe(p.total);
      expect(total).toBe(p.total);
    },
  );

  it('solo con la cobertura Básica (gratis) no hay seguro a todo riesgo ni complementos', () => {
    const d = datosReservaWeb({ vehiculoTotal: 100, vehiculoSubtotal: 100, descuento: 0, cupones: [], extras: [{ nombre: 'Cobertura Básica - 500€', cantidad: 1, total: 0, subtotal: 0 }] }, 4);
    expect(d.incluyeSeguroTodoRiesgo).toBe(false);
    expect(d.seguroDia).toBeUndefined();
    expect(d.extras).toEqual([]);
    expect(d.tarifaDiaria).toBe(25);
  });

  it('un pedido antiguo sin precios de lista conserva lo que cobró la web y no inventa un descuento', () => {
    const d = datosReservaWeb({ vehiculoTotal: 117.5, extras: [{ nombre: 'Portabicicletas', cantidad: 1, total: 37.5 }], descuento: 10, cupones: undefined }, 3);
    expect(d.descuento).toBe(0);
    expect(d.extras).toEqual([{ nombre: 'Portabicicletas', cantidad: 1, total: 37.5 }]);
    expect(d.tarifaDiaria).toBe(39.17);
  });

  it('varios cupones se unen en un solo texto', () => {
    expect(datosReservaWeb({ ...pedido2178, cupones: [{ codigo: 'A', importe: 4 }, { codigo: 'B', importe: 6 }] }, 3).cupon).toBe('A, B');
  });
});
