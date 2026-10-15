import { describe, it, expect } from 'vitest';
import { kilometrajeTrasIngreso, avisoKilometraje } from './kilometraje';

describe('kilometrajeTrasIngreso', () => {
  it('sube la ficha si el ingreso tiene más km', () => {
    expect(kilometrajeTrasIngreso(1000, 5100)).toBe(5100);
  });
  it('nunca baja la ficha', () => {
    expect(kilometrajeTrasIngreso(5100, 500)).toBe(5100);
    expect(kilometrajeTrasIngreso(5100, 5100)).toBe(5100);
  });
});

describe('avisoKilometraje', () => {
  it('avisa si el valor es menor que el registrado', () => {
    expect(avisoKilometraje(5100, 500)).toMatch(/5\.?100 km/);
  });
  it('no avisa si es igual, mayor, vacío o no hay dato', () => {
    expect(avisoKilometraje(5100, 5100)).toBeNull();
    expect(avisoKilometraje(5100, 6000)).toBeNull();
    expect(avisoKilometraje(5100, '')).toBeNull();
    expect(avisoKilometraje(undefined, 100)).toBeNull();
  });
});
