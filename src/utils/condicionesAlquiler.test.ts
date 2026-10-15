import { describe, it, expect } from 'vitest';
import { ofreceSeguro, totalAlquiler, etiquetaTransmision } from './condicionesAlquiler';

describe('totalAlquiler', () => {
  it('sin seguro: días por tarifa', () => {
    expect(totalAlquiler(5, 45, 15, false)).toBe(225);
  });
  it('con seguro suma el precio por día del vehículo', () => {
    expect(totalAlquiler(5, 45, 15, true)).toBe(300);
    expect(totalAlquiler(5, 45, 20, true)).toBe(325);
  });
  it('un vehículo sin seguro ofrecido no lo suma aunque se pida', () => {
    expect(totalAlquiler(3, 60, null, true)).toBe(180);
    expect(totalAlquiler(3, 60, undefined, true)).toBe(180);
  });
});

describe('ofreceSeguro', () => {
  it('solo si hay precio definido', () => {
    expect(ofreceSeguro({ seguroAmpliadoDia: 15 })).toBe(true);
    expect(ofreceSeguro({ seguroAmpliadoDia: 0 })).toBe(true);
    expect(ofreceSeguro({ seguroAmpliadoDia: null })).toBe(false);
    expect(ofreceSeguro({})).toBe(false);
    expect(ofreceSeguro(undefined)).toBe(false);
  });
});

describe('etiquetaTransmision', () => {
  it('traduce el valor', () => {
    expect(etiquetaTransmision('automatico')).toBe('Automático');
    expect(etiquetaTransmision('manual')).toBe('Manual');
    expect(etiquetaTransmision(undefined)).toBe('—');
  });
});
