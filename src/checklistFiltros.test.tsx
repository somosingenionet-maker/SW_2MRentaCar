import { describe, it, expect } from 'vitest';
import { renderToString } from 'react-dom/server';
import { ChecklistFiltros, ResumenFiltros } from './components/ChecklistFiltros';
import { Tarjeta } from './components/TallerMecanico';
import type { OrdenMecanico } from './utils/tallerMecanico';

const texto = (h: string) => h.replace(/<[^>]*>/g, ' ').replace(/&#x27;/g, "'").replace(/\s+/g, ' ');
const noop = () => undefined;

describe('check list de filtros', () => {
  it('muestra los cuatro filtros con «Cambiado» y «No se cambió» y marca lo ya elegido', () => {
    const h = renderToString(<ChecklistFiltros estado={{ aire: true, diesel: false }} onCambiar={noop} />);
    const t = texto(h);
    for (const n of ['Filtro de aire', 'Filtro de aceite', 'Filtro de diésel', 'Filtro de habitáculo']) expect(t).toContain(n);
    expect(h.match(/aria-pressed="true"/g)).toHaveLength(2);
    expect(h.match(/aria-pressed="false"/g)).toHaveLength(6);
    expect(t).toContain('Faltan 2 filtros por marcar.');
  });
  it('con los cuatro marcados lo dice; con uno pendiente usa el singular', () => {
    expect(texto(renderToString(<ChecklistFiltros estado={{ aire: true, aceite: true, diesel: false, habitaculo: true }} onCambiar={noop} />))).toContain('Los cuatro filtros están marcados.');
    expect(texto(renderToString(<ChecklistFiltros estado={{ aire: true, aceite: true, diesel: false }} onCambiar={noop} />))).toContain('Faltan 1 filtro por marcar.');
  });
  it('se puede bloquear', () => {
    expect(renderToString(<ChecklistFiltros estado={{}} onCambiar={noop} deshabilitado />).match(/disabled=""/g)).toHaveLength(8);
  });
  it('el resumen del historial distingue cambiado, no cambiado y sin revisar', () => {
    const t = texto(renderToString(<ResumenFiltros estado={{ aire: true, aceite: true, diesel: false }} />));
    expect(t).toContain('✔ aire');
    expect(t).toContain('✔ aceite');
    expect(t).toContain('✘ diésel (no se cambió)');
    expect(t).toContain('· habitáculo (sin revisar)');
  });
  it('sin ningún dato el resumen deja los cuatro sin revisar', () => {
    expect(texto(renderToString(<ResumenFiltros estado={undefined} />)).match(/sin revisar/g)).toHaveLength(4);
  });
});

const orden: OrdenMecanico = {
  id: 'ot1', numero: 'OT-1', estado: 'en_reparacion', vehiculo: { matricula: '1234ABC', marca: 'Seat', modelo: 'Ibiza' }, tareas: [], piezas: [],
};
const pinta = (o: Partial<OrdenMecanico>) => renderToString(
  <Tarjeta orden={{ ...orden, ...o }} color="#C38DD6" ahora={0} abierta nueva={false} ocupado={null} nota="" confirmandoListo={false}
    onAbrir={noop} onTarea={noop} onFiltro={noop} onEmpezar={noop} onListo={noop} onCancelarListo={noop} onReabrir={noop} onNota={noop} onEnviarNota={noop} />,
);

describe('check list en la página del mecánico', () => {
  it('sin marcar como cambio de aceite solo ofrece activarlo', () => {
    const h = pinta({});
    expect(h).toContain('activar-cambio-aceite');
    expect(texto(h)).toContain('Es un cambio de aceite');
    expect(h).not.toContain('checklist-filtros');
    expect(h).not.toContain('proximo-cambio');
    expect(pinta({ cambioAceite: false })).toContain('activar-cambio-aceite');
  });
  it('marcada como cambio de aceite muestra los filtros y el próximo cambio, y ya no ofrece activarlo', () => {
    const h = pinta({ cambioAceite: true, filtros: { aire: true } });
    expect(h).not.toContain('activar-cambio-aceite');
    expect(texto(h)).toContain('Cambio de aceite: filtros');
    expect(texto(h)).toContain('Faltan 3 filtros por marcar.');
    expect(texto(h)).toContain('Próximo cambio de aceite');
    expect(texto(h)).toContain('En 6 meses');
    expect(texto(h)).toContain('En 1 año');
    expect(texto(h)).toContain('No es un cambio de aceite');
    expect(h).not.toContain('proximo-anotado');
  });
  it('con el próximo cambio ya anotado lo enseña en el campo y avisa de que está en la ficha', () => {
    const h = pinta({ cambioAceite: true, proximoCambio: '2027-11-11' });
    expect(h).toContain('value="2027-11-11"');
    expect(texto(h)).toMatch(/Anotado: 11 nov\. 2027\s*\. Ya está en la ficha del vehículo\./);
  });
  it('sin fecha el botón de guardar está bloqueado', () => {
    expect(pinta({ cambioAceite: true })).toMatch(/data-testid="guardar-proximo"[^>]*disabled=""|disabled=""[^>]*data-testid="guardar-proximo"/);
  });
});
