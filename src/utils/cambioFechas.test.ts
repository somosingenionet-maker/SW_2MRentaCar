import { describe, it, expect } from 'vitest';
import { puedeCambiarFechas, propuestaCambioFechas, propuestaExtension, valorMostrado, aplicarCambioFechas, type BorradorFechas } from './cambioFechas';
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

  it('ampliar dos días en una reserva manual: se sugiere 40 €/día y se suma a lo que ya había (120 + 2 × 40 = 200 €)', () => {
    const b = borrador({ fechaFin: '2027-01-15' });
    expect(propuestaExtension(reserva(), b)).toMatchObject({ dias: 2, modo: 'dia', sugerido: '40', valor: '40', importe: 80, precioDia: 40 });
    const r = aplicarCambioFechas(reserva(), [], b, false);
    expect(r).toMatchObject({ ok: true, diasAntes: 3, diasDespues: 5, cambios: { fechaFin: '2027-01-15', totalCobrado: 200, tarifaDiaria: 40 }, extension: { dias: 2, importe: 80, modo: 'dia', precioDia: 40 } });
  });

  it('ampliar con un precio cerrado por los días nuevos: 500 + 100 = 600 sin tocar el precio inicial', () => {
    const inicial = reserva({ totalCobrado: 500, precioFijo: 500, tarifaDiaria: 16.13 });
    const b = borrador({ fechaFin: '2027-01-20', modoExtra: 'cerrado', valorExtra: '100' });
    const r = aplicarCambioFechas(inicial, [], b, false);
    expect(r).toMatchObject({ ok: true, diasDespues: 10, cambios: { totalCobrado: 600, tarifaDiaria: 16.13 }, extension: { dias: 7, importe: 100, modo: 'cerrado' } });
    expect(r.ok && r.cambios.precioFijo).toBeUndefined();
  });

  it('ampliar por día: 7 días × 14,29 € (la coma también vale)', () => {
    const b = borrador({ fechaFin: '2027-01-20', modoExtra: 'dia', valorExtra: '14,29' });
    expect(propuestaExtension(reserva(), b)).toMatchObject({ dias: 7, modo: 'dia', importe: 100.03, precioDia: 14.29 });
    expect(aplicarCambioFechas(reserva(), [], b, false)).toMatchObject({ ok: true, cambios: { totalCobrado: 220.03 }, extension: { modo: 'dia', precioDia: 14.29, importe: 100.03 } });
  });

  it('al ampliar hay que indicar lo de los días nuevos (mayor que 0), sea cerrado o por día', () => {
    const cerrado = aplicarCambioFechas(reserva(), [], borrador({ fechaFin: '2027-01-20', modoExtra: 'cerrado' }), false);
    expect(cerrado).toMatchObject({ ok: false, error: expect.stringContaining('precio cerrado de los 7 días adicionales') });
    expect(aplicarCambioFechas(reserva(), [], borrador({ fechaFin: '2027-01-20', modoExtra: 'cerrado', valorExtra: '0' }), false)).toMatchObject({ ok: false });
    expect(aplicarCambioFechas(reserva(), [], borrador({ fechaFin: '2027-01-20', modoExtra: 'dia', valorExtra: '' }), false)).toMatchObject({ ok: false, error: expect.stringContaining('valor por día') });
    // un solo día adicional: singular
    expect(aplicarCambioFechas(reserva(), [], borrador({ fechaFin: '2027-01-14', modoExtra: 'cerrado' }), false)).toMatchObject({ ok: false, error: expect.stringContaining('1 día adicional') });
  });

  it('una reserva que no se recalcula sola (web o precio pactado) no sugiere nada: empieza en precio cerrado', () => {
    const fijo = reserva({ precioFijo: 100, tarifaDiaria: 33.33, totalCobrado: 145, incluyeSeguroTodoRiesgo: true, seguroDia: 15 });
    expect(propuestaExtension(fijo, borrador({ fechaFin: '2027-01-14' }))).toMatchObject({ modo: 'cerrado', sugerido: '', valor: '', importe: null });
    expect(propuestaExtension(reserva({ origen: 'web' }), borrador({ fechaFin: '2027-01-14' }))).toMatchObject({ modo: 'cerrado' });
  });

  it('sin ampliar (mismos días o menos) no hay extensión', () => {
    expect(propuestaExtension(reserva(), borrador())).toBeNull();
    expect(propuestaExtension(reserva(), borrador({ fechaFin: '2027-01-12' }))).toBeNull();
  });

  it('acortar también recalcula; el seguro por día y los complementos por día cuentan', () => {
    const conSeguro = reserva({ incluyeSeguroTodoRiesgo: true, seguroDia: 15, totalCobrado: 165, extras: [{ nombre: 'Sillita infantil', cantidad: 1, precio: 8, porDia: true, total: 24 }] });
    const t = totalTrasCambioDePeriodo({ ...conSeguro, totalCobrado: 120 + 45 + 24 }, { fechaFin: '2027-01-12' });
    expect(t.diasDespues).toBe(2);
    expect(t.recalculado).toBe(true);
    expect(t.total).toBe(80 + 30 + 16);
    expect(t.extras?.[0].total).toBe(16);
  });

  it('al acortar, el usuario puede corregir el total propuesto; es lo que se guarda', () => {
    const b = borrador({ fechaFin: '2027-01-12', valor: '70,50' });
    expect(valorMostrado(reserva(), b)).toBe('70,50');
    expect(aplicarCambioFechas(reserva(), [], b, false)).toMatchObject({ ok: true, cambios: { totalCobrado: 70.5 } });
    expect(valorMostrado(reserva(), borrador({ fechaFin: '2027-01-12' }))).toBe('80');
  });

  it('una reserva de la web no se recalcula sola: se propone sumar los días de más a la tarifa y se confirma', () => {
    const web = reserva({ origen: 'web', totalCobrado: 100, tarifaDiaria: 33.33, incluyeSeguroTodoRiesgo: true, seguroDia: 10 });
    const p = propuestaCambioFechas(web, borrador({ fechaFin: '2027-01-14' }));
    expect(p).toMatchObject({ modo: 'total', recalculado: false, diasDespues: 4 });
    expect(p.propuesta).toBeCloseTo(100 + 43.33, 2);
  });

  it('con precio cerrado, al acortar se pide el precio cerrado: no cambia solo, y el seguro por día sí', () => {
    const fijo = reserva({ precioFijo: 100, tarifaDiaria: 33.33, totalCobrado: 145, incluyeSeguroTodoRiesgo: true, seguroDia: 15 });
    const b = borrador({ fechaFin: '2027-01-12' });
    expect(propuestaCambioFechas(fijo, b)).toMatchObject({ modo: 'fijo', propuesta: 100 });
    const r = aplicarCambioFechas(fijo, [], b, false);
    expect(r).toMatchObject({ ok: true, cambios: { precioFijo: 100, totalCobrado: 130 } });
    const r2 = aplicarCambioFechas(fijo, [], { ...b, valor: '80' }, false);
    expect(r2).toMatchObject({ ok: true, cambios: { precioFijo: 80, totalCobrado: 110, tarifaDiaria: 40 } });
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
    expect(aplicarCambioFechas(reserva(), [], borrador({ fechaFin: '2027-01-12', valor: '0' }), false)).toMatchObject({ ok: false, error: expect.stringContaining('total') });
  });

  it('con la entrega ya hecha, la fecha de entrega que llegue del formulario se ignora', () => {
    const r = aplicarCambioFechas(reserva(), [], borrador({ fechaInicio: '2027-01-05', fechaFin: '2027-01-15' }), true);
    expect(r).toMatchObject({ ok: true, cambios: { fechaInicio: '2027-01-10', fechaFin: '2027-01-15' } });
  });

  it('sin tocar nada se avisa de que no hay cambios', () => {
    expect(aplicarCambioFechas(reserva(), [], borrador(), false)).toMatchObject({ ok: true, sinCambios: true, cambios: { totalCobrado: 120 } });
  });
});
