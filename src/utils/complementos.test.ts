import { describe, it, expect } from 'vitest';
import { esCobertura, nombreComplemento, totalComplemento, totalExtras, extrasDePedidoWeb, extrasManuales, etiquetaPrecioComplemento, resumenExtras, recalcularExtras } from './complementos';
import { totalDeReserva, totalTrasCambioDeHoras } from './condicionesAlquiler';
import type { Complemento, Reserva } from '../types';

const catalogo: Complemento[] = [
  { id: 'sillita', nombre: 'Sillita infantil', precio: 8, porDia: true, activo: true, orden: 3 },
  { id: 'baca', nombre: 'Baca coche', precio: 50, porDia: false, activo: true, orden: 5 },
  { id: 'porta', nombre: 'Portabicicletas', precio: 40, porDia: false, activo: true, orden: 6 },
];

describe('totalComplemento: por día o precio fijo', () => {
  it('por día: cantidad × precio × días', () => {
    expect(totalComplemento(catalogo[0], 1, 4)).toBe(32);
    expect(totalComplemento(catalogo[0], 2, 4)).toBe(64);
  });
  it('precio fijo (baca 50 €, portabicicletas 40 €): no depende de los días', () => {
    expect(totalComplemento(catalogo[1], 1, 1)).toBe(50);
    expect(totalComplemento(catalogo[1], 1, 12)).toBe(50);
    expect(totalComplemento(catalogo[2], 1, 30)).toBe(40);
    expect(totalComplemento(catalogo[2], 2, 5)).toBe(80);
  });
});

describe('extras de un pedido de la web', () => {
  it('conserva lo que cobró la web (ya con descuentos) y deja fuera las coberturas', () => {
    const r = extrasDePedidoWeb([
      { nombre: 'Cobertura Plus Relax - 15€/día', cantidad: 1, total: 42.5 },
      { nombre: 'Sillita infantil - 8€/día', cantidad: 1, total: 21.5 },
      { nombre: 'Portabicicletas', cantidad: 1, total: 37.5 },
      { nombre: 'Cobertura Básica - 500€', cantidad: 1, total: 0 },
    ]);
    expect(r).toEqual([
      { nombre: 'Sillita infantil - 8€/día', cantidad: 1, total: 21.5 },
      { nombre: 'Portabicicletas', cantidad: 1, total: 37.5 },
    ]);
  });
  it('sin extras o con cantidad rara no falla', () => {
    expect(extrasDePedidoWeb(undefined)).toEqual([]);
    expect(extrasDePedidoWeb([{ nombre: 'Baca Coche', cantidad: 0, total: 50 }])[0].cantidad).toBe(1);
  });
  it('esCobertura distingue coberturas de complementos', () => {
    for (const n of ['Cobertura Básica - 500€', 'Cobertura Plus Relax - 15€/día', 'Cobertura para Furgoneta - 600€', 'Seguro todo riesgo']) expect(esCobertura(n), n).toBe(true);
    for (const n of ['Sillita infantil - 8€/día', 'Baca Coche', 'Portabicicletas', 'Maxi-Cosi - 8€/día', 'Asiento elevador de respaldo alto - 8€/día']) expect(esCobertura(n), n).toBe(false);
  });
});

describe('extras de una reserva manual', () => {
  it('solo los elegidos, con su precio y su importe a los días indicados', () => {
    const r = extrasManuales(catalogo, { sillita: 2, baca: 1, porta: 0 }, 4);
    expect(r).toEqual([
      { nombre: 'Sillita infantil', cantidad: 2, precio: 8, porDia: true, total: 64 },
      { nombre: 'Baca coche', cantidad: 1, precio: 50, porDia: false, total: 50 },
    ]);
    expect(extrasManuales(catalogo, {}, 4)).toEqual([]);
  });

  it('totalExtras recalcula los manuales con los días nuevos y deja los de la web como estaban', () => {
    const manuales = extrasManuales(catalogo, { sillita: 1, baca: 1 }, 3);
    expect(totalExtras(manuales, 3)).toBe(74);
    expect(totalExtras(manuales, 5)).toBe(90); // sillita 8×5 + baca 50 fija
    expect(totalExtras([{ nombre: 'Sillita infantil - 8€/día', cantidad: 1, total: 21.5 }], 9)).toBe(21.5);
    expect(totalExtras(undefined, 4)).toBe(0);
  });
});

