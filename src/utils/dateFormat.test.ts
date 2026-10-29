import { describe, expect, it } from 'vitest';
import { formatDate } from './dateFormat';

describe('formatDate', () => {
  it('formatea en español', () => expect(formatDate('2026-07-15')).toBe('15 jul. 2026'));
  it('quita el cero inicial del día', () => expect(formatDate('2026-01-05')).toBe('5 ene. 2026'));
  it('formatea en inglés cuando se pide', () => {
    expect(formatDate('2026-07-15', 'en')).toBe('15 Jul 2026');
    expect(formatDate('2026-01-05', 'en')).toBe('5 Jan 2026');
    expect(formatDate('2026-12-31', 'en')).toBe('31 Dec 2026');
  });
  it('por defecto sigue siendo español', () => expect(formatDate('2026-10-31', 'es')).toBe(formatDate('2026-10-31')));
  it('vacío o mal formado no rompe', () => {
    expect(formatDate('')).toBe('—');
    expect(formatDate('basura')).toBe('basura');
  });
});
