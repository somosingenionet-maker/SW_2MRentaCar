import { describe, it, expect } from 'vitest';
import { FLOTA_CLIENTE_ID, sinClienteFlota } from './flota';

describe('sinClienteFlota', () => {
  it('quita el cliente interno de la flota y respeta el resto y su orden', () => {
    const lista = [{ id: 'cli-1' }, { id: FLOTA_CLIENTE_ID }, { id: 'cli-2' }];
    expect(sinClienteFlota(lista)).toEqual([{ id: 'cli-1' }, { id: 'cli-2' }]);
  });

  it('no toca una lista que no lo contiene', () => {
    const lista = [{ id: 'cli-1' }];
    expect(sinClienteFlota(lista)).toEqual(lista);
  });

  it('acepta una lista vacía', () => {
    expect(sinClienteFlota([])).toEqual([]);
  });
});
