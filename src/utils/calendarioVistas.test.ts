import { describe, it, expect } from 'vitest';
import { inicioSemana, diasSemana, rangoVisible, moverAncla, anclaAlCambiarVista, etiquetaRango, movimientoDelDia, ordenarDelDia } from './calendarioVistas';

describe('vistas del calendario de reservas', () => {
  it('la semana va de lunes a domingo', () => {
    // 3 nov 2026 es martes
    expect(inicioSemana('2026-11-03')).toBe('2026-11-02');
    expect(inicioSemana('2026-11-02')).toBe('2026-11-02');
    expect(inicioSemana('2026-11-08')).toBe('2026-11-02');
    expect(diasSemana('2026-11-03')).toEqual(['2026-11-02', '2026-11-03', '2026-11-04', '2026-11-05', '2026-11-06', '2026-11-07', '2026-11-08']);
  });

  it('la semana cruza meses y años sin perder días', () => {
    expect(diasSemana('2026-12-31')[0]).toBe('2026-12-28');
    expect(diasSemana('2026-12-31')[6]).toBe('2027-01-03');
    expect(diasSemana('2026-10-30')).toContain('2026-11-01');
  });

  it('rango visible por vista', () => {
    expect(rangoVisible('2026-02-14', 'mes')).toEqual({ ini: '2026-02-01', fin: '2026-02-28' });
    expect(rangoVisible('2028-02-14', 'mes')).toEqual({ ini: '2028-02-01', fin: '2028-02-29' });
    expect(rangoVisible('2026-11-03', 'semana')).toEqual({ ini: '2026-11-02', fin: '2026-11-08' });
    expect(rangoVisible('2026-11-03', 'dia')).toEqual({ ini: '2026-11-03', fin: '2026-11-03' });
  });

  it('anterior y siguiente mueven un mes, una semana o un día', () => {
    expect(moverAncla('2026-11-03', 'mes', 1)).toBe('2026-12-01');
    expect(moverAncla('2026-01-15', 'mes', -1)).toBe('2025-12-01');
    expect(moverAncla('2026-11-03', 'semana', 1)).toBe('2026-11-10');
    expect(moverAncla('2026-11-03', 'semana', -1)).toBe('2026-10-27');
    expect(moverAncla('2026-11-30', 'dia', 1)).toBe('2026-12-01');
    expect(moverAncla('2027-01-01', 'dia', -1)).toBe('2026-12-31');
  });

  it('al cambiar de vista parte de hoy si está a la vista, y si no del principio', () => {
    expect(anclaAlCambiarVista('2026-11-01', 'mes', '2026-11-03')).toBe('2026-11-03');
    expect(anclaAlCambiarVista('2026-12-01', 'mes', '2026-11-03')).toBe('2026-12-01');
    expect(anclaAlCambiarVista('2026-11-03', 'semana', '2026-11-05')).toBe('2026-11-05');
    expect(anclaAlCambiarVista('2026-11-10', 'semana', '2026-11-05')).toBe('2026-11-09');
  });

  it('títulos de la barra', () => {
    expect(etiquetaRango('2026-11-03', 'mes')).toBe('Noviembre 2026');
    expect(etiquetaRango('2026-11-03', 'dia')).toBe('martes 3 de noviembre de 2026');
    expect(etiquetaRango('2026-11-03', 'semana')).toBe('2 – 8 nov 2026');
    expect(etiquetaRango('2026-10-29', 'semana')).toBe('26 oct – 1 nov 2026');
    expect(etiquetaRango('2026-12-31', 'semana')).toBe('28 dic 2026 – 3 ene 2027');
  });

  it('qué toca cada día con una reserva y cómo se ordena el día', () => {
    const a = { fechaInicio: '2026-11-03', fechaFin: '2026-11-05', horaInicio: '16:00', horaFin: '10:00' };
    const b = { fechaInicio: '2026-11-01', fechaFin: '2026-11-03', horaInicio: '09:00', horaFin: '11:00' };
    const c = { fechaInicio: '2026-11-01', fechaFin: '2026-11-09', horaInicio: '09:00', horaFin: '09:00' };
    const d = { fechaInicio: '2026-11-03', fechaFin: '2026-11-03', horaInicio: '08:00', horaFin: '20:00' };
    expect(movimientoDelDia(a, '2026-11-03')).toBe('entrega');
    expect(movimientoDelDia(a, '2026-11-04')).toBe('en_curso');
    expect(movimientoDelDia(a, '2026-11-05')).toBe('devolucion');
    expect(movimientoDelDia(d, '2026-11-03')).toBe('entrega_y_devolucion');
    expect(ordenarDelDia([c, b, a, d], '2026-11-03')).toEqual([d, a, b, c]);
  });
});
