import { describe, expect, it } from 'vitest';
import { escaparCeldaCsv, slugify } from './csvExport';

describe('escaparCeldaCsv (inyección de fórmulas)', () => {
  it.each(['=HYPERLINK("http://malo.example","clic")', '=1+1', '@SUM(A1)', '+cmd|calc', '-2+3+cmd', '\t=1+1', '\r=1+1'])(
    'neutraliza %j', texto => expect(escaparCeldaCsv(texto).startsWith("'")).toBe(true),
  );
  it.each(['Juan Pérez', 'Calle Mayor 5', '', 'a=b', '2026-10-07'])('no toca el texto normal %j', texto => expect(escaparCeldaCsv(texto)).toBe(texto));
  it.each(['+34 633 47 48 87', '-5.00', '+34633474887', '(+34) 633 47 48 87'.replace('(+34)', '+34'), '1.234,56', '-12'])(
    'no altera números ni teléfonos %j', texto => expect(escaparCeldaCsv(texto)).toBe(texto),
  );
});

describe('slugify', () => {
  it('quita acentos y símbolos', () => expect(slugify('2M Rent a Car, S.L.')).toBe('2M_Rent_a_Car_S_L'));
  it('devuelve un nombre por defecto si queda vacío', () => expect(slugify('¡¡¡')).toBe('empresa'));
});
