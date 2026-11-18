import { describe, it, expect } from 'vitest';
import { renderToString } from 'react-dom/server';
import { EditorFechas } from './components/EditorFechas';
import type { BorradorFechas } from './utils/cambioFechas';
import type { Reserva } from './types';

const reserva = { id: 'r1', vehiculoId: 'v1', fechaInicio: '2027-01-10', fechaFin: '2027-01-13', horaInicio: '12:00', horaFin: '12:00', tarifaDiaria: 40, totalCobrado: 120, origen: 'manual', incluyeSeguroTodoRiesgo: false, extras: [], descuento: 0 } as unknown as Reserva;
const borrador = (o: Partial<BorradorFechas> = {}): BorradorFechas => ({ fechaInicio: '2027-01-10', fechaFin: '2027-01-13', horaInicio: '12:00', horaFin: '12:00', valor: null, ...o });
const texto = (h: string) => h.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ');
const pinta = (o: Partial<Parameters<typeof EditorFechas>[0]> = {}) => renderToString(
  <EditorFechas reserva={reserva} borrador={borrador()} inicioBloqueado={false} firmada={false} error="" onCambiar={() => undefined} onGuardar={() => undefined} onCancelar={() => undefined} {...o} />,
);

describe('editor de fechas de la reserva', () => {
  it('enseña las dos fechas y horas, los días y el total actual', () => {
    const h = pinta();
    expect(h).toContain('value="2027-01-10"');
    expect(h).toContain('value="2027-01-13"');
    expect(texto(h)).toContain('3 días');
    expect(texto(h)).toContain('Total: 120,00 €');
    expect(texto(h)).toContain('Total de la reserva (€)');
  });

  it('al acortar propone el total nuevo y dice de dónde sale', () => {
    const t = texto(pinta({ borrador: borrador({ fechaFin: '2027-01-12' }) }));
    expect(t).toContain('2 días');
    expect(t).toMatch(/−1 respecto a los 3 actuales/);
    expect(t).toMatch(/Total: 80,00 € \( ?− ?40,00 €\)/);
    expect(t).toContain('Calculado con los días nuevos');
    expect(t).not.toContain('días adicionales');
  });

  it('al ampliar no pide el total: pide lo de los días adicionales (cerrado o por día) y deja intacto lo que ya había', () => {
    const h = pinta({ borrador: borrador({ fechaFin: '2027-01-15' }) });
    const t = texto(h);
    expect(t).toContain('5 días');
    expect(t).toMatch(/\+2 respecto a los 3 actuales/);
    expect(t).toContain('2 días adicionales');
    expect(t).toContain('el precio de lo que ya estaba pactado no se toca');
    expect(h).toContain('data-testid="modo-extra-cerrado"');
    expect(h).toContain('data-testid="modo-extra-dia"');
    expect(t).not.toContain('Total de la reserva (€)');
    // reserva manual: por día, con la tarifa de la reserva sugerida
    expect(t).toContain('Valor por día (€)');
    expect(t).toContain('Sugerido con la tarifa');
    expect(t).toMatch(/Total: 120,00 € \+ extras 2 días adicionales \(2 × 40,00 €\) 80,00 € = 200,00 €/);
  });

  it('con precio cerrado escrito: «Total: 500 € + extras 7 días adicionales 100 € = 600 €»', () => {
    const inicial = { ...reserva, totalCobrado: 500, precioFijo: 500 } as Reserva;
    const t = texto(pinta({ reserva: inicial, borrador: borrador({ fechaFin: '2027-01-20', modoExtra: 'cerrado', valorExtra: '100' }) }));
    expect(t).toContain('Precio cerrado de los 7 días (€)');
    expect(t).toMatch(/Total: 500,00 € \+ extras 7 días adicionales 100,00 € = 600,00 €/);
    expect(t).toContain('Total: 600,00 €');
  });

  it('con un alquiler ya ampliado y una segunda ampliación, el total parte de lo guardado', () => {
    const ya = { ...reserva, totalCobrado: 600, ampliacion: { diasBase: 3, totalBase: 500, extras: [{ dias: 7, importe: 100, hasta: '2027-01-20' }] } } as Reserva;
    const t = texto(pinta({ reserva: { ...ya, fechaFin: '2027-01-20' } as Reserva, borrador: borrador({ fechaFin: '2027-01-22', modoExtra: 'cerrado', valorExtra: '30' }) }));
    expect(t).toMatch(/Total: 600,00 € \+ extras 2 días adicionales 30,00 € = 630,00 €/);
  });

  it('con el coche ya entregado la fecha de entrega está bloqueada y lo dice', () => {
    const h = pinta({ inicioBloqueado: true });
    expect(h).toMatch(/<input[^>]*disabled=""[^>]*aria-label="Fecha de entrega"|aria-label="Fecha de entrega"[^>]*disabled=""/);
    expect(h).toContain('inicio-bloqueado');
  });

  it('con precio cerrado, al acortar pide el precio cerrado y avisa de que no cambia solo', () => {
    const fijo = { ...reserva, precioFijo: 100 } as Reserva;
    const t = texto(pinta({ reserva: fijo, borrador: borrador({ fechaFin: '2027-01-12' }) }));
    expect(t).toContain('Precio cerrado del alquiler (€)');
    expect(t).toContain('no cambia solo');
    expect(t).toContain('Precio cerrado: 100,00 €');
  });

  it('avisa de la firma y enseña el error', () => {
    const t = texto(pinta({ firmada: true, error: 'Con esas fechas el coche choca con otra reserva' }));
    expect(t).toContain('anula la firma y vuelve a firmar');
    expect(t).toContain('choca con otra reserva');
  });
});
