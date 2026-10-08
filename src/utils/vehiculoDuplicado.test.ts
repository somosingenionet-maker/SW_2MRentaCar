import { describe, it, expect } from 'vitest';
import { datoDuplicado } from './vehiculoDuplicado';

const flota = [
  { id: 'a', matricula: '1234-ABC', bastidor: 'VF1AAAAA111111111' },
  { id: 'b', matricula: '5678 DEF', bastidor: '' },
];

describe('datoDuplicado', () => {
  it('detecta una matrícula repetida ignorando mayúsculas, espacios y guiones', () => {
    expect(datoDuplicado(flota, { id: 'nuevo', matricula: '1234 abc' })).toBe('matrícula');
    expect(datoDuplicado(flota, { id: 'nuevo', matricula: '5678-def' })).toBe('matrícula');
  });

  it('detecta un bastidor repetido', () => {
    expect(datoDuplicado(flota, { id: 'nuevo', matricula: '0000-ZZZ', bastidor: 'vf1aaaaa111111111' })).toBe('bastidor');
  });

  it('no choca consigo mismo al editar', () => {
    expect(datoDuplicado(flota, { id: 'a', matricula: '1234-ABC', bastidor: 'VF1AAAAA111111111' })).toBeNull();
  });

  it('un bastidor vacío no cuenta como repetido', () => {
    expect(datoDuplicado(flota, { id: 'nuevo', matricula: '0000-ZZZ', bastidor: '' })).toBeNull();
  });

  it('acepta datos distintos', () => {
    expect(datoDuplicado(flota, { id: 'nuevo', matricula: '9999-XYZ', bastidor: 'OTRO' })).toBeNull();
  });
});
