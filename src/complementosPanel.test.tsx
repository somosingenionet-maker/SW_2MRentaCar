import { describe, it, expect } from 'vitest';
import { renderToString } from 'react-dom/server';
import ComplementosPanel from './components/ComplementosPanel';
import type { Complemento } from './types';

const catalogo: Complemento[] = [
  { id: 'baca', nombre: 'Baca coche', precio: 50, porDia: false, activo: true, orden: 5 },
  { id: 'sillita', nombre: 'Sillita infantil', precio: 8, porDia: true, activo: true, orden: 3 },
  { id: 'viejo', nombre: 'Cuna', precio: 10, porDia: true, activo: false, orden: 9 },
];
const pinta = (c: Complemento[]) => renderToString(<ComplementosPanel complementos={c} onAdd={() => undefined} onUpdate={() => undefined} onDelete={() => undefined} />);
const texto = (h: string) => h.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ');

describe('catálogo de complementos en Empresa', () => {
  it('lista cada complemento con su precio, distinguiendo por día y precio fijo, en su orden', () => {
    const h = pinta(catalogo);
    const t = texto(h);
    expect(t).toContain('Sillita infantil 8,00 € / día');
    expect(t).toContain('Baca coche 50,00 € (precio fijo)');
    expect(h.indexOf('Sillita infantil')).toBeLessThan(h.indexOf('Baca coche'));
    expect((h.match(/data-testid="fila-complemento"/g) ?? []).length).toBe(3);
  });

  it('marca los que ya no se ofrecen', () => {
    expect(texto(pinta(catalogo))).toContain('Cuna No disponible');
  });

  it('con el catálogo vacío invita a añadir el primero', () => {
    expect(texto(pinta([]))).toContain('Sin complementos. Añade el primero.');
  });

  it('avisa de que eliminar no toca las reservas que ya lo llevan', () => {
    expect(texto(pinta(catalogo))).toContain('Eliminar un complemento no cambia las reservas que ya lo llevan');
  });
});
