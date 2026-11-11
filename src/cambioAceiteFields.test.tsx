import { describe, it, expect } from 'vitest';
import { renderToString } from 'react-dom/server';
import CambioAceiteFields from './components/CambioAceiteFields';

const texto = (h: string) => h.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ');

describe('campos de cambio de aceite', () => {
  it('tres campos con su etiqueta: fecha del último cambio, km del cambio y fecha del próximo', () => {
    const h = renderToString(<CambioAceiteFields idBase="alta" valor={{}} onChange={() => undefined} />);
    const t = texto(h);
    for (const x of ['Cambio de aceite', 'Fecha del último cambio', 'Km del cambio', 'Fecha del próximo cambio']) expect(t).toContain(x);
    expect(h).toContain('for="alta-aceite-fecha"');
    expect(h).toContain('id="alta-aceite-km"');
    expect(h).toContain('id="alta-aceite-proxima"');
  });
  it('enseña lo guardado y no obliga a rellenar nada', () => {
    const h = renderToString(<CambioAceiteFields idBase="edicion" valor={{ aceiteFecha: '2026-10-01', aceiteKm: 85000, aceiteProximaFecha: '2027-10-01' }} onChange={() => undefined} />);
    expect(h).toContain('value="2026-10-01"');
    expect(h).toContain('value="85000"');
    expect(h).toContain('value="2027-10-01"');
    expect(h).not.toContain('required');
  });
});
