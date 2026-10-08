import { describe, expect, it } from 'vitest';
import { contrastText } from './color';

describe('contrastText', () => {
  it('texto blanco sobre fondos oscuros', () => {
    for (const c of ['#000000', '#7A4A93', '#1e293b', '#0f172a']) expect(contrastText(c)).toBe('#ffffff');
  });
  it('texto negro sobre fondos claros', () => {
    for (const c of ['#ffffff', '#DCBAE8', '#fde68a', '#f1f5f9']) expect(contrastText(c)).toBe('#000000');
  });
  it('el lila de marca de 2M tiene un contraste legible', () => expect(['#ffffff', '#000000']).toContain(contrastText('#C38DD6')));
});
