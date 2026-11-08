import { describe, it, expect } from 'vitest';
import { renderToString } from 'react-dom/server';
import SegundoConductorFields from './components/SegundoConductorFields';

const pinta = (value: Parameters<typeof SegundoConductorFields>[0]['value']) => renderToString(<SegundoConductorFields value={value} onChange={() => undefined} />);

describe('casilla «Añadir segundo conductor»', () => {
  it('sin marcar solo enseña la casilla, sin ningún campo', () => {
    const h = pinta({ segundoConductor: null });
    expect(h).toContain('Añadir segundo conductor');
    expect(h).not.toMatch(/<input[^>]*checked=""/);
    expect(h.match(/<input/g)).toHaveLength(1);
  });

  it('al marcarla pide nombre, DNI y permiso de conducir', () => {
    const h = pinta({ segundoConductor: { nombre: 'Luis Gil', dni: '12345678Z', permiso: 'B-123' } });
    expect(h).toMatch(/<input[^>]*checked=""/);
    expect(h.match(/<input/g)).toHaveLength(4);
    expect(h).toContain('Nombre *');
    expect(h).toContain('DNI / NIE / Pasaporte *');
    expect(h).toContain('Permiso de conducir *');
    expect(h).toContain('value="Luis Gil"');
    expect(h).toContain('value="12345678Z"');
    expect(h).toContain('value="B-123"');
  });
});
