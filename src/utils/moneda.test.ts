import { describe, it, expect } from 'vitest';
import { formatEuros, fmt2 } from './moneda';

// El espacio entre la cifra y el € es un espacio duro: se normaliza para comparar.
const texto = (n: number) => formatEuros(n).replace(/\s/g, ' ');

describe('formatEuros', () => {
  it('con dos decimales también cuando la cifra es exacta', () => {
    expect(texto(121)).toBe('121,00 €');
    expect(texto(0)).toBe('0,00 €');
  });

  it('y con los céntimos que tenga', () => {
    expect(texto(121.5)).toBe('121,50 €');
    expect(texto(48.4)).toBe('48,40 €');
    expect(texto(151.6)).toBe('151,60 €');
  });

  it('los restos de coma flotante no inventan decimales', () => {
    expect(texto(120.99999999)).toBe('121,00 €');
    expect(texto(0.1 + 0.2)).toBe('0,30 €');
  });

  it('respeta los negativos', () => {
    expect(texto(-25)).toBe('-25,00 €');
    expect(texto(-25.5)).toBe('-25,50 €');
  });
});

describe('fmt2', () => {
  it('siempre dos decimales y coma decimal', () => {
    expect(fmt2(45)).toBe('45,00');
    expect(fmt2(45.5)).toBe('45,50');
    expect(fmt2(0.1 + 0.2)).toBe('0,30');
    expect(fmt2(99.99000000000001)).toBe('99,99');
    expect(fmt2(1234.5)).toBe('1234,50');
    expect(fmt2(12345.6)).toBe('12.345,60');
  });
  it('el contrato en inglés lo pide con punto', () => {
    expect(fmt2(45.5, 'en-GB')).toBe('45.50');
    expect(fmt2(12345.6, 'en-GB')).toBe('12,345.60');
  });
});
