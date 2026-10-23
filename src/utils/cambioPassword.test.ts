import { describe, it, expect } from 'vitest';
import { validarCambioPassword, PASSWORD_MIN } from './cambioPassword';

const buena = { actual: 'info1234', nueva: 'ClaveNueva26', repetir: 'ClaveNueva26' };

describe('validarCambioPassword', () => {
  it('acepta un cambio correcto', () => {
    expect(validarCambioPassword(buena)).toBeNull();
  });

  it('exige la contraseña actual', () => {
    expect(validarCambioPassword({ ...buena, actual: '' })).toMatch(/actual/);
  });

  it('exige la longitud mínima (la misma que el servidor)', () => {
    const corta = 'a'.repeat(PASSWORD_MIN - 1);
    expect(validarCambioPassword({ ...buena, nueva: corta, repetir: corta })).toMatch(/al menos 8/);
    const justa = 'a'.repeat(PASSWORD_MIN);
    expect(validarCambioPassword({ ...buena, nueva: justa, repetir: justa })).toBeNull();
  });

  it('no deja repetir la misma contraseña', () => {
    expect(validarCambioPassword({ actual: 'info1234', nueva: 'info1234', repetir: 'info1234' })).toMatch(/distinta/);
  });

  it('exige que las dos nuevas coincidan', () => {
    expect(validarCambioPassword({ ...buena, repetir: 'OtraDistinta1' })).toMatch(/no coinciden/);
  });
});
