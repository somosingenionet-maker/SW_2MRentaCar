import { describe, it, expect } from 'vitest';
import { renderToString } from 'react-dom/server';
import { FilaDuracion, DesgloseFicha } from './components/DuracionReserva';
import type { Reserva } from './types';

const reserva = (extra: Partial<Reserva> = {}) => ({
  fechaInicio: '2027-01-01', fechaFin: '2027-01-04', horaInicio: '12:00', horaFin: '19:00',
  tarifaDiaria: 30, seguroDia: 15, incluyeSeguroTodoRiesgo: true, totalCobrado: 180, origen: 'manual', ...extra,
}) as Reserva;
const texto = (h: string) => h.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').replace(/ ([,.)])/g, '$1').replace(/\( /g, '(');

describe('duración del alquiler en la ficha', () => {
  it('enseña los días totales de forma destacada y de dónde sale la fracción', () => {
    const t = texto(renderToString(<FilaDuracion reserva={reserva()} />));
    expect(t).toContain('Duración del alquiler: 4 días');
    expect(t).toContain('3 días y 7 h exactos');
  });

  it('con días exactos no añade explicación; con un solo día usa el singular', () => {
    const exacto = texto(renderToString(<FilaDuracion reserva={reserva({ horaFin: '12:00' })} />));
    expect(exacto).toContain('3 días');
    expect(exacto).not.toContain('exactos');
    expect(texto(renderToString(<FilaDuracion reserva={reserva({ fechaFin: '2027-01-01', horaFin: '19:00' })} />))).toContain('1 día');
  });

  it('una reserva sin horas también enseña sus días', () => {
    expect(texto(renderToString(<FilaDuracion reserva={reserva({ horaInicio: undefined, horaFin: undefined })} />))).toContain('Duración del alquiler: 3 días');
  });
});

describe('desglose económico de la ficha', () => {
  const extras = [
    { nombre: 'Sillita infantil', cantidad: 1, precio: 8, porDia: true, total: 32 },
    { nombre: 'Baca coche', cantidad: 1, precio: 50, porDia: false, total: 50 },
  ];
  const lineas = (h: string) => [...h.matchAll(/data-testid="linea-desglose"[^>]*>(.*?)<\/div>/g)].map(m => texto(m[1]).trim());

  it('reserva manual: alquiler, seguro y total (4 días × 30 € + 4 días × 15 € = 180 €)', () => {
    const h = renderToString(<DesgloseFicha reserva={reserva()} />);
    expect(lineas(h)).toEqual(['Alquiler (4 días × 30,00 €) 120,00 €', 'Seguro todo riesgo (4 días × 15,00 €) 60,00 €']);
    expect(texto(h)).toContain('LIQUIDACIÓN TOTAL 180,00 €');
    expect(h).not.toContain('total-no-cuadra');
  });

  it('con complementos: los manuales enseñan cómo se cobran; por día y precio fijo', () => {
    const l = lineas(renderToString(<DesgloseFicha reserva={reserva({ extras, totalCobrado: 262 })} />));
    expect(l).toContain('Sillita infantil (8,00 € / día) 32,00 €');
    expect(l).toContain('Baca coche (50,00 €, precio fijo) 50,00 €');
  });

  it('pedido de la web con cupón: portabicicletas a 40 € y el descuento aparte, en negativo', () => {
    const h = renderToString(<DesgloseFicha reserva={reserva({
      fechaInicio: '2026-10-29', fechaFin: '2026-11-01', horaInicio: '04:00', horaFin: '04:00', origen: 'web',
      tarifaDiaria: 40, seguroDia: 15, totalCobrado: 219, descuento: 10, cupon: '10mallorca',
      extras: [{ nombre: 'Sillita infantil - 8€/día', cantidad: 1, total: 24 }, { nombre: 'Portabicicletas', cantidad: 1, total: 40 }],
    })} />);
    expect(lineas(h)).toEqual([
      'Alquiler (3 días × 40,00 €) 120,00 €', 'Seguro todo riesgo (3 días × 15,00 €) 45,00 €',
      'Sillita infantil 24,00 €', 'Portabicicletas 40,00 €', 'Descuento (cupón 10mallorca) −10,00 €',
    ]);
    expect(texto(h)).toContain('LIQUIDACIÓN TOTAL 219,00 €');
    expect(h).not.toContain('total-no-cuadra');
  });

  it('descuento sin cupón: «Descuento»', () => {
    const l = lineas(renderToString(<DesgloseFicha reserva={reserva({ origen: 'web', descuento: 18, totalCobrado: 162 })} />));
    expect(l).toContain('Descuento −18,00 €');
  });

  it('sin seguro a todo riesgo sale la póliza de terceros, incluida', () => {
    expect(lineas(renderToString(<DesgloseFicha reserva={reserva({ incluyeSeguroTodoRiesgo: false, totalCobrado: 120 })} />))[1]).toBe('Seguro: póliza de terceros básica Incluida');
  });

  it('el caso de Alejandro: un total de 135 € con 4 días no suma, y la ficha lo avisa y enseña el ajuste', () => {
    const h = renderToString(<DesgloseFicha reserva={reserva({ totalCobrado: 135 })} />);
    expect(lineas(h)).toContain('Otros ajustes −45,00 €');
    expect(h).toContain('total-no-cuadra');
    expect(texto(h)).toContain('Ojo: los conceptos no suman el total guardado');
  });

  it('un redondeo de céntimos se ve, pero no salta la alarma', () => {
    const h = renderToString(<DesgloseFicha reserva={reserva({ totalCobrado: 180.01 })} />);
    expect(lineas(h)).toContain('Redondeo 0,01 €');
    expect(h).not.toContain('total-no-cuadra');
  });
});

describe('desglose de la ficha con precio cerrado', () => {
  it('enseña el alquiler a precio pactado y el total cuadra', () => {
    const h = renderToString(<DesgloseFicha reserva={reserva({ fechaFin: '2027-01-03', horaFin: '12:00', tarifaDiaria: 33.33, precioFijo: 100, incluyeSeguroTodoRiesgo: false, totalCobrado: 100 })} />);
    const t = texto(h);
    expect(t).toContain('Alquiler (2 días, precio pactado) 100,00 €');
    expect(t).toContain('LIQUIDACIÓN TOTAL 100,00 €');
    expect(h).not.toContain('total-no-cuadra');
  });
});
