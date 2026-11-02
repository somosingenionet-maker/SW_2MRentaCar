import { describe, it, expect } from 'vitest';
import { desgloseReserva, hayAjusteImportante } from './desgloseReserva';
import type { Reserva } from '../types';

const reserva = (extra: Partial<Reserva> = {}) => ({
  tarifaDiaria: 30, seguroDia: 15, incluyeSeguroTodoRiesgo: true, totalCobrado: 180, fianza: 500, extras: [], descuento: 0, ...extra,
}) as Reserva;

describe('desgloseReserva', () => {
  it('alquiler + seguro: 4 días × 30 € y 4 días × 15 €, y el total es su suma', () => {
    const { lineas, total, fianza } = desgloseReserva(reserva(), 4);
    expect(lineas).toEqual([
      { tipo: 'alquiler', dias: 4, precio: 30, importe: 120 },
      { tipo: 'seguro', dias: 4, precio: 15, importe: 60 },
    ]);
    expect(total).toBe(180);
    expect(fianza).toBe(500);
  });

  it('con complementos y descuento: cada uno en su línea, el descuento en negativo, sin ajuste', () => {
    const { lineas } = desgloseReserva(reserva({
      totalCobrado: 219, descuento: 10, cupon: '10mallorca', tarifaDiaria: 40, seguroDia: 15,
      extras: [{ nombre: 'Sillita infantil', cantidad: 1, total: 24 }, { nombre: 'Portabicicletas', cantidad: 1, total: 40 }],
    }), 3);
    expect(lineas.map(l => l.tipo)).toEqual(['alquiler', 'seguro', 'extra', 'extra', 'descuento']);
    expect(lineas[4]).toEqual({ tipo: 'descuento', cupon: '10mallorca', importe: -10 });
    expect(lineas.reduce((a, l) => a + (l.importe ?? 0), 0)).toBe(219);
  });

  it('sin seguro a todo riesgo sale la póliza de terceros, sin importe', () => {
    const { lineas } = desgloseReserva(reserva({ incluyeSeguroTodoRiesgo: false, totalCobrado: 120 }), 4);
    expect(lineas[1]).toEqual({ tipo: 'terceros', importe: null });
  });

  it('seguro incluido pero sin precio guardado (reserva antigua): «incluido», sin importe propio', () => {
    const { lineas } = desgloseReserva(reserva({ seguroDia: undefined, totalCobrado: 120 }), 4);
    expect(lineas[1]).toEqual({ tipo: 'seguro-incluido', importe: null });
    expect(lineas.some(l => l.tipo === 'ajuste')).toBe(false);
  });

  it('si el total guardado no sale de la cuenta, lo dice con una línea de ajuste y se puede detectar', () => {
    const { lineas } = desgloseReserva(reserva({ totalCobrado: 135 }), 4);
    expect(lineas[lineas.length - 1]).toEqual({ tipo: 'ajuste', importe: -45 });
    expect(hayAjusteImportante(lineas)).toBe(true);
  });

  it('una diferencia de un céntimo es redondeo: se ve pero no se considera error', () => {
    const { lineas } = desgloseReserva(reserva({ totalCobrado: 180.01 }), 4);
    expect(lineas[lineas.length - 1]).toEqual({ tipo: 'ajuste', importe: 0.01 });
    expect(hayAjusteImportante(lineas)).toBe(false);
  });

  it('la fianza no forma parte del total ni de las líneas', () => {
    const { lineas, total } = desgloseReserva(reserva({ fianza: 700 }), 4);
    expect(total).toBe(180);
    expect(lineas.every(l => l.tipo !== ('fianza' as string))).toBe(true);
  });
});
