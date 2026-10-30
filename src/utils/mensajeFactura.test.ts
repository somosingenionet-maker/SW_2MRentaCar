import { describe, it, expect } from 'vitest';
import { mensajeFactura } from './mensajeFactura';

describe('mensajeFactura', () => {
  const m = mensajeFactura({ nombre: 'Ana', numero: 'F-2026-0007', total: '1.234,50', empresa: '2M Rent a Car' });

  it('incluye el nombre, el número, el importe y la empresa', () => {
    expect(m).toContain('Hola Ana,');
    expect(m).toContain('Factura F-2026-0007 por importe de 1.234,50 €');
    expect(m.endsWith('2M Rent a Car')).toBe(true);
  });

  it('no promete un archivo adjunto, porque esos enlaces no pueden adjuntar nada', () => {
    expect(m).not.toMatch(/adjunt|attach/i);
  });
});
