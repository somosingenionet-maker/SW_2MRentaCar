import { describe, it, expect } from 'vitest';
import {
  progresoMecanico, ordenarParaMecanico, ordenesNuevas, haceCuanto, descripcionVehiculo, progresoOT, fichasTaller, agruparTareasHechas, mensajeAvisoMecanico, mensajeEnlaceMecanico, enlaceWhatsApp,
  type OrdenMecanico,
} from './tallerMecanico';
import type { OrdenTrabajo } from '../types';

const om = (id: string, estado: OrdenMecanico['estado'], extra: Partial<OrdenMecanico> = {}): OrdenMecanico => ({
  id, numero: `OT-${id}`, estado, recepcion: '2026-10-30', vehiculo: {}, tareas: [], piezas: [], ...extra,
});

describe('progresoMecanico', () => {
  it('cuenta tareas hechas y totales', () => {
    const o = om('a', 'recibido', { tareas: [{ id: '1', descripcion: 'x', hecha: true }, { id: '2', descripcion: 'y', hecha: false }, { id: '3', descripcion: 'z', hecha: true }] });
    expect(progresoMecanico(o)).toEqual({ hechas: 2, total: 3 });
    expect(progresoMecanico(om('b', 'recibido'))).toEqual({ hechas: 0, total: 0 });
  });
});

describe('ordenarParaMecanico', () => {
  it('primero en reparación, luego por empezar, al final listo; dentro, lo más reciente primero', () => {
    const r = ordenarParaMecanico([om('1', 'listo'), om('2', 'recibido', { recepcion: '2026-10-01' }), om('3', 'en_reparacion'), om('4', 'recibido', { recepcion: '2026-10-29' })]);
    expect(r.map(o => o.id)).toEqual(['3', '4', '2', '1']);
  });
  it('no modifica la lista original', () => {
    const l = [om('1', 'listo'), om('2', 'en_reparacion')];
    ordenarParaMecanico(l);
    expect(l.map(o => o.id)).toEqual(['1', '2']);
  });
});

describe('ordenesNuevas', () => {
  it('en la primera carga no hay nuevas (no se avisa de lo que ya tenía)', () => {
    expect(ordenesNuevas(null, [om('1', 'recibido')])).toEqual([]);
  });
  it('detecta solo las que no estaban', () => {
    expect(ordenesNuevas(new Set(['1']), [om('1', 'recibido'), om('2', 'recibido')])).toEqual(['2']);
    expect(ordenesNuevas(new Set(['1', '2']), [om('1', 'recibido')])).toEqual([]);
  });
});

describe('haceCuanto', () => {
  const ahora = new Date('2026-10-30T12:00:00Z').getTime();
  it.each([
    ['2026-10-30T11:59:40Z', 'ahora mismo'],
    ['2026-10-30T11:55:00Z', 'hace 5 min'],
    ['2026-10-30T09:00:00Z', 'hace 3 h'],
    ['2026-10-27T12:00:00Z', 'hace 3 d'],
  ])('%s → %s', (iso, esperado) => expect(haceCuanto(iso, ahora)).toBe(esperado));
  it('un valor vacío o inválido da texto vacío', () => {
    expect(haceCuanto(null, ahora)).toBe('');
    expect(haceCuanto('no es fecha', ahora)).toBe('');
  });
});

describe('descripcionVehiculo', () => {
  it('une marca, modelo, año y color según lo que haya', () => {
    expect(descripcionVehiculo({ marca: 'Peugeot', modelo: '3008', anio: 2020, color: 'blanco' })).toBe('Peugeot 3008 (2020, blanco)');
    expect(descripcionVehiculo({ marca: 'Seat', modelo: 'Ibiza' })).toBe('Seat Ibiza');
    expect(descripcionVehiculo({})).toBe('Vehículo');
  });
});

const lineas = [
  { id: 'l1', tipo: 'mano_de_obra', descripcion: 'a', cantidad: 1, precioUnitario: 1, subtotal: 1 },
  { id: 'l2', tipo: 'mano_de_obra', descripcion: 'b', cantidad: 1, precioUnitario: 1, subtotal: 1 },
  { id: 'l3', tipo: 'producto', descripcion: 'pieza', cantidad: 1, precioUnitario: 1, subtotal: 1 },
] as OrdenTrabajo['lineas'];
const ot = (id: string, estado: OrdenTrabajo['estado'], extra: Partial<OrdenTrabajo> = {}) =>
  ({ id, numero: id, estado, lineas, fechaActualizacion: '2026-10-30T10:00:00Z', ...extra }) as OrdenTrabajo;

