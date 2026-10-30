import { describe, it, expect } from 'vitest';
import { renderToString } from 'react-dom/server';
import { Tarjeta } from './components/TallerMecanico';
import type { OrdenMecanico } from './utils/tallerMecanico';

const base: OrdenMecanico = {
  id: 'ot1', numero: 'OT-2026-001', estado: 'recibido', recepcion: '2026-10-30', fechaEstimadaEntrega: '2026-11-02', kilometraje: 120500,
  problema: 'Frena mal', diagnostico: 'Pastillas gastadas', notas: 'Ojo con el tornillo', actualizada: '2026-10-30T10:00:00.000Z',
  vehiculo: { matricula: '0069LJX', marca: 'Peugeot', modelo: '3008', anio: 2020, color: 'blanco' },
  tareas: [{ id: 'l1', descripcion: 'Cambiar pastillas', hecha: true, hechaPor: 'Pedro', hechaEn: '2026-10-30T11:00:00.000Z' }, { id: 'l2', descripcion: 'Purgar frenos', hecha: false }],
  piezas: [{ descripcion: 'Pastillas Brembo', cantidad: 2 }],
};

const pinta = (o: Partial<OrdenMecanico> = {}, p: Partial<Parameters<typeof Tarjeta>[0]> = {}) =>
  renderToString(
    <Tarjeta orden={{ ...base, ...o }} color="#C38DD6" ahora={Date.parse('2026-10-30T12:00:00Z')} abierta nueva={false} ocupado={null} nota="" confirmandoListo={false}
      onAbrir={() => undefined} onTarea={() => undefined} onEmpezar={() => undefined} onListo={() => undefined} onCancelarListo={() => undefined}
      onReabrir={() => undefined} onNota={() => undefined} onEnviarNota={() => undefined} {...p} />,
  );
const texto = (h: string) => h.replace(/<[^>]*>/g, ' ').replace(/&#x27;/g, "'").replace(/\s+/g, ' ');

describe('tarjeta del mecánico', () => {
  it('cerrada solo enseña matrícula, coche, estado y avance', () => {
    const t = texto(pinta({}, { abierta: false }));
    expect(t).toContain('0069LJX');
    expect(t).toContain('Peugeot 3008 (2020, blanco)');
    expect(t).toContain('Por empezar');
    expect(t).toContain('1 de 2 tareas');
    expect(t).not.toContain('Pastillas gastadas');
  });

  it('abierta enseña los datos de trabajo, las tareas con su estado y las piezas', () => {
    const t = texto(pinta());
    for (const x of ['OT-2026-001', '120.500 km', 'Frena mal', 'Pastillas gastadas', 'Ojo con el tornillo', 'Cambiar pastillas', 'Purgar frenos', 'Pastillas Brembo', 'Pedro']) expect(t).toContain(x);
    expect(pinta()).toContain('aria-checked="true"');
    expect(pinta()).toContain('aria-checked="false"');
  });

  it('por empezar: ofrece Empezar y Marcar como listo, no Reabrir', () => {
    const t = texto(pinta({ estado: 'recibido' }));
    expect(t).toContain('Empezar reparación');
    expect(t).toContain('Marcar como listo');
    expect(t).not.toContain('Reabrir');
  });

  it('en reparación: solo Marcar como listo', () => {
    const t = texto(pinta({ estado: 'en_reparacion' }));
    expect(t).toContain('Marcar como listo');
    expect(t).not.toContain('Empezar reparación');
    expect(t).not.toContain('Reabrir');
  });

  it('listo: solo Reabrir', () => {
    const t = texto(pinta({ estado: 'listo' }));
    expect(t).toContain('Reabrir');
    expect(t).not.toContain('Marcar como listo');
    expect(t).not.toContain('Empezar reparación');
  });

  it('al marcar listo con tareas pendientes pide confirmar y dice cuántas faltan', () => {
    const t = texto(pinta({ estado: 'en_reparacion' }, { confirmandoListo: true }));
    expect(t).toContain('Faltan 1 tarea por marcar');
    expect(t).toContain('Sí, está listo');
  });

  it('una orden sin tareas lo dice y no enseña barra de avance', () => {
    const h = pinta({ tareas: [] }, { abierta: false });
    expect(texto(h)).not.toContain('tareas');
    expect(texto(pinta({ tareas: [] }))).toContain('no tiene tareas detalladas');
  });

  it('marca «Nuevo» las que acaban de asignar y bloquea los botones mientras se guarda', () => {
    expect(texto(pinta({}, { nueva: true }))).toContain('Nuevo');
    const h = pinta({ estado: 'recibido' }, { ocupado: 't-l2' });
    expect((h.match(/disabled=""/g) ?? []).length).toBeGreaterThanOrEqual(3);
  });

  it('no enseña precios ni datos del cliente (la función ya no los envía, y la pantalla tampoco los pinta)', () => {
    const t = texto(pinta());
    expect(t).not.toMatch(/€|precio|importe|total|cliente|teléfono|correo/i);
  });
});
