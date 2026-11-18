import { describe, it, expect } from 'vitest';
import { ampliacionTrasCambio, ajustarBaseAmpliacion } from './ampliacionReserva';
import { desgloseReserva } from './desgloseReserva';

describe('ampliación de un alquiler', () => {
  it('la primera ampliación guarda lo inicial (días y total) y anota los días nuevos con su importe', () => {
    const a = ampliacionTrasCambio(null, { diasAntes: 31, diasDespues: 38, totalAntes: 600, totalDespues: 617, fechaFinNueva: '2026-11-22' });
    expect(a).toEqual({ diasBase: 31, totalBase: 600, extras: [{ dias: 7, importe: 17, hasta: '2026-11-22' }] });
  });
  it('una segunda ampliación conserva lo inicial y suma otra línea', () => {
    const previa = { diasBase: 31, totalBase: 600, extras: [{ dias: 7, importe: 17, hasta: '2026-11-22' }] };
    const a = ampliacionTrasCambio(previa, { diasAntes: 38, diasDespues: 41, totalAntes: 617, totalDespues: 650, fechaFinNueva: '2026-11-25' });
    expect(a).toEqual({ diasBase: 31, totalBase: 600, extras: [{ dias: 7, importe: 17, hasta: '2026-11-22' }, { dias: 3, importe: 33, hasta: '2026-11-25' }] });
  });
  it('acortar quita días de la última ampliación y ajusta su importe', () => {
    const previa = { diasBase: 31, totalBase: 600, extras: [{ dias: 7, importe: 70, hasta: '2026-11-22' }] };
    const a = ampliacionTrasCambio(previa, { diasAntes: 38, diasDespues: 36, totalAntes: 670, totalDespues: 650, fechaFinNueva: '2026-11-20' });
    expect(a).toEqual({ diasBase: 31, totalBase: 600, extras: [{ dias: 5, importe: 50, hasta: '2026-11-20' }] });
  });
  it('acortar todas las ampliaciones deja el alquiler sin ampliación; acortar por debajo de lo inicial, también', () => {
    const previa = { diasBase: 31, totalBase: 600, extras: [{ dias: 7, importe: 70, hasta: '2026-11-22' }] };
    expect(ampliacionTrasCambio(previa, { diasAntes: 38, diasDespues: 31, totalAntes: 670, totalDespues: 600, fechaFinNueva: '2026-11-15' })).toBeNull();
    expect(ampliacionTrasCambio(previa, { diasAntes: 38, diasDespues: 25, totalAntes: 670, totalDespues: 500, fechaFinNueva: '2026-11-09' })).toBeNull();
  });
  it('acortar un alquiler que nunca se amplió no crea nada', () => {
    expect(ampliacionTrasCambio(null, { diasAntes: 10, diasDespues: 8, totalAntes: 100, totalDespues: 80, fechaFinNueva: 'x' })).toBeNull();
  });
  it('mismos días: se conserva lo que había', () => {
    const previa = { diasBase: 31, totalBase: 600, extras: [{ dias: 7, importe: 17, hasta: '2026-11-22' }] };
    expect(ampliacionTrasCambio(previa, { diasAntes: 38, diasDespues: 38, totalAntes: 617, totalDespues: 617, fechaFinNueva: '2026-11-22' })).toEqual(previa);
    expect(ampliacionTrasCambio(null, { diasAntes: 38, diasDespues: 38, totalAntes: 617, totalDespues: 617, fechaFinNueva: 'x' })).toBeNull();
  });
  it('cambiar el precio o los complementos pasa la diferencia a lo inicial', () => {
    const previa = { diasBase: 31, totalBase: 600, extras: [{ dias: 7, importe: 17, hasta: '2026-11-22' }] };
    expect(ajustarBaseAmpliacion(previa, 25)?.totalBase).toBe(625);
    expect(ajustarBaseAmpliacion(null, 25)).toBeNull();
  });
});

describe('desglose de un alquiler ampliado', () => {
  const r = { tarifaDiaria: 1.13, precioFijo: null, seguroDia: 15, incluyeSeguroTodoRiesgo: true, totalCobrado: 617, fianza: 500 };
  const ampliacion = { diasBase: 31, totalBase: 600, extras: [{ dias: 7, importe: 17, hasta: '2026-11-22' }] };
  it('enseña lo inicial y los extras aparte y la suma es el total, sin ajuste', () => {
    const d = desgloseReserva({ ...r, ampliacion }, 38);
    expect(d.lineas).toEqual([
      { tipo: 'reserva-inicial', dias: 31, importe: 600 },
      { tipo: 'ampliacion', dias: 7, importe: 17, hasta: '2026-11-22' },
    ]);
    expect(d.total).toBe(617);
    expect(d.fianza).toBe(500);
  });
  it('si el total guardado ya no cuadra, lo dice con una línea de ajuste', () => {
    const d = desgloseReserva({ ...r, totalCobrado: 630, ampliacion }, 38);
    expect(d.lineas[d.lineas.length - 1]).toEqual({ tipo: 'ajuste', importe: 13 });
  });
  it('sin ampliación sigue siendo el desglose de siempre', () => {
    expect(desgloseReserva({ ...r, totalCobrado: 600 }, 31).lineas[0]).toMatchObject({ tipo: 'alquiler', dias: 31 });
    expect(desgloseReserva({ ...r, totalCobrado: 600, ampliacion: { diasBase: 1, totalBase: 1, extras: [] } }, 31).lineas[0]).toMatchObject({ tipo: 'alquiler' });
  });
});
