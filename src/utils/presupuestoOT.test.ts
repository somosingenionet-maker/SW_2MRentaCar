import { describe, it, expect } from 'vitest';
import { admitePresupuesto, mensajePresupuesto, situacionPresupuesto } from './presupuestoOT';
import type { LineaOT } from '../types';

describe('presupuesto de una orden', () => {
  it('se puede presupuestar antes de recibir el coche y con el coche ya en el taller, no después ni a la flota propia', () => {
    for (const estado of ['presupuesto', 'recibido', 'en_reparacion'] as const) expect(admitePresupuesto({ estado, clienteId: 'c1' })).toBe(true);
    for (const estado of ['listo', 'entregado', 'cancelado'] as const) expect(admitePresupuesto({ estado, clienteId: 'c1' })).toBe(false);
    expect(admitePresupuesto({ estado: 'recibido', clienteId: 'flota-propia' })).toBe(false);
  });
  it('la situación: sin enviar, enviado o aprobado (aprobado manda sobre enviado)', () => {
    expect(situacionPresupuesto({})).toBe('sin_enviar');
    expect(situacionPresupuesto({ presupuestoEstado: 'pendiente' })).toBe('sin_enviar');
    expect(situacionPresupuesto({ presupuestoEstado: 'enviado' })).toBe('enviado');
    expect(situacionPresupuesto({ presupuestoEstado: 'enviado', presupuestoAprobado: true })).toBe('aprobado');
    expect(situacionPresupuesto({ presupuestoAprobado: true })).toBe('aprobado');
  });
  it('el mensaje lleva las líneas, la base, el IVA, el total y cómo aprobar', () => {
    const lineas = [
      { id: 'l1', tipo: 'mano_de_obra', descripcion: 'Cambiar pastillas', cantidad: 2, precioUnitario: 30, subtotal: 60 },
      { id: 'l2', tipo: 'producto', descripcion: 'Pastillas Brembo', cantidad: 1, precioUnitario: 45.5, subtotal: 45.5 },
    ] as LineaOT[];
    const m = mensajePresupuesto({
      cliente: { nombre: 'Ana' }, vehiculo: { marca: 'Seat', modelo: 'Ibiza', matricula: '1234ABC' },
      ot: { numero: 'OT-2026-030', lineas, subtotal: 105.5, totalIva: 22.16, total: 127.66, ivaPct: 21 },
      empresa: { nombre: '2M Rent a Car', telefono: '(+34) 623 59 64 15' },
    });
    expect(m).toContain('Hola Ana,');
    expect(m).toContain('Tras revisar su Seat Ibiza (1234ABC), este es el presupuesto OT-2026-030');
    expect(m).toContain('• Cambiar pastillas × 2: 60,00 €');
    expect(m).toContain('• Pastillas Brembo: 45,50 €');
    expect(m).toContain('Base: 105,50 €');
    expect(m).toContain('IVA (21%): 22,16 €');
    expect(m).toContain('TOTAL: 127,66 €');
    expect(m).toContain('llámenos al (+34) 623 59 64 15');
    expect(m.trim().endsWith('2M Rent a Car')).toBe(true);
  });
  it('sin cliente o vehículo conocidos no inventa nombres', () => {
    const m = mensajePresupuesto({ ot: { numero: 'X', lineas: [], subtotal: 0, totalIva: 0, total: 0, ivaPct: 21 }, empresa: { nombre: 'E', telefono: '' } });
    expect(m).toContain('Hola,');
    expect(m).toContain('su vehículo');
    expect(m).not.toContain('llámenos');
  });
});
