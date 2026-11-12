import { describe, it, expect } from 'vitest';
import { aceiteTrasEntrega, errorCambioAceite, fechaMasMeses, hoyLocal, estadoProximoCambio, normalizarAceite } from './cambioAceite';

describe('errorCambioAceite', () => {
  it('todo vacío o completo y coherente es válido', () => {
    expect(errorCambioAceite({})).toBe('');
    expect(errorCambioAceite({ aceiteFecha: '2026-10-01', aceiteKm: 85000, aceiteProximaFecha: '2027-10-01' })).toBe('');
    expect(errorCambioAceite({ aceiteFecha: '2026-10-01', aceiteProximaFecha: '2026-10-01' })).toBe('');
  });
  it('los km del próximo cambio deben ser mayores que los del último y no negativos', () => {
    expect(errorCambioAceite({ aceiteKm: 85000, aceiteProximoKm: 100000 })).toBe('');
    expect(errorCambioAceite({ aceiteProximoKm: 100000 })).toBe('');
    expect(errorCambioAceite({ aceiteKm: 85000, aceiteProximoKm: 85000 })).toContain('mayores');
    expect(errorCambioAceite({ aceiteKm: 85000, aceiteProximoKm: 70000 })).toContain('mayores');
    expect(errorCambioAceite({ aceiteProximoKm: -1 })).toContain('negativos');
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
    expect(normalizarAceite({ aceiteFecha: '', aceiteKm: null, aceiteProximaFecha: '  ', aceiteProximoKm: null })).toEqual({ aceiteFecha: null, aceiteKm: null, aceiteProximaFecha: null, aceiteProximoKm: null });
    expect(normalizarAceite({})).toEqual({ aceiteFecha: null, aceiteKm: null, aceiteProximaFecha: null, aceiteProximoKm: null });
  });
  it('conserva lo escrito y redondea los km', () => {
    expect(normalizarAceite({ aceiteFecha: '2026-10-01', aceiteKm: 85000.4, aceiteProximaFecha: '2027-10-01', aceiteProximoKm: 100000.6 })).toEqual({ aceiteFecha: '2026-10-01', aceiteKm: 85000, aceiteProximaFecha: '2027-10-01', aceiteProximoKm: 100001 });
    expect(normalizarAceite({ aceiteKm: 0 }).aceiteKm).toBe(0);
  });
});

describe('aceiteTrasEntrega', () => {
  const ot = { fechaRecepcion: '2026-11-09', fechaEntrega: '2026-11-10', kilometrajeEntrada: 85000, kilometrajeSalida: 85010 };
  it('anota la fecha de entrega y los km de salida, y borra el próximo cambio anterior', () => {
    expect(aceiteTrasEntrega({ aceiteFecha: '2025-11-01', aceiteKm: 70000, aceiteProximaFecha: '2026-11-01' }, ot, '2026-11-11'))
      .toEqual({ aceiteFecha: '2026-11-10', aceiteKm: 85010, aceiteProximaFecha: null, aceiteProximoKm: null });
  });
  it('sin km de salida usa los de entrada; sin fecha de entrega usa hoy', () => {
    expect(aceiteTrasEntrega({}, { kilometrajeEntrada: 85000 }, '2026-11-11')).toEqual({ aceiteFecha: '2026-11-11', aceiteKm: 85000, aceiteProximaFecha: null, aceiteProximoKm: null });
  });
  it('sin km válidos conserva los que ya había', () => {
    expect(aceiteTrasEntrega({ aceiteKm: 70000 }, { fechaEntrega: '2026-11-10', kilometrajeEntrada: 0 }, '2026-11-11')?.aceiteKm).toBe(70000);
    expect(aceiteTrasEntrega({}, { fechaEntrega: '2026-11-10', kilometrajeEntrada: 0 }, '2026-11-11')?.aceiteKm).toBeNull();
  });
  it('si la ficha ya tiene un cambio de esta visita o posterior (lo anotó el mecánico), no toca nada y conserva el próximo cambio', () => {
    expect(aceiteTrasEntrega({ aceiteFecha: '2026-11-10', aceiteKm: 85010, aceiteProximaFecha: '2027-11-10' }, ot, '2026-11-11')).toBeNull();
    expect(aceiteTrasEntrega({ aceiteFecha: '2026-11-09', aceiteProximaFecha: '2027-11-09' }, ot, '2026-11-11')).toBeNull();
    expect(aceiteTrasEntrega({ aceiteFecha: '2026-11-11', aceiteKm: 86000 }, ot, '2026-11-11')).toBeNull();
  });
  it('un cambio anterior a la visita sí se sustituye', () => {
    expect(aceiteTrasEntrega({ aceiteFecha: '2026-11-08', aceiteProximaFecha: '2027-11-08' }, ot, '2026-11-11')).not.toBeNull();
  });
});

describe('fechaMasMeses / hoyLocal', () => {
  it('suma meses cruzando de año', () => {
    expect(fechaMasMeses(new Date(2026, 10, 11), 6)).toBe('2027-05-11');
    expect(fechaMasMeses(new Date(2026, 10, 11), 12)).toBe('2027-11-11');
  });
  it('no se pasa de mes', () => {
    expect(fechaMasMeses(new Date(2026, 0, 31), 1)).toBe('2026-02-28');
    expect(fechaMasMeses(new Date(2028, 1, 29), 12)).toBe('2029-02-28');
  });
  it('hoyLocal da la fecha del aparato', () => {
    expect(hoyLocal(new Date(2026, 10, 5, 23, 59))).toBe('2026-11-05');
  });
});
