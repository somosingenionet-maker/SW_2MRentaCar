import { describe, it, expect } from 'vitest';
import { HORAS_24, partesHora, unirHora, opcionesMinutos } from './hora24';

describe('HORAS_24', () => {
  it('va de 00 a 23, sin 24', () => {
    expect(HORAS_24).toHaveLength(24);
    expect(HORAS_24[0]).toBe('00');
    expect(HORAS_24[23]).toBe('23');
    expect(HORAS_24).not.toContain('24');
  });
});

describe('partesHora', () => {
  it('separa una hora correcta', () => expect(partesHora('09:05')).toEqual({ h: '09', m: '05' }));
  it('acepta los extremos', () => {
    expect(partesHora('00:00')).toEqual({ h: '00', m: '00' });
    expect(partesHora('23:59')).toEqual({ h: '23', m: '59' });
  });
  it('un valor vacío o mal formado no da hora', () => {
    for (const v of ['', '9:05', '24:00', '10:60', 'abc', '10:00 PM']) expect(partesHora(v)).toEqual({ h: '', m: '' });
  });
});

describe('unirHora', () => {
  it('une hora y minutos', () => expect(unirHora('14', '30')).toBe('14:30'));
  it('sin minutos toma 00', () => expect(unirHora('14', '')).toBe('14:00'));
  it('sin hora no hay valor', () => expect(unirHora('', '30')).toBe(''));
});

describe('opcionesMinutos', () => {
  it('ofrece los múltiplos de 5', () => {
    const o = opcionesMinutos('');
    expect(o).toHaveLength(12);
    expect(o[0]).toBe('00');
    expect(o[11]).toBe('55');
  });
  it('conserva un minuto que no es múltiplo de 5 y lo deja ordenado', () => {
    const o = opcionesMinutos('11');
    expect(o).toContain('11');
    expect(o.indexOf('11')).toBe(o.indexOf('10') + 1);
  });
});
