import { describe, it, expect } from 'vitest';
import { diaSemanaISO, esLunes, resumenSemanal } from './resumenSemanal';
import type { Alerta, Vehiculo } from '../types';

const HOY = '2026-11-16'; // lunes
const veh = (id: string, matricula: string, marca = 'Seat', modelo = 'Ibiza') => ({ id, matricula, marca, modelo }) as Vehiculo;
const al = (id: string, vehiculoId: string, tipo: Alerta['tipo'], fechaLimite: string, estado: Alerta['estado'] = 'activa'): Alerta => ({ id, vehiculoId, tipo, descripcion: '', estado, fechaLimite });

describe('resumen semanal', () => {
  it('sabe qué día de la semana es', () => {
    expect(diaSemanaISO('2026-11-16')).toBe(1);
    expect(diaSemanaISO('2026-11-22')).toBe(7);
    expect(esLunes('2026-11-16')).toBe(true);
    expect(esLunes('2026-11-17')).toBe(false);
  });
  it('lista lo vencido y lo que vence pronto, lo más antiguo primero, e ignora lo programado y lo atendido', () => {
    const r = resumenSemanal({
      hoy: HOY, empresa: '2M Rent a Car', avisosPendientes: 2,
      vehiculos: [veh('a', '1111AAA'), veh('b', '2222BBB', 'Ford', 'Focus'), veh('c', '3333CCC')],
      alertas: [
        al('1', 'a', 'itv', '2026-11-10'),
        al('2', 'b', 'seguro', '2026-10-01'),
        al('3', 'c', 'aceite', '2026-11-20'),
        al('4', 'a', 'impuesto', '2027-06-01'),
        al('5', 'b', 'itv', '2026-01-01', 'atendida'),
      ],
    });
    expect(r.vencidas).toBe(2);
    expect(r.pronto).toBe(1);
    expect(r.vacio).toBe(false);
    expect(r.texto).toContain('Resumen semanal · 2M Rent a Car');
    expect(r.texto).toContain('VENCIDAS (2)');
    expect(r.texto.indexOf('2222BBB')).toBeLessThan(r.texto.indexOf('1111AAA'));
    expect(r.texto).toContain('• Seguro · 2222BBB Ford Focus — Vencida hace 46 días (1 oct. 2026)');
    expect(r.texto).toContain('VENCEN EN LOS PRÓXIMOS 14 DÍAS (1)');
    expect(r.texto).toContain('• Cambio de aceite · 3333CCC Seat Ibiza — Vence en 4 días (20 nov. 2026)');
    expect(r.texto).toContain('AVISOS A CLIENTES PENDIENTES: 2');
    expect(r.texto).not.toContain('Impuesto');
  });
  it('si no hay nada lo dice claro', () => {
    const r = resumenSemanal({ hoy: HOY, empresa: 'X', avisosPendientes: 0, vehiculos: [], alertas: [] });
    expect(r.vacio).toBe(true);
    expect(r.texto).toContain('Todo al día');
  });
  it('limita las líneas para que el mensaje sea legible', () => {
    const alertas = Array.from({ length: 40 }, (_, i) => al(`a${i}`, 'a', 'itv', '2026-10-01'));
    const r = resumenSemanal({ hoy: HOY, empresa: 'X', avisosPendientes: 0, vehiculos: [veh('a', '1111AAA')], alertas });
    expect(r.texto).toContain('VENCIDAS (40)');
    expect(r.texto).toContain('…y 15 más');
    expect(r.texto.split('\n').filter(l => l.startsWith('•'))).toHaveLength(25);
  });
});
