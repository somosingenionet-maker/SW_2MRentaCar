import { describe, it, expect } from 'vitest';
import { validarFactura } from './validarFactura';

const buena = { clienteId: 'c1', estado: 'emitida', total: 121, lineas: [{ descripcion: 'Alquiler', cantidad: 2 }] };

describe('validarFactura', () => {
  it('acepta una factura correcta', () => {
    expect(validarFactura(buena)).toBeNull();
  });

  it('exige cliente y al menos una línea', () => {
    expect(validarFactura({ ...buena, clienteId: '' })).toMatch(/cliente/);
    expect(validarFactura({ ...buena, lineas: [] })).toMatch(/al menos una línea/);
  });

  it('exige descripción y cantidad positiva en cada línea', () => {
    expect(validarFactura({ ...buena, lineas: [{ descripcion: '  ', cantidad: 1 }] })).toMatch(/descripción/);
    expect(validarFactura({ ...buena, lineas: [{ descripcion: 'x', cantidad: 0 }] })).toMatch(/cantidad/);
  });

  it('no deja emitir, cobrar ni marcar vencida una factura de 0 € o negativa', () => {
    for (const estado of ['emitida', 'pagada', 'vencida']) {
      expect(validarFactura({ ...buena, estado, total: 0 })).toMatch(/0 €/);
      expect(validarFactura({ ...buena, estado, total: -5 })).toMatch(/0 €/);
    }
  });

  it('un borrador o una cancelada a 0 € se puede guardar', () => {
    expect(validarFactura({ ...buena, estado: 'borrador', total: 0 })).toBeNull();
    expect(validarFactura({ ...buena, estado: 'cancelada', total: 0 })).toBeNull();
  });
});
