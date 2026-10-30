import { describe, it, expect } from 'vitest';
import { renderToString } from 'react-dom/server';
import TableroTaller from './components/TableroTaller';
import type { OrdenTrabajo, Vehiculo } from './types';

const ahora = Date.parse('2026-10-30T12:00:00Z');
const vehiculos = [
  { id: 'v1', marca: 'Peugeot', modelo: '3008', matricula: '0069LJX' },
  { id: 'v2', marca: 'Seat', modelo: 'Ibiza', matricula: '5612HDR' },
] as Vehiculo[];
const lineas = [
  { id: 'l1', tipo: 'mano_de_obra', descripcion: 'a', cantidad: 1, precioUnitario: 1, subtotal: 1 },
  { id: 'l2', tipo: 'mano_de_obra', descripcion: 'b', cantidad: 1, precioUnitario: 1, subtotal: 1 },
] as OrdenTrabajo['lineas'];
const ot = (id: string, vehiculoId: string, estado: OrdenTrabajo['estado'], extra: Partial<OrdenTrabajo> = {}) =>
  ({ id, numero: `OT-${id}`, vehiculoId, estado, lineas, fechaActualizacion: '2026-10-30T11:55:00Z', ...extra }) as OrdenTrabajo;
const texto = (h: string) => h.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ');
const pinta = (ordenes: OrdenTrabajo[], hechas: Record<string, string[]> = {}, compacto = false) =>
  renderToString(<TableroTaller ordenes={ordenes} vehiculos={vehiculos} tareasHechas={hechas} compacto={compacto} ahora={ahora} />);

describe('tablero del taller', () => {
  it('enseña cada coche con matrícula, estado, mecánico, avance y última novedad', () => {
    const t = texto(pinta([ot('1', 'v1', 'en_reparacion', { tecnicoAsignado: 'Pedro' })], { '1': ['l1'] }));
    for (const x of ['0069LJX', 'Peugeot 3008', 'OT-1', 'En reparación', 'Mecánico: Pedro', '1 de 2 tareas', 'Actualizado hace 5 min']) expect(t).toContain(x);
  });

  it('solo los coches que están en el taller, lo que se trabaja primero', () => {
    const h = pinta([ot('p', 'v1', 'presupuesto'), ot('r', 'v1', 'recibido'), ot('e', 'v2', 'en_reparacion'), ot('x', 'v1', 'entregado')]);
    expect((h.match(/data-testid="ficha-taller"/g) ?? []).length).toBe(2);
    expect(h.indexOf('5612HDR')).toBeLessThan(h.indexOf('0069LJX'));
  });

  it('avisa de un coche sin mecánico y de una orden sin tareas', () => {
    const t = texto(pinta([ot('1', 'v1', 'recibido', { lineas: [] })]));
    expect(t).toContain('Sin mecánico asignado');
    expect(t).toContain('Sin tareas detalladas');
  });

  it('un vehículo borrado no rompe el tablero', () => {
    expect(texto(pinta([ot('1', 'borrado', 'recibido')]))).toContain('Vehículo no disponible');
  });

  it('vacío: avisa en la pestaña de Taller y no enseña nada en la Agenda (compacto)', () => {
    expect(texto(pinta([]))).toContain('No hay coches en el taller ahora');
    expect(pinta([], {}, true)).toBe('');
  });

  it('si se le da una acción, cada coche es un botón que abre su orden', () => {
    const h = renderToString(<TableroTaller ordenes={[ot('1', 'v1', 'recibido')]} vehiculos={vehiculos} tareasHechas={{}} onSeleccionar={() => undefined} ahora={ahora} />);
    expect(h).toMatch(/<button[^>]*data-testid="ficha-taller"/);
  });
});
