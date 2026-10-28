import { describe, it, expect } from 'vitest';
import { hoyISO, sumarAnios, sumarDias } from './fechas';

describe('sumarAnios', () => {
  it('suma un año manteniendo mes y día', () => {
    expect(sumarAnios('2026-10-08', 1)).toBe('2027-10-08');
  });

  it('el 29 de febrero pasa al 28 en un año no bisiesto', () => {
    expect(sumarAnios('2028-02-29', 1)).toBe('2029-02-28');
  });

  it('el 29 de febrero se mantiene en otro año bisiesto', () => {
    expect(sumarAnios('2024-02-29', 4)).toBe('2028-02-29');
  });

  it('devuelve la entrada si la fecha no es válida', () => {
    expect(sumarAnios('', 1)).toBe('');
    expect(sumarAnios('no-es-fecha', 1)).toBe('no-es-fecha');
  });
});

describe('hoyISO', () => {
  it('tiene formato AAAA-MM-DD', () => {
    expect(hoyISO()).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});

describe('sumarDias', () => {
  it('suma días dentro del mes y cruzando mes y año', () => {
    expect(sumarDias('2026-10-08', 5)).toBe('2026-10-13');
    expect(sumarDias('2026-10-30', 3)).toBe('2026-11-02');
    expect(sumarDias('2026-12-30', 3)).toBe('2027-01-02');
  });

  it('resta con números negativos y respeta los bisiestos', () => {
    expect(sumarDias('2026-03-01', -1)).toBe('2026-02-28');
    expect(sumarDias('2028-03-01', -1)).toBe('2028-02-29');
  });
});
