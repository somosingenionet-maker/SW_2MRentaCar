import { describe, it, expect } from 'vitest';
import { formatEuros } from './moneda';

// El espacio entre la cifra y el € es un espacio duro: se normaliza para comparar.
const texto = (n: number) => formatEuros(n).replace(/\s/g, ' ');

describe('formatEuros', () => {
  it('sin decimales cuando la cifra es exacta', () => {
    expect(texto(121)).toBe('121 €');
    expect(texto(0)).toBe('0 €');
  });

  it('con dos decimales cuando hay céntimos', () => {
    expect(texto(121.5)).toBe('121,50 €');
    expect(texto(48.4)).toBe('48,40 €');
    expect(texto(151.6)).toBe('151,60 €');
  });

  it('los restos de coma flotante no inventan decimales', () => {
    expect(texto(120.99999999)).toBe('121 €');
    expect(texto(0.1 + 0.2)).toBe('0,30 €');
  });

  it('respeta los negativos', () => {
    expect(texto(-25)).toBe('-25 €');
    expect(texto(-25.5)).toBe('-25,50 €');
  });
});
