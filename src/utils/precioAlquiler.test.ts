import { describe, it, expect } from 'vitest';
import { totalAlquiler, totalDeReserva, totalTrasCambioDeHoras, tarifaDeReferencia } from './condicionesAlquiler';
import { aplicarPrecio, importePositivo, importeAlquiler } from './precioAlquiler';
import { desgloseReserva, hayAjusteImportante } from './desgloseReserva';
import { crearSnapshot, cambiosTrasFirma } from './firmaContrato';
import type { Reserva } from '../types';

const reserva = (o: Partial<Reserva> = {}): Reserva => ({
  id: 'r1', vehiculoId: 'v1', clienteId: 'c1', fechaInicio: '2027-01-10', fechaFin: '2027-01-13', horaInicio: '12:00', horaFin: '12:00',
  temporada: 'media', tarifaDiaria: 33.33, precioFijo: 100, totalCobrado: 100, estado: 'confirmada', incluyeSeguroTodoRiesgo: false, origen: 'manual', ...o,
});

describe('alquiler a precio cerrado', () => {
  it('el alquiler cuesta el precio cerrado, no días × tarifa (sin el céntimo que se pierde)', () => {
    expect(totalAlquiler(3, 33.33, null, false)).toBe(99.99);
    expect(totalAlquiler(3, 33.33, null, false, 100)).toBe(100);
    expect(tarifaDeReferencia(100, 3)).toBe(33.33);
    expect(tarifaDeReferencia(100, 0)).toBe(100);
  });

  it('el seguro por día y los complementos se suman aparte del precio cerrado', () => {
    const r = reserva({ incluyeSeguroTodoRiesgo: true, seguroDia: 15, extras: [{ nombre: 'Baca coche', cantidad: 1, total: 50, precio: 50, porDia: false }] });
    expect(totalDeReserva(r, 3)).toBe(100 + 45 + 50);
    expect(totalDeReserva({ ...r, precioFijo: null }, 3)).toBe(99.99 + 45 + 50);
  });

  it('el desglose lo enseña como una línea de precio pactado y suma exacto, sin ajuste', () => {
    const d = desgloseReserva(reserva(), 3);
    expect(d.lineas[0]).toEqual({ tipo: 'alquiler-fijo', dias: 3, importe: 100 });
    expect(d.lineas.some(l => l.tipo === 'ajuste')).toBe(false);
    expect(hayAjusteImportante(d.lineas)).toBe(false);
  });

  it('al cambiar las horas el precio cerrado no cambia: solo el seguro y los complementos por día', () => {
    const r = reserva({ incluyeSeguroTodoRiesgo: true, seguroDia: 15, totalCobrado: 145 });
    const t = totalTrasCambioDeHoras(r, '12:00', '18:00');
    expect(t.diasAntes).toBe(3);
    expect(t.diasDespues).toBe(4);
    expect(t.recalculado).toBe(true);
    expect(t.total).toBe(100 + 60);
  });

  it('aplicarPrecio: precio cerrado, tarifa por día, importes con coma y errores', () => {
    const base = { incluyeSeguroTodoRiesgo: true, seguroDia: 10, extras: [], descuento: 0 };
    expect(aplicarPrecio(base, 'fijo', '250,50', 5)).toEqual({ ok: true, tarifaDiaria: 50.1, precioFijo: 250.5, totalCobrado: 300.5 });
    expect(aplicarPrecio(base, 'dia', '40', 5)).toEqual({ ok: true, tarifaDiaria: 40, precioFijo: null, totalCobrado: 250 });
    expect(aplicarPrecio(base, 'fijo', '', 5)).toMatchObject({ ok: false, error: expect.stringContaining('precio cerrado') });
    expect(aplicarPrecio(base, 'dia', '0', 5)).toMatchObject({ ok: false, error: expect.stringContaining('tarifa') });
    expect(aplicarPrecio(base, 'fijo', 'abc', 5)).toMatchObject({ ok: false });
  });

  it('importePositivo e importeAlquiler', () => {
    expect(importePositivo('12,5')).toBe(12.5);
    expect(importePositivo('0')).toBeNull();
    expect(importePositivo('')).toBeNull();
    expect(importeAlquiler(reserva(), 3)).toBe(100);
    expect(importeAlquiler(reserva({ precioFijo: null, tarifaDiaria: 40 }), 3)).toBe(120);
  });

  it('compatibilidad: una reserva sin precio cerrado (null en la base de datos) no cambia nada de lo ya firmado ni de sus cuentas', () => {
    const empresa = { nombre: 'X' } as never;
    const antiguo = reserva({ precioFijo: undefined, tarifaDiaria: 40, totalCobrado: 120 });
    const firmado = crearSnapshot(antiguo, undefined, undefined, undefined, empresa);
    expect(JSON.stringify(firmado)).not.toContain('precioFijo');
    expect(cambiosTrasFirma(firmado, { ...antiguo, precioFijo: null })).toEqual([]);
    expect(totalDeReserva({ ...antiguo, precioFijo: null }, 3)).toBe(120);
    expect(desgloseReserva({ ...antiguo, precioFijo: null }, 3).lineas[0]).toMatchObject({ tipo: 'alquiler', dias: 3, precio: 40, importe: 120 });
  });

  it('la copia firmada guarda el precio cerrado solo si lo hay, y un cambio de precio invalida lo firmado', () => {
    const empresa = { nombre: 'X' } as never;
    const con = crearSnapshot(reserva(), undefined, undefined, undefined, empresa);
    expect(con.reserva.precioFijo).toBe(100);
    const sin = crearSnapshot(reserva({ precioFijo: null, tarifaDiaria: 40, totalCobrado: 120 }), undefined, undefined, undefined, empresa);
    expect('precioFijo' in sin.reserva && sin.reserva.precioFijo !== undefined).toBe(false);
    expect(cambiosTrasFirma(con, reserva())).toEqual([]);
    expect(cambiosTrasFirma(con, reserva({ precioFijo: 90, totalCobrado: 90 }))).toContain('el importe');
    expect(cambiosTrasFirma(con, reserva({ precioFijo: null }))).toContain('el importe');
  });
});
