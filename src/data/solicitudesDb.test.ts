import { describe, it, expect, vi } from 'vitest';

let columnasPedidas = '';
vi.mock('../lib/supabase', () => ({
  supabase: { from: () => ({ select: (c: string) => { columnasPedidas = c; return { order: () => ({ range: () => Promise.resolve({ data: [], error: null }) }) }; } }) },
}));

import { fetchSolicitudes } from './solicitudesDb';

describe('descarga de pedidos de la web', () => {
  it('pide los precios de lista y los cupones, que la ficha y el contrato necesitan', async () => {
    await fetchSolicitudes();
    const columnas = columnasPedidas.split(',');
    for (const c of ['vehiculo_subtotal', 'cupones', 'extras', 'descuento', 'vehiculo_total', 'total']) expect(columnas, c).toContain(c);
  });

  it('no descarga el pedido original completo (payload), que es pesado y lleva datos de más', async () => {
    await fetchSolicitudes();
    expect(columnasPedidas.split(',')).not.toContain('payload');
  });
});
