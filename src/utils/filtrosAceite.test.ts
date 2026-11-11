import { describe, it, expect } from 'vitest';
import { FILTROS_ACEITE, agruparFiltros, esFiltroId, filtrosSinRevisar, resumenFiltros, siguienteEstadoFiltro } from './filtrosAceite';

describe('filtros del cambio de aceite', () => {
  it('son los cuatro pedidos, en este orden', () => {
    expect(FILTROS_ACEITE.map(f => f.nombre)).toEqual(['Filtro de aire', 'Filtro de aceite', 'Filtro de diésel', 'Filtro de habitáculo']);
    expect(FILTROS_ACEITE.map(f => f.id)).toEqual(['aire', 'aceite', 'diesel', 'habitaculo']);
  });
  it('esFiltroId solo acepta los cuatro', () => {
    expect(esFiltroId('aire')).toBe(true);
    expect(esFiltroId('bateria')).toBe(false);
    expect(esFiltroId(undefined)).toBe(false);
  });
  it('pulsar el botón ya activo quita la marca; pulsar el otro la cambia', () => {
    expect(siguienteEstadoFiltro(undefined, true)).toBe(true);
    expect(siguienteEstadoFiltro(undefined, false)).toBe(false);
    expect(siguienteEstadoFiltro(true, true)).toBeNull();
    expect(siguienteEstadoFiltro(false, false)).toBeNull();
    expect(siguienteEstadoFiltro(true, false)).toBe(false);
    expect(siguienteEstadoFiltro(false, true)).toBe(true);
  });
  it('agrupa las filas por orden e ignora filtros desconocidos', () => {
    expect(agruparFiltros([
      { otId: 'a', filtro: 'aire', cambiado: true }, { otId: 'a', filtro: 'diesel', cambiado: false },
      { otId: 'b', filtro: 'aceite', cambiado: true }, { otId: 'b', filtro: 'otro', cambiado: true },
    ])).toEqual({ a: { aire: true, diesel: false }, b: { aceite: true } });
  });
  it('cuenta los filtros sin revisar (un «no se cambió» cuenta como revisado)', () => {
    expect(filtrosSinRevisar(undefined)).toBe(4);
    expect(filtrosSinRevisar({ aire: true, diesel: false })).toBe(2);
    expect(filtrosSinRevisar({ aire: true, aceite: true, diesel: false, habitaculo: true })).toBe(0);
  });
  it('el resumen da los cuatro filtros con su estado', () => {
    expect(resumenFiltros({ aire: true, diesel: false }).map(f => `${f.id}:${f.estado}`))
      .toEqual(['aire:cambiado', 'aceite:sin_revisar', 'diesel:no_cambiado', 'habitaculo:sin_revisar']);
  });
});
