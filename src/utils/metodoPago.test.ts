import { describe, it, expect } from 'vitest';
import { METODOS_PAGO, etiquetaMetodoPago, metodoPagoValido } from './metodoPago';

describe('método de pago de la reserva', () => {
  it('hay tres: efectivo, tarjeta y transferencia, en ese orden', () => {
    expect(METODOS_PAGO.map(m => m.etiqueta)).toEqual(['Efectivo', 'Tarjeta', 'Transferencia']);
    expect(METODOS_PAGO.map(m => m.id)).toEqual(['efectivo', 'tarjeta', 'transferencia']);
  });

  it('etiqueta y validación; lo que no es uno de los tres queda vacío', () => {
    expect(etiquetaMetodoPago('tarjeta')).toBe('Tarjeta');
    expect(etiquetaMetodoPago(null)).toBe('');
    expect(etiquetaMetodoPago('bizum')).toBe('');
    expect(metodoPagoValido('transferencia')).toBe('transferencia');
    expect(metodoPagoValido('')).toBeNull();
    expect(metodoPagoValido(undefined)).toBeNull();
    expect(metodoPagoValido('bizum')).toBeNull();
  });

  it('en la base de datos va en la columna metodo_pago (y null se envía, para poder quitarlo)', async () => {
    const { objToRow, rowToObj } = await import('../lib/caseMap');
    expect(objToRow({ id: 'r1', metodoPago: 'efectivo' })).toMatchObject({ metodo_pago: 'efectivo' });
    expect(objToRow({ id: 'r1', metodoPago: null })).toHaveProperty('metodo_pago', null);
    expect(rowToObj({ id: 'r1', metodo_pago: 'tarjeta' })).toMatchObject({ metodoPago: 'tarjeta' });
  });
});
