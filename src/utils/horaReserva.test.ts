import { describe, it, expect } from 'vitest';
import { validarHorasReserva, fechaConHora, ordenarProximas, ordenarHistorial, HORA_RE } from './horaReserva';

const base = { fechaInicio: '2026-11-02', fechaFin: '2026-11-05', horaInicio: '10:00', horaFin: '09:30' };

describe('validarHorasReserva', () => {
  it('acepta unas horas correctas', () => {
    expect(validarHorasReserva(base)).toBeNull();
  });

  it('exige las dos horas', () => {
    expect(validarHorasReserva({ ...base, horaInicio: '' })).toMatch(/entrega/);
    expect(validarHorasReserva({ ...base, horaInicio: undefined })).toMatch(/entrega/);
    expect(validarHorasReserva({ ...base, horaFin: '' })).toMatch(/devolución/);
  });

  it('rechaza horas mal escritas', () => {
    expect(validarHorasReserva({ ...base, horaInicio: '25:00' })).toMatch(/entrega/);
    expect(validarHorasReserva({ ...base, horaFin: '9:30' })).toMatch(/devolución/);
    expect(validarHorasReserva({ ...base, horaFin: '10:60' })).toMatch(/devolución/);
  });

  it('en varios días la devolución puede ser más temprano que la entrega', () => {
    expect(validarHorasReserva({ ...base, horaInicio: '18:00', horaFin: '08:00' })).toBeNull();
  });

  it('el mismo día exige devolver después de entregar', () => {
    const mismoDia = { ...base, fechaFin: '2026-11-02' };
    expect(validarHorasReserva({ ...mismoDia, horaInicio: '10:00', horaFin: '10:00' })).toMatch(/mismo día/);
    expect(validarHorasReserva({ ...mismoDia, horaInicio: '10:00', horaFin: '09:00' })).toMatch(/mismo día/);
    expect(validarHorasReserva({ ...mismoDia, horaInicio: '10:00', horaFin: '18:00' })).toBeNull();
  });

  it('acepta los extremos del día', () => {
    expect(HORA_RE.test('00:00')).toBe(true);
    expect(HORA_RE.test('23:59')).toBe(true);
  });
});

describe('fechaConHora', () => {
  const fmt = (iso: string) => iso.split('-').reverse().join('/');
  it('une fecha y hora', () => expect(fechaConHora('2026-10-26', '10:00', fmt)).toBe('26/10/2026 · 10:00'));
  it('sin hora deja solo la fecha', () => {
    expect(fechaConHora('2026-10-26', undefined, fmt)).toBe('26/10/2026');
    expect(fechaConHora('2026-10-26', '', fmt)).toBe('26/10/2026');
  });
});

describe('orden de las reservas', () => {
  const r = (id: string, fechaInicio: string, horaInicio?: string) => ({ id, fechaInicio, horaInicio });
  const ids = (xs: { id: string }[]) => xs.map(x => x.id).join(',');
  const lista = [r('lejana', '2027-06-10', '11:00'), r('hoy', '2026-10-29', '09:00'), r('manana', '2026-10-30', '10:00'), r('enero', '2027-01-05', '08:00')];

  it('las activas y próximas van de la más cercana a la más lejana', () => {
    expect(ids(ordenarProximas(lista))).toBe('hoy,manana,enero,lejana');
  });

  it('el mismo día se ordena por la hora de entrega', () => {
    const mismoDia = [r('tarde', '2026-11-02', '17:30'), r('manana', '2026-11-02', '08:00'), r('medio', '2026-11-02', '12:15')];
    expect(ids(ordenarProximas(mismoDia))).toBe('manana,medio,tarde');
  });

  it('una reserva sin hora (anterior a ese campo) cuenta como el inicio del día', () => {
    expect(ids(ordenarProximas([r('con', '2026-11-02', '09:00'), r('sin', '2026-11-02')]))).toBe('sin,con');
  });

  it('el historial va con lo más reciente primero', () => {
    expect(ids(ordenarHistorial(lista))).toBe('lejana,enero,manana,hoy');
  });

  it('no modifica la lista original', () => {
    const copia = [...lista];
    ordenarProximas(lista); ordenarHistorial(lista);
    expect(lista).toEqual(copia);
  });
});
