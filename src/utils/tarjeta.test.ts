import { describe, it, expect } from 'vitest';
import { normalizarNumero, formatearNumero, enmascararNumero, luhnValido, normalizarCaducidad, validarTarjeta, estadoTarjeta } from './tarjeta';

// Números de prueba públicos de las pasarelas (no son tarjetas reales).
const VISA = '4242424242424242';
const MC = '5555555555554444';
const AMEX = '378282246310005';

describe('tarjeta del cliente: número y caducidad', () => {
  it('el número se guarda solo con dígitos (máximo 19) y se muestra en grupos de 4', () => {
    expect(normalizarNumero('4242 4242-4242.4242')).toBe(VISA);
    expect(normalizarNumero('4'.repeat(25))).toHaveLength(19);
    expect(formatearNumero(VISA)).toBe('4242 4242 4242 4242');
    expect(formatearNumero('4242')).toBe('4242');
    expect(formatearNumero('')).toBe('');
  });

  it('enmascara todo menos los 4 últimos dígitos', () => {
    expect(enmascararNumero(VISA)).toBe('•••• •••• •••• 4242');
    expect(enmascararNumero(AMEX).replace(/\D/g, '')).toBe('0005');
    expect(enmascararNumero(AMEX)).not.toMatch(/3782|8224|6310/);
    expect(enmascararNumero('')).toBe('');
  });

  it('Luhn acepta tarjetas válidas y rechaza un dígito mal tecleado', () => {
    for (const n of [VISA, MC, AMEX]) expect(luhnValido(n)).toBe(true);
    expect(luhnValido('4242424242424241')).toBe(false);
    expect(luhnValido('')).toBe(false);
  });

  it('la caducidad se escribe como MM/AA mientras se teclea', () => {
    expect(normalizarCaducidad('0828')).toBe('08/28');
    expect(normalizarCaducidad('08')).toBe('08');
    expect(normalizarCaducidad('08/2028')).toBe('08/20');
  });

  it('valida el número y el mes de la caducidad; todo vacío es válido', () => {
    expect(validarTarjeta({})).toBeNull();
    expect(validarTarjeta({ tarjetaNumero: VISA, tarjetaCaducidad: '08/28' })).toBeNull();
    expect(validarTarjeta({ tarjetaNumero: AMEX })).toBeNull();
    expect(validarTarjeta({ tarjetaNumero: '4242424242424241' })).toMatch(/no es válido/);
    expect(validarTarjeta({ tarjetaNumero: '4242' })).toMatch(/no es válido/);
    expect(validarTarjeta({ tarjetaCaducidad: '13/28' })).toMatch(/MM\/AA/);
    expect(validarTarjeta({ tarjetaCaducidad: '8/28' })).toMatch(/MM\/AA/);
  });

  it('caduca el último día del mes: este mes y el siguiente avisan, un mes pasado está caducada', () => {
    expect(estadoTarjeta(undefined, '2026-11-03')).toBe('sin_dato');
    expect(estadoTarjeta('10/26', '2026-11-03')).toBe('caducada');
    expect(estadoTarjeta('11/26', '2026-11-30')).toBe('caduca_pronto');
    expect(estadoTarjeta('12/26', '2026-11-03')).toBe('caduca_pronto');
    expect(estadoTarjeta('01/27', '2026-11-03')).toBe('vigente');
  });

  it('en la base de datos va en tarjeta_numero y tarjeta_caducidad (y vuelve igual)', async () => {
    const { objToRow, rowToObj } = await import('../lib/caseMap');
    const fila = objToRow({ id: 'c1', tarjetaNumero: VISA, tarjetaCaducidad: '08/28' });
    expect(fila).toMatchObject({ tarjeta_numero: VISA, tarjeta_caducidad: '08/28' });
    expect(rowToObj(fila)).toMatchObject({ tarjetaNumero: VISA, tarjetaCaducidad: '08/28' });
  });
});
