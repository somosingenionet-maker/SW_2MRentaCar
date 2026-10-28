import { describe, it, expect } from 'vitest';
import { ofreceSeguro, totalAlquiler, etiquetaTransmision, parseFianza, fianzaSugerida } from './condicionesAlquiler';

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

describe('parseFianza', () => {
  it('acepta un importe entero, con coma o con punto', () => {
    expect(parseFianza('500')).toBe(500);
    expect(parseFianza('150,5')).toBe(150.5);
    expect(parseFianza('150.50')).toBe(150.5);
  });

  it('el 0 es válido (sin fianza)', () => {
    expect(parseFianza('0')).toBe(0);
    expect(parseFianza(' 0,00 ')).toBe(0);
  });

  it('redondea a céntimos', () => {
    expect(parseFianza('100,456')).toBe(100.46);
    expect(parseFianza('0.1')).toBe(0.1);
  });

  it('rechaza vacío, texto y negativos', () => {
    for (const t of ['', '  ', 'abc', '-50', '12e3', '1,2,3', '€500', '500 €']) expect(parseFianza(t)).toBeNull();
  });
});

describe('fianzaSugerida', () => {
  it('es la fianza habitual del vehículo, o 0 si no tiene', () => {
    expect(fianzaSugerida({ fianza: 600 })).toBe('600');
    expect(fianzaSugerida({ fianza: undefined })).toBe('0');
    expect(fianzaSugerida(null)).toBe('0');
    expect(fianzaSugerida(undefined)).toBe('0');
  });
});