describe('textos', () => {
  it('quita el precio que la web pone en el nombre, pero no una franquicia', () => {
    expect(nombreComplemento('Sillita infantil - 8€/día')).toBe('Sillita infantil');
    expect(nombreComplemento('Asiento elevador de respaldo alto - 8€/día')).toBe('Asiento elevador de respaldo alto');
    expect(nombreComplemento('Portabicicletas')).toBe('Portabicicletas');
    expect(nombreComplemento('Cobertura Básica - 500€')).toBe('Cobertura Básica - 500€');
  });
  it('etiqueta del precio y resumen', () => {
    expect(etiquetaPrecioComplemento(catalogo[0])).toBe('8.00 € / día');
    expect(etiquetaPrecioComplemento(catalogo[1])).toBe('50.00 € (precio fijo)');
    expect(resumenExtras([{ nombre: 'Sillita infantil - 8€/día', cantidad: 2, total: 40 }, { nombre: 'Baca Coche', cantidad: 1, total: 50 }])).toBe('Sillita infantil × 2, Baca Coche');
    expect(resumenExtras(undefined)).toBe('');
  });
});

const reserva = (extra: Partial<Reserva> = {}) => ({
  fechaInicio: '2027-01-01', fechaFin: '2027-01-04', horaInicio: '12:00', horaFin: '12:00',
  tarifaDiaria: 30, seguroDia: 15, incluyeSeguroTodoRiesgo: true, origen: 'manual',
  extras: extrasManuales(catalogo, { sillita: 1, baca: 1 }, 3), totalCobrado: 3 * 45 + 24 + 50, ...extra,
}) as Reserva;

describe('el total de la reserva incluye los complementos', () => {
  it('3 días × (30 + 15) + sillita 8×3 + baca 50 = 209 €', () => {
    expect(totalDeReserva(reserva(), 3)).toBe(209);
    expect(reserva().totalCobrado).toBe(209);
  });

  it('al cambiar las horas a 4 días, los complementos por día suben y los fijos no: 180 + 32 + 50 = 262 €', () => {
    const t = totalTrasCambioDeHoras(reserva(), '12:00', '19:00');
    expect(t).toMatchObject({ diasAntes: 3, diasDespues: 4, total: 262, recalculado: true });
    // y las líneas de los complementos se ponen al día con el total: la sillita pasa de 24 a 32 €, la baca sigue en 50 €
    expect(t.extras?.map(e => e.total)).toEqual([32, 50]);
    expect(t.extras?.reduce((a, e) => a + e.total, 0)).toBe(82);
  });

  it('en una reserva de la web nunca se recalcula ni se tocan sus complementos', () => {
    const web = reserva({ origen: 'web', extras: [{ nombre: 'Sillita infantil - 8€/día', cantidad: 1, total: 21.5 }], totalCobrado: 209 });
    const t = totalTrasCambioDeHoras(web, '12:00', '19:00');
    expect(t.recalculado).toBe(false);
    expect(t.total).toBe(209);
    expect(t.extras).toEqual([{ nombre: 'Sillita infantil - 8€/día', cantidad: 1, total: 21.5 }]);
  });

  it('recalcularExtras: los manuales por día cambian con los días, los fijos y los de la web no', () => {
    const r = recalcularExtras([
      { nombre: 'Sillita infantil', cantidad: 2, precio: 8, porDia: true, total: 64 },
      { nombre: 'Baca coche', cantidad: 1, precio: 50, porDia: false, total: 50 },
      { nombre: 'Maxi-Cosi - 8€/día', cantidad: 1, total: 64 },
    ], 3);
    expect(r.map(e => e.total)).toEqual([48, 50, 64]);
    expect(recalcularExtras(undefined, 3)).toEqual([]);
  });

  it('un total que no cuadra (precio pactado) no se pisa', () => {
    expect(totalTrasCambioDeHoras(reserva({ totalCobrado: 200 }), '12:00', '19:00').recalculado).toBe(false);
  });
});
