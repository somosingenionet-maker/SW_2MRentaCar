import { describe, expect, it } from 'vitest';
import { formatDate } from './dateFormat';

describe('formatDate', () => {
  it('formatea en español', () => expect(formatDate('2026-07-15')).toBe('15 jul. 2026'));
  it('quita el cero inicial del día', () => expect(formatDate('2026-01-05')).toBe('5 ene. 2026'));
  it('vacío o mal formado no rompe', () => {
    expect(formatDate('')).toBe('—');
    expect(formatDate('basura')).toBe('basura');
  });
});
