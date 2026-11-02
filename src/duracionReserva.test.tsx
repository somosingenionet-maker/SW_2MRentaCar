import { describe, it, expect } from 'vitest';
import { renderToString } from 'react-dom/server';
import { FilaDuracion, FilaCalculo } from './components/DuracionReserva';
import type { Reserva } from './types';

const reserva = (extra: Partial<Reserva> = {}) => ({
  fechaInicio: '2027-01-01', fechaFin: '2027-01-04', horaInicio: '12:00', horaFin: '19:00',
  tarifaDiaria: 30, seguroDia: 15, incluyeSeguroTodoRiesgo: true, totalCobrado: 180, origen: 'manual', ...extra,
}) as Reserva;
const texto = (h: string) => h.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').replace(/ ([,.])/g, '$1');

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

describe('cálculo del total en la ficha', () => {
  it('reserva manual que cuadra: enseña días facturados y días × precio = total', () => {
    const t = texto(renderToString(<FilaCalculo reserva={reserva()} />));
    expect(t).toContain('Días facturados: 4 días');
    expect(t).toContain('4 × 45.00 € = 180.00 €');
    expect(t).not.toContain('Ojo');
  });

  it('el caso de Alejandro: 135 € con 4 días no cuadra y lo avisa con el importe correcto', () => {
    const h = renderToString(<FilaCalculo reserva={reserva({ totalCobrado: 135 })} />);
    expect(h).toContain('total-no-cuadra');
    expect(texto(h)).toContain('Ojo: con 4 días × 45.00 € el total sería 180.00 €, y aquí figura 135.00 €.');
  });

  it('sin seguro, el precio por día es solo la tarifa', () => {
    expect(texto(renderToString(<FilaCalculo reserva={reserva({ incluyeSeguroTodoRiesgo: false, totalCobrado: 120 })} />))).toContain('4 × 30.00 € = 120.00 €');
  });

  it('una reserva de la web no se comprueba: su precio lo pone la web', () => {
    const h = renderToString(<FilaCalculo reserva={reserva({ origen: 'web', totalCobrado: 77 })} />);
    expect(texto(h)).toContain('Días facturados: 4 días');
    expect(h).not.toContain('total-no-cuadra');
    expect(texto(h)).not.toContain('×');
  });

  it('con seguro pero sin su precio guardado (reservas antiguas) no se puede comprobar, así que no avisa', () => {
    expect(renderToString(<FilaCalculo reserva={reserva({ seguroDia: undefined, totalCobrado: 77 })} />)).not.toContain('total-no-cuadra');
  });
});