describe('progresoOT (tablero del personal)', () => {
  it('las tareas son las líneas de mano de obra; las piezas no cuentan', () => {
    expect(progresoOT({ lineas }, new Set(['l1']))).toEqual({ hechas: 1, total: 2 });
    expect(progresoOT({ lineas }, new Set(['l3']))).toEqual({ hechas: 0, total: 2 });
    expect(progresoOT({ lineas: [] }, undefined)).toEqual({ hechas: 0, total: 0 });
  });
  it('una marca de una línea que ya no existe no cuenta', () => {
    expect(progresoOT({ lineas }, new Set(['borrada']))).toEqual({ hechas: 0, total: 2 });
  });
});

describe('fichasTaller', () => {
  const todas = [ot('p', 'presupuesto'), ot('r', 'recibido'), ot('e', 'en_reparacion'), ot('l', 'listo'), ot('x', 'entregado'), ot('c', 'cancelado')];
  it('solo incluye lo que está en el taller, lo que se trabaja primero', () => {
    expect(fichasTaller(todas, {}).map(f => f.ot.id)).toEqual(['e', 'r', 'l']);
  });
  it('lleva el avance de cada una', () => {
    const f = fichasTaller([ot('e', 'en_reparacion')], { e: ['l1'] })[0];
    expect([f.hechas, f.total]).toEqual([1, 2]);
  });
});

describe('agruparTareasHechas', () => {
  it('agrupa por orden', () => {
    expect(agruparTareasHechas([{ otId: 'a', lineaId: '1' }, { otId: 'b', lineaId: '2' }, { otId: 'a', lineaId: '3' }])).toEqual({ a: ['1', '3'], b: ['2'] });
  });
});

describe('mensajes de WhatsApp al mecánico', () => {
  it('el aviso de coche asignado lleva el coche, la matrícula y la primera línea del problema, sin enlace', () => {
    const m = mensajeAvisoMecanico({ nombre: 'Pedro', vehiculo: 'Peugeot 3008', matricula: '0069LJX', problema: 'Frena mal\nruido atrás\nfalla el sensor' });
    expect(m).toBe('Hola Pedro, te hemos asignado el Peugeot 3008 (0069LJX). Problema: Frena mal. Lo tienes en tu lista del taller.');
    expect(m).not.toContain('http');
  });
  it('sin problema ni matrícula no deja huecos raros', () => {
    expect(mensajeAvisoMecanico({ nombre: 'Pedro', vehiculo: 'Seat Ibiza', matricula: '' })).toBe('Hola Pedro, te hemos asignado el Seat Ibiza. Lo tienes en tu lista del taller.');
  });
  it('el primer envío del enlace lleva el enlace y pide no compartirlo', () => {
    const m = mensajeEnlaceMecanico({ nombre: 'Pedro', empresa: '2M Rent a Car', enlace: 'https://app.2mrentacar.es/?taller=abc' });
    expect(m).toContain('https://app.2mrentacar.es/?taller=abc');
    expect(m).toContain('No lo compartas');
  });
  it('enlaceWhatsApp abre el chat si hay teléfono y deja elegir contacto si no', () => {
    expect(enlaceWhatsApp('+34 623 59 64 15', 'Hola & adiós')).toBe('https://wa.me/34623596415?text=Hola%20%26%20adi%C3%B3s');
    expect(enlaceWhatsApp(undefined, 'x')).toBe('https://wa.me/?text=x');
  });
});

describe('datos vacíos de órdenes antiguas (la base de datos los permite)', () => {
  it('ordenar para el mecánico no falla si falta la fecha de recepción', () => {
    const r = ordenarParaMecanico([om('1', 'recibido', { recepcion: null }), om('2', 'recibido', { recepcion: '2026-10-01' }), om('3', 'recibido', { recepcion: undefined })]);
    expect(r.map(o => o.id)).toEqual(['2', '3', '1']); // con fecha primero; sin fecha, por número de orden de mayor a menor
  });

  it('el tablero del personal no falla si falta la fecha de actualización', () => {
    const sinFecha = { ...ot('a', 'en_reparacion'), fechaActualizacion: undefined } as unknown as OrdenTrabajo;
    const nula = { ...ot('b', 'en_reparacion'), fechaActualizacion: null } as unknown as OrdenTrabajo;
    expect(() => fichasTaller([sinFecha, ot('c', 'en_reparacion'), nula], {})).not.toThrow();
    expect(fichasTaller([sinFecha, ot('c', 'en_reparacion'), nula], {})[0].ot.id).toBe('c');
  });

  it('una orden con líneas vacías o sin definir no rompe el avance', () => {
    expect(progresoOT({ lineas: undefined as unknown as OrdenTrabajo['lineas'] }, undefined)).toEqual({ hechas: 0, total: 0 });
  });
});
