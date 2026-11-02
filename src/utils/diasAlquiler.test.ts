import { describe, it, expect } from 'vitest';
import { diasAlquiler, duracionExacta } from './solicitudes';
import { totalTrasCambioDeHoras, totalDeReserva } from './condicionesAlquiler';
import type { Reserva } from '../types';

describe('diasAlquiler con horas (periodos de 24 h, cada fracción cuenta como un día)', () => {
  it('el caso de Alejandro: del 1 a las 12:00 al 4 a las 19:00 son 4 días, no 3', () => {
    expect(diasAlquiler('2027-01-01', '2027-01-04', '12:00', '19:00')).toBe(4);
  });

  it('mismas horas = días exactos (la web cobra 12 días del 10 al 22 de junio a las 11:00)', () => {
    expect(diasAlquiler('2027-06-10', '2027-06-22', '11:00', '11:00')).toBe(12);
    expect(diasAlquiler('2026-10-30', '2026-11-02', '10:00', '10:00')).toBe(3);
  });

  it('devolver antes de la hora de entrega no resta un día completo si queda fracción', () => {
    // 30 oct 18:00 → 2 nov 09:00 = 2 días y 15 h = 3 días
    expect(diasAlquiler('2026-10-30', '2026-11-02', '18:00', '09:00')).toBe(3);
  });

  it('un minuto de más cuenta como un día más', () => {
    expect(diasAlquiler('2026-10-01', '2026-10-03', '10:00', '10:01')).toBe(3);
    expect(diasAlquiler('2026-10-01', '2026-10-03', '10:00', '10:00')).toBe(2);
  });

  it('el mismo día, de la mañana a la noche, es 1 día', () => {
    expect(diasAlquiler('2026-07-04', '2026-07-04', '10:00', '21:00')).toBe(1);
  });

  it('nunca baja de 1 día, ni con fechas o horas incoherentes', () => {
    expect(diasAlquiler('2026-07-04', '2026-07-04', '10:00', '10:00')).toBe(1);
    expect(diasAlquiler('2026-07-05', '2026-07-04', '10:00', '10:00')).toBe(1);
  });

  it('sin horas, o con una sola, o con una inválida, cuenta la diferencia entre fechas como antes', () => {
    expect(diasAlquiler('2026-10-31', '2026-11-02')).toBe(2);
    expect(diasAlquiler('2026-10-31', '2026-11-02', '10:00', undefined)).toBe(2);
    expect(diasAlquiler('2026-10-31', '2026-11-02', undefined, '19:00')).toBe(2);
    expect(diasAlquiler('2026-10-31', '2026-11-02', '25:00', '19:00')).toBe(2);
    expect(diasAlquiler('2026-10-31', '2026-11-02', '', '')).toBe(2);
    expect(diasAlquiler('', '2026-11-02')).toBe(1);
  });

  it('el cambio de hora de octubre/marzo no altera la cuenta (se cuenta en hora de reloj)', () => {
    expect(diasAlquiler('2026-10-24', '2026-10-27', '10:00', '10:00')).toBe(3);
    expect(diasAlquiler('2027-03-26', '2027-03-29', '10:00', '10:00')).toBe(3);
  });

  // Pedidos REALES de la web de 2M: recogida, devolución, total de vehículo y precio por día de su tarifa.
  // Los días que cobra la web son total / precio por día.
  it.each([
    ['1987', '2026-07-05', '09:00', '2026-07-12', '08:00', 350, 50, 7],
    ['1792', '2026-05-27', '01:00', '2026-05-30', '23:00', 220, 55, 4],
    ['1738', '2026-03-30', '01:00', '2026-04-11', '22:00', 715, 55, 13],
    ['2023', '2026-07-13', '00:00', '2026-07-16', '20:00', 148, 37, 4],
    ['1996', '2026-06-21', '17:00', '2026-06-24', '04:00', 165, 55, 3],
    ['2043', '2026-07-28', '20:00', '2026-07-31', '06:00', 105, 35, 3],
    ['1811', '2026-05-04', '10:00', '2026-05-06', '08:00', 40, 20, 2],
    ['1816', '2026-05-12', '19:00', '2026-05-13', '16:00', 20, 20, 1],
    ['1374', '2026-01-03', '10:00', '2026-01-04', '22:00', 44, 22, 2],
    ['2028', '2026-07-04', '10:00', '2026-07-04', '21:00', 37, 37, 1],
    ['2158', '2026-10-20', '13:00', '2026-10-28', '07:00', 200, 25, 8],
    ['2054', '2026-08-22', '09:00', '2026-08-24', '23:00', 126, 42, 3],
  ])('pedido web %s cuenta los mismos días que cobró la web', (_p, ini, hIni, fin, hFin, total, precioDia, diasWeb) => {
    expect(total / precioDia).toBe(diasWeb);
    expect(diasAlquiler(ini, fin, hIni, hFin)).toBe(diasWeb);
  });
});

