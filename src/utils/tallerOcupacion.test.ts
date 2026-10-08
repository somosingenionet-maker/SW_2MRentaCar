import { describe, it, expect } from 'vitest';
import { vehiculosEnTaller, ocupacionDia, nivelCupo, ingresoDeOT } from './tallerOcupacion';
import { OrdenTrabajo } from '../types';

const ot = (p: Partial<OrdenTrabajo>): OrdenTrabajo => ({
  id: p.id ?? 'ot', numero: 'OT-1', vehiculoId: p.vehiculoId ?? 'v1', clienteId: 'c', estado: 'recibido',
  fechaRecepcion: '2026-10-08', kilometrajeEntrada: 1000, descripcionProblema: '', lineas: [], subtotal: 0,
  ivaPct: 21, totalIva: 0, total: 0, fechaActualizacion: '', ...p,
}) as OrdenTrabajo;

describe('vehiculosEnTaller', () => {
  it('cuenta recibido, en reparación y listo; no presupuesto, entregado ni cancelado', () => {
    const lista = [
      ot({ id: '1', vehiculoId: 'a', estado: 'recibido' }), ot({ id: '2', vehiculoId: 'b', estado: 'en_reparacion' }),
      ot({ id: '3', vehiculoId: 'c', estado: 'listo' }), ot({ id: '4', vehiculoId: 'd', estado: 'presupuesto' }),
      ot({ id: '5', vehiculoId: 'e', estado: 'entregado' }), ot({ id: '6', vehiculoId: 'f', estado: 'cancelado' }),
    ];
    expect(vehiculosEnTaller(lista)).toBe(3);
  });

  it('un coche con dos órdenes abiertas cuenta una vez', () => {
    expect(vehiculosEnTaller([ot({ id: '1', vehiculoId: 'a' }), ot({ id: '2', vehiculoId: 'a', estado: 'en_reparacion' })])).toBe(1);
  });
});

describe('ocupacionDia', () => {
  const hoy = '2026-10-10';
  it('un coche entregado ocupa los días hasta su entrega y no desde hoy', () => {
    const lista = [ot({ estado: 'entregado', fechaRecepcion: '2026-10-07', fechaEntrega: '2026-10-09' })];
    expect(ocupacionDia(lista, '2026-10-08', hoy)).toBe(1);
    expect(ocupacionDia(lista, '2026-10-09', hoy)).toBe(1);
    expect(ocupacionDia(lista, '2026-10-10', hoy)).toBe(0);
    expect(ocupacionDia(lista, '2026-10-06', hoy)).toBe(0);
  });

  it('un coche sin entregar ocupa hasta la fecha estimada si es futura', () => {
    const lista = [ot({ estado: 'en_reparacion', fechaRecepcion: '2026-10-08', fechaEstimadaEntrega: '2026-10-13' })];
    expect(ocupacionDia(lista, '2026-10-12', hoy)).toBe(1);
    expect(ocupacionDia(lista, '2026-10-14', hoy)).toBe(0);
  });

  it('el recuento de hoy coincide con el de "ahora mismo"', () => {
    const lista = [
      ot({ id: '1', vehiculoId: 'a', estado: 'recibido', fechaRecepcion: '2026-10-09' }),
      ot({ id: '2', vehiculoId: 'b', estado: 'entregado', fechaRecepcion: '2026-10-08', fechaEntrega: hoy }),
      ot({ id: '3', vehiculoId: 'c', estado: 'presupuesto', fechaRecepcion: hoy }),
    ];
    expect(ocupacionDia(lista, hoy, hoy)).toBe(vehiculosEnTaller(lista));
  });
});

describe('nivelCupo', () => {
  it('sin capacidad definida no hay límite', () => {
    expect(nivelCupo(5, 0)).toBe('sin-limite');
  });
  it('libre, casi lleno, completo y excedido', () => {
    expect(nivelCupo(3, 10)).toBe('libre');
    expect(nivelCupo(8, 10)).toBe('casi-lleno');
    expect(nivelCupo(10, 10)).toBe('completo');
    expect(nivelCupo(11, 10)).toBe('excedido');
  });
});

describe('ingresoDeOT', () => {
  it('saca el momento del ingreso del historial y los km de entrada', () => {
    const o = ot({ kilometrajeEntrada: 5100, historial: [
      { fecha: '2026-10-08T18:01:00.000Z', descripcion: 'Presupuesto creado' },
      { fecha: '2026-10-08T18:08:00.000Z', descripcion: 'Presupuesto aprobado — vehículo recibido en taller' },
    ] });
    expect(ingresoDeOT(o)).toEqual({ fechaHora: '2026-10-08T18:08:00.000Z', km: 5100 });
  });
  it('no hay ingreso en un presupuesto', () => {
    expect(ingresoDeOT(ot({ estado: 'presupuesto' }))).toBeNull();
  });
});
