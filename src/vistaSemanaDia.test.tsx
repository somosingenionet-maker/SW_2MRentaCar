import { describe, it, expect } from 'vitest';
import { renderToString } from 'react-dom/server';
import { VistaSemanaDia } from './components/VistaSemanaDia';
import { diasSemana } from './utils/calendarioVistas';
import type { Cliente, Reserva, Vehiculo } from './types';

const vehiculos = [
  { id: 'v1', marca: 'Seat', modelo: 'Ibiza', matricula: '1111AAA' },
  { id: 'v2', marca: 'Fiat', modelo: '500', matricula: '2222BBB' },
] as Vehiculo[];
const clientes = [
  { id: 'c1', nombre: 'Ana', apellidos: 'Pérez' },
  { id: 'c2', nombre: 'Luis', apellidos: 'Gil' },
] as Cliente[];
const base = { temporada: 'media', tarifaDiaria: 40, totalCobrado: 100, estado: 'confirmada', incluyeSeguroTodoRiesgo: false } as const;
const entrega = { ...base, id: 'r1', vehiculoId: 'v1', clienteId: 'c1', fechaInicio: '2026-11-04', fechaFin: '2026-11-08', horaInicio: '16:00', horaFin: '10:00' } as Reserva;
const curso = { ...base, id: 'r2', vehiculoId: 'v2', clienteId: 'c2', fechaInicio: '2026-11-01', fechaFin: '2026-11-10', horaInicio: '09:00', horaFin: '09:00' } as Reserva;
const todas = [entrega, curso];
const delDia = (iso: string) => todas.filter(r => r.fechaInicio <= iso && r.fechaFin >= iso);
const texto = (h: string) => h.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ');
const pinta = (vista: 'semana' | 'dia', dias: string[]) => renderToString(
  <VistaSemanaDia vista={vista} dias={dias} hoy="2026-11-03" reservasDelDia={delDia} webPasadasDelDia={() => []} clientes={clientes} vehiculos={vehiculos}
    colorDe={() => 'bg-blue-100'} onSeleccionar={() => undefined} onWeb={() => undefined} />,
);

describe('calendario semanal y diario', () => {
  it('la semana tiene siete días, de lunes a domingo, con las reservas de cada día', () => {
    const h = pinta('semana', diasSemana('2026-11-03'));
    expect(h.match(/data-testid="dia-calendario"/g)).toHaveLength(7);
    expect(texto(h)).toContain('Lun 2');
    expect(texto(h)).toContain('Dom 8');
    // r2 está en curso los 7 días; r1 solo del 4 al 8
    expect(h.match(/data-testid="reserva-calendario"/g)).toHaveLength(7 + 5);
  });

  it('marca la entrega y la devolución con su hora, y en curso el resto', () => {
    const h = pinta('semana', diasSemana('2026-11-03'));
    const t = texto(h);
    expect(t).toContain('Entrega 16:00');
    expect(t).toContain('Devolución 10:00');
    expect(t).toContain('En curso');
    expect(h).toContain('data-movimiento="entrega"');
    expect(h).toContain('data-movimiento="devolucion"');
  });

  it('el día muestra vehículo, cliente y modelo, y avisa si no hay nada', () => {
    const t = texto(pinta('dia', ['2026-11-04']));
    expect(t).toContain('1111AAA');
    expect(t).toContain('Ana Pérez');
    expect(t).toContain('Seat Ibiza');
    expect(t).toContain('2222BBB');
    expect(texto(pinta('dia', ['2026-12-20']))).toContain('Sin reservas este día');
  });

  it('en cada día las entregas van antes que las que siguen en curso', () => {
    const h = pinta('dia', ['2026-11-04']);
    expect(h.indexOf('1111AAA')).toBeLessThan(h.indexOf('2222BBB'));
  });
});
