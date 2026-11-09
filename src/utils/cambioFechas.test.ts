import { describe, it, expect } from 'vitest';
import { puedeCambiarFechas, propuestaCambioFechas, valorMostrado, aplicarCambioFechas, type BorradorFechas } from './cambioFechas';
import { totalTrasCambioDePeriodo } from './condicionesAlquiler';
import type { Reserva } from '../types';

const reserva = (o: Partial<Reserva> = {}): Reserva => ({
  id: 'r1', vehiculoId: 'v1', clienteId: 'c1', fechaInicio: '2027-01-10', fechaFin: '2027-01-13', horaInicio: '12:00', horaFin: '12:00',
  temporada: 'media', tarifaDiaria: 40, totalCobrado: 120, estado: 'confirmada', incluyeSeguroTodoRiesgo: false, origen: 'manual', extras: [], descuento: 0, ...o,
});
const borrador = (o: Partial<BorradorFechas> = {}): BorradorFechas => ({ fechaInicio: '2027-01-10', fechaFin: '2027-01-13', horaInicio: '12:00', horaFin: '12:00', valor: null, ...o });
const otra = (o: Partial<Reserva> = {}) => reserva({ id: 'r2', ...o });

describe('cambiar las fechas de una reserva', () => {
  it('se puede antes y durante el alquiler; no si está anulada o ya se devolvió; entregada = la entrega queda fija', () => {
    expect(puedeCambiarFechas(reserva())).toEqual({ ok: true, inicioBloqueado: false });
    expect(puedeCambiarFechas(reserva({ entrega: { fechaHora: '2027-01-10T12:00:00Z', km: 1, combustible: 'lleno', danos: '', responsable: 'x' } }))).toEqual({ ok: true, inicioBloqueado: true });
    expect(puedeCambiarFechas(reserva({ estado: 'cancelada' }))).toMatchObject({ ok: false });
    expect(puedeCambiarFechas(reserva({ devolucion: { fechaHora: '2027-01-13T12:00:00Z', km: 2, combustible: 'lleno', danos: '', responsable: 'x' } }))).toMatchObject({ ok: false, motivo: expect.stringContaining('devolvió') });
  });

  it('ampliar dos días en una reserva manual: el total se recalcula (3 → 5 días × 40 €)', () => {
    const b = borrador({ fechaFin: '2027-01-15' });
    expect(propuestaCambioFechas(reserva(), b)).toMatchObject({ modo: 'total', propuesta: 200, diasAntes: 3, diasDespues: 5, recalculado: true });
    const r = aplicarCambioFechas(reserva(), [], b, false);
    expect(r).toMatchObject({ ok: true, diasAntes: 3, diasDespues: 5, cambios: { fechaFin: '2027-01-15', totalCobrado: 200, tarifaDiaria: 40 } });
  });

  it('acortar también recalcula; el seguro por día y los complementos por día cuentan', () => {
    const conSeguro = reserva({ incluyeSeguroTodoRiesgo: true, seguroDia: 15, totalCobrado: 165, extras: [{ nombre: 'Sillita infantil', cantidad: 1, precio: 8, porDia: true, total: 24 }] });
    const t = totalTrasCambioDePeriodo({ ...conSeguro, totalCobrado: 120 + 45 + 24 }, { fechaFin: '2027-01-12' });
    expect(t.diasDespues).toBe(2);
    expect(t.recalculado).toBe(true);
    expect(t.total).toBe(80 + 30 + 16);
    expect(t.extras?.[0].total).toBe(16);
  });

  it('el usuario puede corregir el total propuesto; es lo que se guarda', () => {
    const b = borrador({ fechaFin: '2027-01-15', valor: '190,50' });
    expect(valorMostrado(reserva(), b)).toBe('190,50');
    expect(aplicarCambioFechas(reserva(), [], b, false)).toMatchObject({ ok: true, cambios: { totalCobrado: 190.5 } });
    expect(valorMostrado(reserva(), borrador({ fechaFin: '2027-01-15' }))).toBe('200');
  });

  it('una reserva de la web no se recalcula sola: se propone sumar los días de más a la tarifa y se confirma', () => {
    const web = reserva({ origen: 'web', totalCobrado: 100, tarifaDiaria: 33.33, incluyeSeguroTodoRiesgo: true, seguroDia: 10 });
    const p = propuestaCambioFechas(web, borrador({ fechaFin: '2027-01-14' }));
    expect(p).toMatchObject({ modo: 'total', recalculado: false, diasDespues: 4 });
    expect(p.propuesta).toBeCloseTo(100 + 43.33, 2);
  });

  it('con precio cerrado se pide el precio cerrado: no cambia solo, y el seguro por día sí', () => {
    const fijo = reserva({ precioFijo: 100, tarifaDiaria: 33.33, totalCobrado: 145, incluyeSeguroTodoRiesgo: true, seguroDia: 15 });
    const b = borrador({ fechaFin: '2027-01-14' });
    expect(propuestaCambioFechas(fijo, b)).toMatchObject({ modo: 'fijo', propuesta: 100 });
    const r = aplicarCambioFechas(fijo, [], b, false);
    expect(r).toMatchObject({ ok: true, cambios: { precioFijo: 100, totalCobrado: 160 } });
    const r2 = aplicarCambioFechas(fijo, [], { ...b, valor: '130' }, false);
    expect(r2).toMatchObject({ ok: true, cambios: { precioFijo: 130, totalCobrado: 190, tarifaDiaria: 32.5 } });
  });

  it('bloquea si el coche choca con otra reserva, y no cuenta ni la propia ni las anuladas', () => {
    const siguiente = otra({ fechaInicio: '2027-01-14', fechaFin: '2027-01-20' });
    const b = borrador({ fechaFin: '2027-01-15' });
    expect(aplicarCambioFechas(reserva(), [reserva(), siguiente], b, false)).toMatchObject({ ok: false, error: expect.stringContaining('choca con otra reserva') });
    expect(aplicarCambioFechas(reserva(), [reserva(), { ...siguiente, estado: 'cancelada' }], b, false)).toMatchObject({ ok: true });
    expect(aplicarCambioFechas(reserva(), [reserva(), { ...siguiente, vehiculoId: 'v2' }], b, false)).toMatchObject({ ok: true });
    expect(aplicarCambioFechas(reserva(), [reserva(), siguiente], borrador({ fechaFin: '2027-01-13' }), false)).toMatchObject({ ok: true });
  });

  it('valida las fechas y las horas', () => {
    expect(aplicarCambioFechas(reserva(), [], borrador({ fechaFin: '2027-01-09' }), false)).toMatchObject({ ok: false, error: expect.stringContaining('anterior') });
    expect(aplicarCambioFechas(reserva(), [], borrador({ fechaFin: '' }), false)).toMatchObject({ ok: false });
    expect(aplicarCambioFechas(reserva(), [], borrador({ horaFin: '' }), false)).toMatchObject({ ok: false, error: expect.stringContaining('hora de devolución') });
    expect(aplicarCambioFechas(reserva(), [], borrador({ fechaFin: '2027-01-10', horaFin: '11:00' }), false)).toMatchObject({ ok: false });
    expect(aplicarCambioFechas(reserva(), [], borrador({ fechaFin: '2027-01-15', valor: '0' }), false)).toMatchObject({ ok: false, error: expect.stringContaining('total') });
  });

  it('con la entrega ya hecha, la fecha de entrega que llegue del formulario se ignora', () => {
    const r = aplicarCambioFechas(reserva(), [], borrador({ fechaInicio: '2027-01-05', fechaFin: '2027-01-15' }), true);
    expect(r).toMatchObject({ ok: true, cambios: { fechaInicio: '2027-01-10', fechaFin: '2027-01-15' } });
  });

  it('sin tocar nada se avisa de que no hay cambios', () => {
    expect(aplicarCambioFechas(reserva(), [], borrador(), false)).toMatchObject({ ok: true, sinCambios: true, cambios: { totalCobrado: 120 } });
  });
});
