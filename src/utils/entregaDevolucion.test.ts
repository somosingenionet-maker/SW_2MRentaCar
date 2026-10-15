import { describe, it, expect } from 'vitest';
import { kmRecorridos, combustibleFaltante, finEfectivo, estadoReserva, esHistorica } from './entregaDevolucion';
import type { Reserva, MovimientoVehiculo } from '../types';

const mov = (km: number, combustible: MovimientoVehiculo['combustible'] = 'lleno', fechaHora = '2026-10-10T10:00:00.000Z'): MovimientoVehiculo =>
  ({ fechaHora, km, combustible, danos: '', responsable: 'x' });
const res = (p: Partial<Reserva> = {}): Reserva => ({
  id: 'r', vehiculoId: 'v', clienteId: 'c', fechaInicio: '2026-10-10', fechaFin: '2026-10-15', temporada: 'media',
  tarifaDiaria: 45, totalCobrado: 225, estado: 'confirmada', incluyeSeguroTodoRiesgo: false, ...p,
}) as Reserva;
const HOY = '2026-10-12';

describe('kmRecorridos y combustibleFaltante', () => {
  it('km hechos entre entrega y devolución; null si falta uno', () => {
    expect(kmRecorridos(mov(1000), mov(1450))).toBe(450);
    expect(kmRecorridos(mov(1000), null)).toBeNull();
  });
  it('cuartos de depósito que faltan, nunca negativo', () => {
    expect(combustibleFaltante(mov(0, 'lleno'), mov(0, 'medio'))).toBe(2);
    expect(combustibleFaltante(mov(0, 'medio'), mov(0, 'lleno'))).toBe(0);
    expect(combustibleFaltante(mov(0, 'lleno'), mov(0, 'lleno'))).toBe(0);
  });
});

describe('estadoReserva', () => {
  it('sin registros se interpreta por fechas, como antes', () => {
    expect(estadoReserva(res({ fechaInicio: '2026-10-20', fechaFin: '2026-10-25' }), HOY)).toBe('proxima');
    expect(estadoReserva(res({ fechaInicio: '2026-10-10', fechaFin: '2026-10-15' }), HOY)).toBe('por_entregar');
    expect(estadoReserva(res({ fechaInicio: '2026-10-01', fechaFin: '2026-10-05' }), HOY)).toBe('finalizada');
  });
  it('entregada: en curso, o retrasada si pasó la fecha de fin', () => {
    expect(estadoReserva(res({ entrega: mov(1000) }), HOY)).toBe('en_curso');
    expect(estadoReserva(res({ fechaFin: '2026-10-11', entrega: mov(1000) }), HOY)).toBe('retrasada');
  });
  it('devuelta: finalizada, aunque aún no llegara la fecha de fin', () => {
    expect(estadoReserva(res({ entrega: mov(1000), devolucion: mov(1200) }), HOY)).toBe('finalizada');
  });
  it('anulada manda sobre todo', () => {
    expect(estadoReserva(res({ estado: 'cancelada', entrega: mov(1000) }), HOY)).toBe('anulada');
  });
});

describe('esHistorica', () => {
  it('una retrasada sigue activa (el coche no ha vuelto) y una devuelta va al historial', () => {
    expect(esHistorica(res({ fechaFin: '2026-10-11', entrega: mov(1000) }), HOY)).toBe(false);
    expect(esHistorica(res({ entrega: mov(1000), devolucion: mov(1200) }), HOY)).toBe(true);
  });
});

describe('finEfectivo', () => {
  it('devuelta antes de tiempo libera el coche ese día', () => {
    expect(finEfectivo(res({ entrega: mov(1), devolucion: mov(2, 'lleno', '2026-10-12T09:00:00.000Z') }), HOY)).toBe('2026-10-12');
  });
  it('sin devolver y pasada la fecha, ocupa hasta hoy', () => {
    expect(finEfectivo(res({ fechaFin: '2026-10-11', entrega: mov(1) }), HOY)).toBe(HOY);
  });
  it('en el resto, la fecha prevista', () => {
    expect(finEfectivo(res(), HOY)).toBe('2026-10-15');
  });
});
