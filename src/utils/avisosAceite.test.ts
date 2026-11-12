import { describe, it, expect } from 'vitest';
import { avisosPendientes, clienteDelVehiculo, textoAviso, DIAS_MAX_VENCIDO } from './avisosAceite';
import type { Cliente, OrdenTrabajo, Vehiculo } from '../types';

const HOY = '2026-11-12';
const empresa = { nombre: '2M Rent a Car', telefono: '(+34) 623 59 64 15' };
const veh = (o: Partial<Vehiculo> = {}): Vehiculo => ({ id: 'v1', marca: 'Seat', modelo: 'Ibiza', matricula: '1234ABC', ...o }) as Vehiculo;
const cli = (o: Partial<Cliente> = {}): Cliente => ({ id: 'c1', nombre: 'Ana', apellidos: 'Pérez', correo: 'ana@x.es', telefono: '644095097', interacciones: [], ...o }) as Cliente;
const ot = (o: Partial<OrdenTrabajo> = {}): OrdenTrabajo => ({
  id: 'ot1', numero: 'OT-1', vehiculoId: 'v1', clienteId: 'c1', estado: 'entregado', fechaRecepcion: '2026-11-09', fechaEntrega: '2026-11-11',
  kilometrajeEntrada: 85000, descripcionProblema: '', lineas: [], subtotal: 0, ivaPct: 21, totalIva: 0, total: 0, fechaActualizacion: '2026-11-11T10:00:00.000Z', historial: [], esCambioAceite: true, ...o,
}) as OrdenTrabajo;
const entrada = (o: Partial<Parameters<typeof avisosPendientes>[0]> = {}) =>
  ({ vehiculos: [veh()], ordenes: [ot()], clientes: [cli()], notificaciones: [], filtrosOT: {}, empresa, hoy: HOY, ...o });

