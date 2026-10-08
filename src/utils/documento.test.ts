import { describe, expect, it } from 'vitest';
import { documentoValido, normalizarDocumento } from './documento';

describe('normalizarDocumento', () => {
  it('quita espacios, puntos y guiones y pasa a mayúsculas', () => {
    expect(normalizarDocumento(' 12.345.678-z ')).toBe('12345678Z');
    expect(normalizarDocumento('x-123 4567 l')).toBe('X1234567L');
  });
});

describe('documentoValido', () => {
  it.each(['12345678Z', '00000000T', '99999999R'])('acepta el DNI %s', d => expect(documentoValido('dni', d)).toBe(true));
  it.each(['12345678A', '1234567Z', '123456789', 'ABCDEFGHI', ''])('rechaza el DNI %s', d => expect(documentoValido('dni', d)).toBe(false));
  it.each(['X1234567L', 'Y0000000Z'])('acepta el NIE %s', d => expect(documentoValido('nie', d)).toBe(true));
  it.each(['X1234567A', 'A1234567L', 'X123456L', ''])('rechaza el NIE %s', d => expect(documentoValido('nie', d)).toBe(false));
  it.each(['AB123456', 'P1234567', '123456789012345'])('acepta el pasaporte %s', d => expect(documentoValido('pasaporte', d)).toBe(true));
  it.each(['123', 'AB 12!', 'ÁÉÍÓÚ123', 'A'.repeat(21), ''])('rechaza el pasaporte %s', d => expect(documentoValido('pasaporte', d)).toBe(false));
});
