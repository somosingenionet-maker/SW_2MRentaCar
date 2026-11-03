import { describe, it, expect } from 'vitest';
import { normalizarUltimos4, normalizarCaducidad, validarTarjeta, estadoTarjeta, resumenTarjeta } from './tarjeta';

describe('tarjeta del cliente (solo referencia)', () => {
  it('de un número pegado entero solo se queda con los 4 últimos dígitos', () => {
    expect(normalizarUltimos4('4111 1111 1111 1234')).toBe('1234');
    expect(normalizarUltimos4('12ab')).toBe('12');
    expect(normalizarUltimos4('')).toBe('');
  });

  it('la caducidad se escribe como MM/AA mientras se teclea', () => {
    expect(normalizarCaducidad('0828')).toBe('08/28');
    expect(normalizarCaducidad('08')).toBe('08');
    expect(normalizarCaducidad('08/2028')).toBe('08/20');
    expect(normalizarCaducidad('8')).toBe('8');
  });

  it('valida los 4 dígitos y el mes de la caducidad; todo vacío es válido', () => {
    expect(validarTarjeta({})).toBeNull();
    expect(validarTarjeta({ tarjetaUltimos4: '1234', tarjetaCaducidad: '08/28' })).toBeNull();
    expect(validarTarjeta({ tarjetaUltimos4: '123' })).toMatch(/4 últimos/);
    expect(validarTarjeta({ tarjetaCaducidad: '13/28' })).toMatch(/MM\/AA/);
    expect(validarTarjeta({ tarjetaCaducidad: '8/28' })).toMatch(/MM\/AA/);
  });

  it('caduca el último día del mes: este mes y el siguiente avisan, un mes pasado está caducada', () => {
    expect(estadoTarjeta(undefined, '2026-11-03')).toBe('sin_dato');
    expect(estadoTarjeta('10/26', '2026-11-03')).toBe('caducada');
    expect(estadoTarjeta('11/26', '2026-11-30')).toBe('caduca_pronto');
    expect(estadoTarjeta('12/26', '2026-11-03')).toBe('caduca_pronto');
    expect(estadoTarjeta('01/27', '2026-11-03')).toBe('vigente');
    expect(estadoTarjeta('01/27', '2026-12-31')).toBe('caduca_pronto');
  });

  it('resumen con lo que haya', () => {
    expect(resumenTarjeta({})).toBe('');
    expect(resumenTarjeta({ tarjetaMarca: 'Visa', tarjetaUltimos4: '4242', tarjetaCaducidad: '08/28', tarjetaTitular: 'Ana Pérez' })).toBe('Visa •••• 4242 · caduca 08/28 · Ana Pérez');
    expect(resumenTarjeta({ tarjetaUltimos4: '4242' })).toBe('•••• 4242');
  });
});

describe('columnas de la base de datos', () => {
  it('los campos de la tarjeta se guardan en tarjeta_titular, tarjeta_marca, tarjeta_ultimos4 y tarjeta_caducidad (y vuelven igual)', async () => {
    const { objToRow, rowToObj } = await import('../lib/caseMap');
    const fila = objToRow({ id: 'c1', tarjetaTitular: 'Ana', tarjetaMarca: 'Visa', tarjetaUltimos4: '4242', tarjetaCaducidad: '08/28' });
    expect(fila).toMatchObject({ tarjeta_titular: 'Ana', tarjeta_marca: 'Visa', tarjeta_ultimos4: '4242', tarjeta_caducidad: '08/28' });
    expect(rowToObj(fila)).toMatchObject({ tarjetaTitular: 'Ana', tarjetaMarca: 'Visa', tarjetaUltimos4: '4242', tarjetaCaducidad: '08/28' });
  });
});
