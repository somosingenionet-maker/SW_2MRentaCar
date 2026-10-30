import { describe, it, expect, vi } from 'vitest';
import { renderToString } from 'react-dom/server';
import CompanySettingsPanel from './components/CompanySettingsPanel';
import { DEFAULT_EMPRESA_CONFIG } from './data/empresaConfig';
import type { Tecnico } from './types';

// El panel crea y revoca enlaces en la base de datos: en los tests no hay conexión.
vi.mock('./data/tecnicosDb', () => ({
  crearEnlaceTecnico: async () => ({ token: 'x'.repeat(64), creadoEn: '2026-10-31T10:00:00.000Z' }),
  revocarEnlaceTecnico: async () => undefined,
}));

const tecnicos: Tecnico[] = [
  { id: 't1', nombre: 'Pedro', especialidad: 'Frenos', activo: true, enlaceCreadoEn: '2026-10-30T09:00:00.000Z' },
  { id: 't2', nombre: 'Luis', activo: false },
];
const pinta = (t: Tecnico[]) => renderToString(
  <CompanySettingsPanel config={DEFAULT_EMPRESA_CONFIG} onSave={() => undefined} tecnicos={t} onAddTecnico={() => undefined}
    onUpdateTecnico={() => undefined} onDeleteTecnico={() => undefined} onEnlaceTecnico={() => undefined} onClose={() => undefined} />,
);
const texto = (h: string) => h.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ');

describe('técnicos y enlace del taller', () => {
  it('un técnico con enlace muestra desde cuándo, y ofrece crear uno nuevo o desactivarlo', () => {
    const t = texto(pinta(tecnicos));
    expect(t).toContain('Enlace activo desde');
    expect(t).toContain('Nuevo enlace');
    expect(t).toContain('Desactivar');
  });

  it('un técnico sin enlace ofrece crearlo, y uno inactivo se marca como tal', () => {
    const t = texto(pinta(tecnicos));
    expect(t).toContain('Sin enlace del taller');
    expect(t).toContain('Crear enlace');
    expect(t).toContain('Inactivo');
  });

  it('no enseña ningún token ni enlace hasta que se crea uno', () => {
    const h = pinta(tecnicos);
    expect(h).not.toContain('?taller=');
    expect(h).not.toContain('enlace-nuevo');
  });
});
