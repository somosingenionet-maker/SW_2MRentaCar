import { describe, it, expect } from 'vitest';
import { errorCambioAceite, estadoProximoCambio, normalizarAceite } from './cambioAceite';

describe('errorCambioAceite', () => {
  it('todo vacío o completo y coherente es válido', () => {
    expect(errorCambioAceite({})).toBe('');
    expect(errorCambioAceite({ aceiteFecha: '2026-10-01', aceiteKm: 85000, aceiteProximaFecha: '2027-10-01' })).toBe('');
    expect(errorCambioAceite({ aceiteFecha: '2026-10-01', aceiteProximaFecha: '2026-10-01' })).toBe('');
  });
  it('el próximo cambio no puede ser anterior al último', () => {
    expect(errorCambioAceite({ aceiteFecha: '2026-10-01', aceiteProximaFecha: '2026-09-30' })).toContain('no puede ser anterior');
  });
  it('con solo una de las dos fechas no hay nada que comparar', () => {
    expect(errorCambioAceite({ aceiteProximaFecha: '2020-01-01' })).toBe('');
    expect(errorCambioAceite({ aceiteFecha: '2026-10-01', aceiteProximaFecha: '' })).toBe('');
  });
  it('kilómetros negativos no valen', () => {
    expect(errorCambioAceite({ aceiteKm: -1 })).toContain('negativos');
    expect(errorCambioAceite({ aceiteKm: 0 })).toBe('');
  });
});

describe('estadoProximoCambio', () => {
  const hoy = '2026-11-11';
  it('sin fecha, sin estado', () => {
    expect(estadoProximoCambio(null, hoy)).toBeNull();
    expect(estadoProximoCambio('', hoy)).toBeNull();
    expect(estadoProximoCambio(undefined, hoy)).toBeNull();
  });
  it('vencido si ya pasó; hoy mismo cuenta como próximo, no vencido', () => {
    expect(estadoProximoCambio('2026-11-10', hoy)).toBe('vencido');
    expect(estadoProximoCambio('2026-11-11', hoy)).toBe('proximo');
  });
  it('próximo dentro de 30 días, al día más allá', () => {
    expect(estadoProximoCambio('2026-12-11', hoy)).toBe('proximo');
    expect(estadoProximoCambio('2026-12-12', hoy)).toBe('al_dia');
    expect(estadoProximoCambio('2027-06-01', hoy)).toBe('al_dia');
  });
});

describe('normalizarAceite', () => {
  it('lo vacío pasa a null para poder borrar el dato en la base', () => {
    expect(normalizarAceite({ aceiteFecha: '', aceiteKm: null, aceiteProximaFecha: '  ' })).toEqual({ aceiteFecha: null, aceiteKm: null, aceiteProximaFecha: null });
    expect(normalizarAceite({})).toEqual({ aceiteFecha: null, aceiteKm: null, aceiteProximaFecha: null });
  });
  it('conserva lo escrito y redondea los km', () => {
    expect(normalizarAceite({ aceiteFecha: '2026-10-01', aceiteKm: 85000.4, aceiteProximaFecha: '2027-10-01' })).toEqual({ aceiteFecha: '2026-10-01', aceiteKm: 85000, aceiteProximaFecha: '2027-10-01' });
    expect(normalizarAceite({ aceiteKm: 0 }).aceiteKm).toBe(0);
  });
});
