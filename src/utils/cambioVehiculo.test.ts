import { describe, it, expect } from 'vitest';
import { puedeCambiarVehiculo, reservaQueOcupa, avisosCambioVehiculo } from './cambioVehiculo';
import type { Reserva } from '../types';

const res = (o: Partial<Reserva>): Reserva => ({
  id: 'r1', vehiculoId: 'v1', clienteId: 'c1', fechaInicio: '2027-01-10', fechaFin: '2027-01-15', temporada: 'media',
  tarifaDiaria: 45, totalCobrado: 225, estado: 'confirmada', incluyeSeguroTodoRiesgo: false, ...o,
});
const mov = { fechaHora: '2027-01-10T10:00:00Z', km: 100, combustible: 'lleno', danos: '' } as unknown as Reserva['entrega'];

describe('cambiar el coche de una reserva', () => {
  it('se puede antes de entregar; no si está anulada, entregada o devuelta', () => {
    expect(puedeCambiarVehiculo(res({}))).toEqual({ ok: true });
    expect(puedeCambiarVehiculo(res({ estado: 'cancelada' }))).toMatchObject({ ok: false });
    expect(puedeCambiarVehiculo(res({ entrega: mov }))).toMatchObject({ ok: false, motivo: expect.stringContaining('ya se entregó') });
    expect(puedeCambiarVehiculo(res({ devolucion: mov }))).toMatchObject({ ok: false, motivo: expect.stringContaining('devolvió') });
  });

  it('detecta si el coche nuevo está ocupado en esas fechas, sin contar la propia reserva ni las anuladas', () => {
    const r = res({});
    const otra = res({ id: 'r2', vehiculoId: 'v2', fechaInicio: '2027-01-14', fechaFin: '2027-01-20' });
    const anulada = res({ id: 'r3', vehiculoId: 'v3', fechaInicio: '2027-01-10', fechaFin: '2027-01-15', estado: 'cancelada' });
    const lista = [r, otra, anulada];
    expect(reservaQueOcupa(lista, r, 'v2')?.id).toBe('r2');
    expect(reservaQueOcupa(lista, r, 'v3')).toBeUndefined();
    expect(reservaQueOcupa(lista, r, 'v1')).toBeUndefined();
  });

  it('avisa de que mantiene el precio acordado si el coche nuevo cuesta otra cosa, y del seguro que no ofrece', () => {
    const nuevo = { tarifasAlquiler: { temporadaAlta: 70, temporadaMedia: 50, temporadaBaja: 30 }, seguroAmpliadoDia: null };
    const a = avisosCambioVehiculo(res({ incluyeSeguroTodoRiesgo: true }), nuevo);
    expect(a).toHaveLength(2);
    expect(a[0]).toContain('45,00 €/día');
    expect(a[0]).toContain('50,00 €/día');
    expect(a[1]).toContain('todo riesgo');
  });

  it('sin diferencias no avisa de nada', () => {
    const nuevo = { tarifasAlquiler: { temporadaAlta: 70, temporadaMedia: 45, temporadaBaja: 30 }, seguroAmpliadoDia: 15 };
    expect(avisosCambioVehiculo(res({ incluyeSeguroTodoRiesgo: true }), nuevo)).toEqual([]);
  });
});
