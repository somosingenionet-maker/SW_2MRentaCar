import { describe, it, expect } from 'vitest';
import { renderToString } from 'react-dom/server';
import { EditorComplementos } from './components/EditorComplementos';
import { filasEditorExtras } from './utils/complementos';
import type { Complemento, ExtraReserva } from './types';

const catalogo: Complemento[] = [
  { id: 'c1', nombre: 'Sillita infantil', precio: 8, porDia: true, activo: true, orden: 1 },
  { id: 'c2', nombre: 'Baca coche', precio: 50, porDia: false, activo: true, orden: 2 },
];
const texto = (h: string) => h.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ');
const pinta = (extras: ExtraReserva[], total: number, firmada = false, filas = filasEditorExtras(extras, catalogo)) =>
  texto(renderToString(
    <EditorComplementos reserva={{ extras, totalCobrado: total }} filas={filas} dias={4} firmada={firmada}
      onCambiar={() => undefined} onGuardar={() => undefined} onCancelar={() => undefined} />,
  ));

describe('editor de complementos de una reserva', () => {
  it('lista el catálogo con el precio y deja el total como estaba si no se cambia nada', () => {
    const t = pinta([], 120);
    expect(t).toContain('Sillita infantil');
    expect(t).toContain('Baca coche');
    expect(t).toContain('Total: 120,00 €');
    expect(t).not.toContain('ya firmó');
  });

  it('muestra el total nuevo y la diferencia cuando hay cambios', () => {
    const filas = filasEditorExtras([], catalogo).map(f => f.clave === 'c1' ? { ...f, cantidad: 2 } : f);
    const t = pinta([], 120, false, filas);
    expect(t).toContain('Total: 184,00 €');
    expect(t).toContain('+64,00 €');
  });

  it('avisa de que hay que volver a firmar si el contrato ya está firmado', () => {
    expect(pinta([], 120, true)).toContain('anula la firma y vuelve a firmar');
  });

  it('los complementos del pedido de la web se nombran como no editables', () => {
    const t = pinta([{ nombre: 'Maxi-Cosi', cantidad: 1, total: 32 }], 152);
    expect(t).toContain('Maxi-Cosi');
    expect(t).toContain('no se editan aquí');
  });

  it('un complemento que ya no está en el catálogo se puede quitar y lo dice', () => {
    const t = pinta([{ nombre: 'Cadenas de nieve', cantidad: 1, total: 15, precio: 15, porDia: false }], 135);
    expect(t).toContain('Cadenas de nieve');
    expect(t).toContain('ya no está en el catálogo');
  });
});
