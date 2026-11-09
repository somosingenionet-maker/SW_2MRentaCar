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

  it('al ampliar propone el total nuevo con la diferencia, y dice de dónde sale', () => {
    const h = pinta({ borrador: borrador({ fechaFin: '2027-01-15' }) });
    const t = texto(h);
    expect(t).toContain('5 días');
    expect(t).toMatch(/\+2 respecto a los 3 actuales/);
    expect(t).toMatch(/Total: 200,00 € \( ?\+ ?80,00 €\)/);
    expect(t).toContain('Calculado con los días nuevos');
  });

  it('con el coche ya entregado la fecha de entrega está bloqueada y lo dice', () => {
    const h = pinta({ inicioBloqueado: true });
    expect(h).toMatch(/<input[^>]*disabled=""[^>]*aria-label="Fecha de entrega"|aria-label="Fecha de entrega"[^>]*disabled=""/);
    expect(h).toContain('inicio-bloqueado');
  });

  it('con precio cerrado pide el precio cerrado y avisa de que no cambia solo', () => {
    const fijo = { ...reserva, precioFijo: 100 } as Reserva;
    const t = texto(pinta({ reserva: fijo, borrador: borrador({ fechaFin: '2027-01-15' }) }));
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
