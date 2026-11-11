import { describe, it, expect } from 'vitest';
import { alertasUrgentes, alertasVisibles, diasHasta, estadoAlerta, ordenarAlertas, resumenAlertas, textoPlazo } from './alertasEstado';
import type { Alerta } from '../types';

const HOY = '2026-11-12';
const al = (id: string, fechaLimite: string | undefined, estado: Alerta['estado'] = 'activa', tipo: string = 'itv'): Alerta =>
  ({ id, vehiculoId: 'v', tipo: tipo as Alerta['tipo'], descripcion: '', estado, fechaLimite });

describe('estado de las alertas', () => {
  it('diasHasta cuenta días de calendario', () => {
    expect(diasHasta('2026-11-12', HOY)).toBe(0);
    expect(diasHasta('2026-11-13', HOY)).toBe(1);
    expect(diasHasta('2026-11-01', HOY)).toBe(-11);
    expect(diasHasta(undefined, HOY)).toBeNull();
    expect(diasHasta('basura', HOY)).toBeNull();
  });
  it('clasifica en vencida, vence pronto, programada y atendida', () => {
    expect(estadoAlerta(al('a', '2026-11-11'), HOY)).toBe('vencida');
    expect(estadoAlerta(al('a', '2026-11-12'), HOY)).toBe('pronto');
    expect(estadoAlerta(al('a', '2026-11-26'), HOY)).toBe('pronto');
    expect(estadoAlerta(al('a', '2026-11-27'), HOY)).toBe('programada');
    expect(estadoAlerta(al('a', undefined), HOY)).toBe('programada');
    expect(estadoAlerta(al('a', '2020-01-01', 'atendida'), HOY)).toBe('atendida');
  });
  it('las alertas antiguas de mantenimiento no se cuentan ni se enseñan', () => {
    const lista = [al('1', '2026-11-01'), al('2', undefined, 'activa', 'mantenimiento'), al('3', '2027-05-01', 'activa', 'aceite')];
    expect(alertasVisibles(lista).map(a => a.id)).toEqual(['1', '3']);
    expect(resumenAlertas(lista, HOY)).toEqual({ vencidas: 1, pronto: 0, programadas: 1, atendidas: 0 });
  });
  it('el número urgente son vencidas más las que vencen pronto', () => {
    const lista = [al('1', '2026-11-01'), al('2', '2026-11-20'), al('3', '2027-02-01'), al('4', '2026-11-20', 'atendida')];
    expect(alertasUrgentes(lista, HOY)).toBe(2);
    expect(resumenAlertas(lista, HOY)).toEqual({ vencidas: 1, pronto: 1, programadas: 1, atendidas: 1 });
  });
  it('ordena por urgencia y deja las atendidas al final', () => {
    const lista = [al('lejana', '2027-02-01'), al('atendida', '2026-01-01', 'atendida'), al('vencida', '2026-10-01'), al('pronto', '2026-11-15')];
    expect(ordenarAlertas(lista, HOY).map(a => a.id)).toEqual(['vencida', 'pronto', 'lejana', 'atendida']);
  });
  it('textos de plazo', () => {
    expect(textoPlazo(al('a', '2026-11-11'), HOY)).toBe('Vencida hace 1 día');
    expect(textoPlazo(al('a', '2026-11-02'), HOY)).toBe('Vencida hace 10 días');
    expect(textoPlazo(al('a', '2026-11-12'), HOY)).toBe('Vence hoy');
    expect(textoPlazo(al('a', '2026-11-13'), HOY)).toBe('Vence mañana');
    expect(textoPlazo(al('a', '2026-11-21'), HOY)).toBe('Vence en 9 días');
    expect(textoPlazo(al('a', '2027-01-01'), HOY)).toBe('Programada · en 50 días');
    expect(textoPlazo(al('a', '2026-01-01', 'atendida'), HOY)).toBe('Atendida');
  });
});