describe('duracionExacta', () => {
  it('describe la parte que sobra sobre los días completos', () => {
    expect(duracionExacta('2027-01-01', '2027-01-04', '12:00', '19:00')).toBe('3 días y 7 h');
    expect(duracionExacta('2026-10-30', '2026-11-02', '18:00', '09:00')).toBe('2 días y 15 h');
    expect(duracionExacta('2026-07-04', '2026-07-04', '10:00', '21:00')).toBe('11 h');
    expect(duracionExacta('2026-10-01', '2026-10-03', '10:00', '10:30')).toBe('2 días y 30 min');
    expect(duracionExacta('2026-10-01', '2026-10-03', '10:00', '12:15')).toBe('2 días, 2 h y 15 min');
  });
  it('si los días son exactos, o no hay horas, no hay nada que explicar', () => {
    expect(duracionExacta('2026-10-30', '2026-11-02', '10:00', '10:00')).toBeNull();
    expect(duracionExacta('2026-10-30', '2026-11-02')).toBeNull();
  });
});

const reserva = (extra: Partial<Reserva> = {}) => ({
  fechaInicio: '2027-01-01', fechaFin: '2027-01-04', horaInicio: undefined, horaFin: undefined,
  tarifaDiaria: 30, seguroDia: 15, incluyeSeguroTodoRiesgo: true, totalCobrado: 135, origen: 'manual', ...extra,
}) as Reserva;

describe('totalTrasCambioDeHoras', () => {
  it('reserva manual sin horas (135 € = 3 días × 45 €): al poner 12:00 → 19:00 pasa a 4 días y 180 €', () => {
    const r = totalTrasCambioDeHoras(reserva(), '12:00', '19:00');
    expect(r).toEqual({ diasAntes: 3, diasDespues: 4, total: 180, recalculado: true, extras: [] });
  });

  it('si al cambiar las horas bajan los días (4 → 3), el total baja con ellos', () => {
    const r = totalTrasCambioDeHoras(reserva({ horaInicio: '12:00', horaFin: '19:00', totalCobrado: 180 }), '12:00', '12:00');
    expect(r).toEqual({ diasAntes: 4, diasDespues: 3, total: 135, recalculado: true, extras: [] });
  });

  it('si las horas cambian pero los días siguen siendo los mismos, no toca el total', () => {
    const r = totalTrasCambioDeHoras(reserva({ horaInicio: '12:00', horaFin: '19:00', totalCobrado: 180 }), '13:00', '20:00');
    expect(r).toEqual({ diasAntes: 4, diasDespues: 4, total: 180, recalculado: false, extras: undefined });
  });

  it('nunca recalcula una reserva de la web: el precio lo pone la web', () => {
    const r = totalTrasCambioDeHoras(reserva({ origen: 'web', totalCobrado: 135 }), '12:00', '19:00');
    expect(r).toMatchObject({ diasAntes: 3, diasDespues: 4, total: 135, recalculado: false });
  });

  it('no pisa un total que no era días × tarifa (precio pactado)', () => {
    const r = totalTrasCambioDeHoras(reserva({ totalCobrado: 120 }), '12:00', '19:00');
    expect(r).toMatchObject({ diasDespues: 4, total: 120, recalculado: false });
  });

  it('sin seguro, solo cuenta la tarifa', () => {
    const r = totalTrasCambioDeHoras(reserva({ incluyeSeguroTodoRiesgo: false, totalCobrado: 90 }), '12:00', '19:00');
    expect(r).toMatchObject({ total: 120, recalculado: true });
  });

  it('totalDeReserva usa la tarifa y el seguro de la propia reserva', () => {
    expect(totalDeReserva(reserva(), 4)).toBe(180);
  });
});