describe('avisos del cambio de aceite', () => {
  it('a la entrega genera un resumen con los filtros revisados y el próximo cambio', () => {
    const [a] = avisosPendientes(entrada({
      vehiculos: [veh({ aceiteFecha: '2026-11-11', aceiteProximaFecha: '2027-11-11' })],
      filtrosOT: { ot1: { aire: true, aceite: true, diesel: false } },
    }));
    expect(a.etapa).toBe('entrega');
    expect(a.referencia).toBe('ot1');
    expect(a.mensaje).toContain('Hola Ana,');
    expect(a.mensaje).toContain('✔ Filtro de aire: cambiado');
    expect(a.mensaje).toContain('✔ Filtro de aceite: cambiado');
    expect(a.mensaje).toContain('✘ Filtro de diésel: no se cambió');
    expect(a.mensaje).not.toContain('habitáculo');
    expect(a.mensaje).toContain('Próximo cambio de aceite recomendado: 11 nov. 2027.');
    expect(a.mensaje).toContain('(+34) 623 59 64 15');
    expect(a.sinProximoCambio).toBe(false);
  });
  it('la entrega sin próximo cambio en la ficha sale marcada para que el taller lo sepa y el texto no inventa fecha', () => {
    const [a] = avisosPendientes(entrada({ vehiculos: [veh({ aceiteFecha: '2025-01-01', aceiteProximaFecha: '2025-12-01' })] }));
    expect(a.sinProximoCambio).toBe(true);
    expect(a.mensaje).not.toContain('Próximo cambio');
  });
  it('no avisa de entregas antiguas, de órdenes sin marcar ni de la flota propia', () => {
    expect(avisosPendientes(entrada({ ordenes: [ot({ fechaEntrega: '2026-09-01' })] }))).toHaveLength(0);
    expect(avisosPendientes(entrada({ ordenes: [ot({ esCambioAceite: false })] }))).toHaveLength(0);
    expect(avisosPendientes(entrada({ ordenes: [ot({ clienteId: 'flota-propia' })] }))).toHaveLength(0);
    expect(avisosPendientes(entrada({ ordenes: [ot({ estado: 'listo' })] }))).toHaveLength(0);
  });
  it('recordatorio: solo dentro de los 15 días previos', () => {
    const con = (d: string) => avisosPendientes(entrada({ ordenes: [ot({ esCambioAceite: false })], vehiculos: [veh({ aceiteProximaFecha: d })] }));
    expect(con('2026-11-27')).toHaveLength(1);
    expect(con('2026-11-27')[0].etapa).toBe('recordatorio');
    expect(con('2026-11-12')[0].motivo).toBe('Toca hoy');
    expect(con('2026-11-28')).toHaveLength(0);
  });
  it('vencido: una semana después y hasta 60 días; antes y después, nada', () => {
    const con = (d: string) => avisosPendientes(entrada({ ordenes: [ot({ esCambioAceite: false })], vehiculos: [veh({ aceiteProximaFecha: d })] }));
    expect(con('2026-11-06')).toHaveLength(0);          // vencido hace 6 días: todavía no
    expect(con('2026-11-05')[0].etapa).toBe('vencido'); // hace 7
    expect(con('2026-09-13')).toHaveLength(1);          // hace 60
    expect(DIAS_MAX_VENCIDO).toBe(60);
    expect(con('2026-09-12')).toHaveLength(0);          // hace 61: se deja de insistir
  });
  it('un aviso ya registrado (o descartado) no vuelve a salir, pero otro motivo distinto sí', () => {
    const base = { ordenes: [ot({ esCambioAceite: false })], vehiculos: [veh({ aceiteProximaFecha: '2026-11-20' })] };
    expect(avisosPendientes(entrada({ ...base, notificaciones: [{ vehiculoId: 'v1', tipoEvento: 'aceite_recordatorio', referencia: '2026-11-20' }] }))).toHaveLength(0);
    expect(avisosPendientes(entrada({ ...base, notificaciones: [{ vehiculoId: 'v1', tipoEvento: 'aceite_recordatorio', referencia: '2025-11-20' }] }))).toHaveLength(1);
    expect(avisosPendientes(entrada({ ...base, notificaciones: [{ vehiculoId: 'v1', tipoEvento: 'aceite_vencido', referencia: '2026-11-20' }] }))).toHaveLength(1);
  });
  it('respeta «no avisar» y no avisa a coches sin cliente (flota)', () => {
    const base = { ordenes: [ot({ esCambioAceite: false })], vehiculos: [veh({ aceiteProximaFecha: '2026-11-20' })] };
    expect(avisosPendientes(entrada({ ...base, clientes: [cli({ noAvisar: true })] }))).toHaveLength(0);
    expect(avisosPendientes(entrada({ ...base, ordenes: [], clientes: [cli()] }))).toHaveLength(0);
  });
  it('urgentes primero: vencido, luego entrega, luego recordatorio', () => {
    const r = avisosPendientes(entrada({
      vehiculos: [veh({ id: 'v1', aceiteFecha: '2026-11-11', aceiteProximaFecha: '2027-11-11' }), veh({ id: 'v2', matricula: 'B', aceiteProximaFecha: '2026-11-15' }), veh({ id: 'v3', matricula: 'C', aceiteProximaFecha: '2026-10-01' })],
      ordenes: [ot(), ot({ id: 'ot2', vehiculoId: 'v2', esCambioAceite: false }), ot({ id: 'ot3', vehiculoId: 'v3', esCambioAceite: false })],
    }));
    expect(r.map(a => a.etapa)).toEqual(['vencido', 'entrega', 'recordatorio']);
  });
  it('el cliente del coche es el de su última orden que no sea de la flota; si no, el que lo tiene asociado', () => {
    const clientes = [cli({ id: 'c1' }), cli({ id: 'c2', nombre: 'Luis' }), cli({ id: 'c3', nombre: 'Eva', vehiculosAsociados: ['v9'] })];
    const ordenes = [ot({ clienteId: 'c1', fechaActualizacion: '2026-01-01T00:00:00Z' }), ot({ id: 'ot9', clienteId: 'c2', fechaActualizacion: '2026-05-01T00:00:00Z' }), ot({ id: 'ot8', clienteId: 'flota-propia', fechaActualizacion: '2026-10-01T00:00:00Z' })];
    expect(clienteDelVehiculo('v1', ordenes, clientes)?.id).toBe('c2');
    expect(clienteDelVehiculo('v9', [], clientes)?.id).toBe('c3');
    expect(clienteDelVehiculo('vX', [], clientes)).toBeUndefined();
  });
  it('textos de recordatorio y vencido', () => {
    const d = { cliente: cli(), vehiculo: veh(), empresa, proximo: '2026-11-20' };
    expect(textoAviso({ ...d, etapa: 'recordatorio' }).mensaje).toContain('está previsto para el 20 nov. 2026');
    const v = textoAviso({ ...d, etapa: 'vencido' });
    expect(v.mensaje).toContain('estaba previsto para el 20 nov. 2026');
    expect(v.asunto).toContain('Seat 1234ABC');
  });
  it('los km del próximo cambio salen en los mensajes cuando se anotaron', () => {
    const [e] = avisosPendientes(entrada({ vehiculos: [veh({ aceiteFecha: '2026-11-11', aceiteProximaFecha: '2027-11-11', aceiteProximoKm: 100000 })] }));
    expect(e.mensaje).toContain('Próximo cambio de aceite recomendado: 11 nov. 2027 o a los 100.000 km, lo que ocurra antes.');
    const [r] = avisosPendientes(entrada({ ordenes: [ot({ esCambioAceite: false })], vehiculos: [veh({ aceiteProximaFecha: '2026-11-20', aceiteProximoKm: 100000 })] }));
    expect(r.mensaje).toContain('está previsto para el 20 nov. 2026 o a los 100.000 km, lo que ocurra antes.');
    const [v] = avisosPendientes(entrada({ ordenes: [ot({ esCambioAceite: false })], vehiculos: [veh({ aceiteProximaFecha: '2026-11-01', aceiteProximoKm: 100000 })] }));
    expect(v.mensaje).toContain('estaba previsto para el 1 nov. 2026 o a los 100.000 km y todavía');
    const [sin] = avisosPendientes(entrada({ ordenes: [ot({ esCambioAceite: false })], vehiculos: [veh({ aceiteProximaFecha: '2026-11-20' })] }));
    expect(sin.mensaje).not.toContain(' km');
  });
});
