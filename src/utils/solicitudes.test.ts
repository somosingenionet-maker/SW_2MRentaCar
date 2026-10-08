import { describe, expect, it } from 'vitest';
import type { Reserva, SolicitudReserva, Vehiculo } from '../types';
import {
  canceladaEnWeb, diasAlquiler, estadoWebMeta, incluyeCobertura, reservasSolapadas, soloFecha, soloHora, vehiculosCompatibles,
} from './solicitudes';

const veh = (id: string, marca: string, modelo: string, flota = true) => ({ id, marca, modelo, esFlotaAlquiler: flota }) as unknown as Vehiculo;
const sol = (vehiculoNombre: string, extra: Partial<SolicitudReserva> = {}) => ({ vehiculoNombre, extras: [], estadoExterno: 'on-hold', ...extra }) as unknown as SolicitudReserva;
const res = (vehiculoId: string, ini: string, fin: string, estado: Reserva['estado'] = 'confirmada') => ({ vehiculoId, fechaInicio: ini, fechaFin: fin, estado }) as unknown as Reserva;

describe('diasAlquiler', () => {
  it('cuenta los días entre fechas', () => expect(diasAlquiler('2026-09-11', '2026-09-13')).toBe(2));
  it('un alquiler de un solo día cuenta como 1', () => expect(diasAlquiler('2026-09-11', '2026-09-11')).toBe(1));
  it('cruza el cambio de mes y de año', () => {
    expect(diasAlquiler('2026-12-30', '2027-01-02')).toBe(3);
    expect(diasAlquiler('2026-02-27', '2026-03-02')).toBe(3);
  });
  it('sin fechas devuelve 1', () => expect(diasAlquiler('', '')).toBe(1));
});

describe('reservasSolapadas', () => {
  const reservas = [res('1', '2026-10-10', '2026-10-15'), res('2', '2026-10-10', '2026-10-15', 'cancelada')];
  it('detecta el solape parcial y el de un solo día de borde', () => {
    expect(reservasSolapadas(reservas, '1', '2026-10-13', '2026-10-20')).toHaveLength(1);
    expect(reservasSolapadas(reservas, '1', '2026-10-15', '2026-10-18')).toHaveLength(1);
    expect(reservasSolapadas(reservas, '1', '2026-10-05', '2026-10-10')).toHaveLength(1);
  });
  it('no hay solape si el rango queda fuera', () => {
    expect(reservasSolapadas(reservas, '1', '2026-10-16', '2026-10-20')).toHaveLength(0);
    expect(reservasSolapadas(reservas, '1', '2026-10-01', '2026-10-09')).toHaveLength(0);
  });
  it('ignora las reservas anuladas y las de otros coches', () => {
    expect(reservasSolapadas(reservas, '2', '2026-10-12', '2026-10-13')).toHaveLength(0);
    expect(reservasSolapadas(reservas, '3', '2026-10-12', '2026-10-13')).toHaveLength(0);
  });
});

describe('vehiculosCompatibles', () => {
  const flota = [veh('1', 'Renault', 'Clio'), veh('2', 'Renault', 'Clio'), veh('3', 'Renault', 'Megane'), veh('4', 'Fiat', 'Doblo'), veh('5', 'Renault', 'Clio', false)];
  const ids = (n: string) => vehiculosCompatibles(sol(n), flota).map(v => v.id);
  it('empareja por marca y modelo ignorando "o similar"', () => expect(ids('Renault Clio o similar')).toEqual(['1', '2']));
  it('ignora mayúsculas, acentos y paréntesis', () => {
    expect(ids('RENAULT CLIO O SIMILAR')).toEqual(['1', '2']);
    expect(ids('Fiat Doblo o similar (Automático)')).toEqual(['4']);
  });
  it('no sugiere coches que no son de alquiler ni modelos distintos', () => {
    expect(ids('Renault Clio o similar')).not.toContain('5');
    expect(ids('Ford S-MAX o similar')).toEqual([]);
  });
  it('un nombre vacío no empareja nada', () => expect(ids('')).toEqual([]));
});

describe('estado de la solicitud web', () => {
  it('detecta cancelados, reembolsados y fallidos', () => {
    for (const e of ['cancelled', 'refunded', 'failed']) expect(canceladaEnWeb(sol('x', { estadoExterno: e }))).toBe(true);
    for (const e of ['on-hold', 'processing', 'completed', 'pending']) expect(canceladaEnWeb(sol('x', { estadoExterno: e }))).toBe(false);
  });
  it('etiqueta cada estado', () => {
    expect(estadoWebMeta(sol('x', { estadoExterno: 'processing' })).label).toBe('Pagada');
    expect(estadoWebMeta(sol('x', { estadoExterno: 'on-hold' })).label).toBe('Pago al recoger');
    expect(estadoWebMeta(sol('x', { estadoExterno: 'raro' })).label).toBe('raro');
  });
  it('reconoce coberturas y seguros entre los extras', () => {
    expect(incluyeCobertura([{ nombre: 'Cobertura Plus Relax - 15€/día', cantidad: 1, total: 45 }])).toBe(true);
    expect(incluyeCobertura([{ nombre: 'Sillita infantil - 8€/día', cantidad: 1, total: 32 }])).toBe(false);
    expect(incluyeCobertura([])).toBe(false);
  });
  it('separa fecha y hora', () => {
    expect(soloFecha('2026-09-13T14:30')).toBe('2026-09-13');
    expect(soloHora('2026-09-13T14:30')).toBe('14:30');
    expect(soloFecha(null)).toBe('');
    expect(soloHora(undefined)).toBe('');
  });
});
