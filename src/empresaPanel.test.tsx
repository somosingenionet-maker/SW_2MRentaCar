import { describe, it, expect, vi } from 'vitest';
import { renderToString } from 'react-dom/server';
import CompanySettingsPanel, { type Seccion } from './components/CompanySettingsPanel';
import { DEFAULT_EMPRESA_CONFIG } from './data/empresaConfig';
import type { Complemento, Tecnico } from './types';

vi.mock('./data/tecnicosDb', () => ({
  crearEnlaceTecnico: async () => ({ token: 'x'.repeat(64), creadoEn: '2026-10-31T10:00:00.000Z' }),
  revocarEnlaceTecnico: async () => undefined,
}));

const tecnicos: Tecnico[] = [{ id: 't1', nombre: 'Mario', activo: true, telefono: '+34 600 111 222' }, { id: 't2', nombre: 'Fran', activo: true }];
const complementos: Complemento[] = [
  { id: 'c1', nombre: 'Sillita infantil', precio: 8, porDia: true, activo: true, orden: 1 },
  { id: 'c2', nombre: 'Baca coche', precio: 50, porDia: false, activo: true, orden: 2 },
  { id: 'c3', nombre: 'Portabicicletas', precio: 40, porDia: false, activo: true, orden: 3 },
];
const pinta = (seccionInicial?: Seccion) => renderToString(
  <CompanySettingsPanel config={DEFAULT_EMPRESA_CONFIG} onSave={() => undefined} tecnicos={tecnicos} onAddTecnico={() => undefined} onUpdateTecnico={() => undefined}
    onDeleteTecnico={() => undefined} onEnlaceTecnico={() => undefined} complementos={complementos} onAddComplemento={() => undefined}
    onUpdateComplemento={() => undefined} onDeleteComplemento={() => undefined} seccionInicial={seccionInicial} onClose={() => undefined} />,
);
const texto = (h: string) => h.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ');

describe('configuración de la empresa por secciones', () => {
  it('tiene cuatro secciones en una navegación lateral, con la cuenta de técnicos y de complementos', () => {
    const h = pinta();
    expect(h).toContain('role="tablist"');
    for (const s of ['Datos de la empresa', 'Logo y color', 'Taller y técnicos', 'Complementos']) expect(texto(h)).toContain(s);
    expect((h.match(/role="tab"/g) ?? []).length).toBe(4);
    expect(h).toMatch(/id="tab-taller"[^>]*>[\s\S]*?>2</);
    expect(h).toMatch(/id="tab-alquiler"[^>]*>[\s\S]*?>3</);
  });

  it('abre por los datos de la empresa y solo enseña esa sección', () => {
    const h = pinta();
    expect(h).toContain('data-testid="seccion-empresa"');
    for (const otra of ['seccion-apariencia', 'seccion-taller', 'seccion-alquiler']) expect(h).not.toContain(otra);
    const t = texto(h);
    for (const x of ['Identidad', 'Datos fiscales', 'Datos de contacto', 'Razón social', 'NIF / CIF', 'Correo electrónico']) expect(t).toContain(x);
    expect(t).not.toContain('Capacidad del taller');
  });

  it.each([
    ['apariencia', 'seccion-apariencia', ['Logo', 'Color de marca', 'Vista previa del header']],
    ['taller', 'seccion-taller', ['Capacidad del taller', 'Técnicos del taller', 'Mario', 'Fran', 'Crear enlace']],
    ['alquiler', 'seccion-alquiler', ['Complementos de alquiler', 'Sillita infantil', 'Baca coche', '50.00 € (precio fijo)']],
  ] as const)('la sección %s enseña lo suyo', (seccion, marca, contenido) => {
    const h = pinta(seccion);
    expect(h).toContain(`data-testid="${marca}"`);
    for (const x of contenido) expect(texto(h), x).toContain(x);
    expect(h).not.toContain('data-testid="seccion-empresa"');
  });

  it('el teléfono del técnico se ve en su tarjeta', () => {
    expect(texto(pinta('taller'))).toContain('+34 600 111 222');
  });

  it('el pie avisa de que técnicos y complementos se guardan al momento, y no hay aviso de cambios si no se ha tocado nada', () => {
    const h = pinta();
    expect(texto(h)).toContain('Los técnicos y los complementos se guardan al momento');
    expect(h).not.toContain('cambios-sin-guardar');
    expect(texto(h)).toContain('Guardar cambios');
  });

  it('la ventana es ancha y accesible: panel asociado a su pestaña', () => {
    const h = pinta('taller');
    expect(h).toContain('max-w-5xl');
    expect(h).toContain('role="tabpanel"');
    expect(h).toContain('aria-labelledby="tab-taller"');
    expect(h).toMatch(/id="tab-taller"[^>]*aria-selected="true"/);
  });
});
