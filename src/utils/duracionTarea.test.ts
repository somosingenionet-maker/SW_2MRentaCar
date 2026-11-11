import { describe, it, expect } from 'vitest';
import { OPCIONES_DURACION, formatoDuracion, tiempoRegistrado, horasCobradas, formatoHorasCobradas, agruparDuraciones } from './duracionTarea';

describe('formatoDuracion', () => {
  it('minutos, horas y mezcla', () => {
    expect(formatoDuracion(15)).toBe('15 min');
    expect(formatoDuracion(45)).toBe('45 min');
    expect(formatoDuracion(60)).toBe('1 h');
    expect(formatoDuracion(75)).toBe('1 h 15 min');
    expect(formatoDuracion(150)).toBe('2 h 30 min');
    expect(formatoDuracion(360)).toBe('6 h');
  });
  it('sin dato válido no escribe nada', () => {
    for (const v of [null, undefined, 0, -5, NaN]) expect(formatoDuracion(v as number | null | undefined)).toBe('');
  });
  it('las opciones del mecánico van de menos a más, sin repetir, y todas son válidas para la base (5–1440)', () => {
    expect([...OPCIONES_DURACION]).toEqual([...OPCIONES_DURACION].sort((a, b) => a - b));
    expect(new Set(OPCIONES_DURACION).size).toBe(OPCIONES_DURACION.length);
    expect(OPCIONES_DURACION.slice(0, 4)).toEqual([15, 30, 45, 60]);
    for (const m of OPCIONES_DURACION) { expect(m).toBeGreaterThanOrEqual(5); expect(m).toBeLessThanOrEqual(1440); }
  });
});

describe('tiempoRegistrado', () => {
  it('suma las que tienen dato y cuenta cuántas son', () => {
    expect(tiempoRegistrado([30, 45, null, undefined, 0])).toEqual({ minutos: 75, conDato: 2 });
    expect(tiempoRegistrado([])).toEqual({ minutos: 0, conDato: 0 });
  });
});

describe('horas cobradas', () => {
  it('suma solo la mano de obra', () => {
    expect(horasCobradas([{ tipo: 'mano_de_obra', cantidad: 2 }, { tipo: 'producto', cantidad: 4 }, { tipo: 'mano_de_obra', cantidad: 1.5 }])).toBe(3.5);
    expect(horasCobradas(undefined)).toBe(0);
  });
  it('se escribe con coma y sin ceros de sobra', () => {
    expect(formatoHorasCobradas(2)).toBe('2 h');
    expect(formatoHorasCobradas(1.5)).toBe('1,5 h');
    expect(formatoHorasCobradas(0.25)).toBe('0,25 h');
  });
});

describe('agruparDuraciones', () => {
  it('agrupa por orden y salta las filas sin duración', () => {
    expect(agruparDuraciones([
      { otId: 'a', lineaId: '1', duracionMin: 30 }, { otId: 'a', lineaId: '2', duracionMin: null },
      { otId: 'b', lineaId: '3', duracionMin: 90 }, { otId: 'c', lineaId: '4' },
    ])).toEqual({ a: { '1': 30 }, b: { '3': 90 } });
  });
});
