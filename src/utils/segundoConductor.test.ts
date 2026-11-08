import { describe, it, expect } from 'vitest';
import { validarSegundoConductor, segundoConductorParaGuardar, tieneSegundoConductor, SEGUNDO_CONDUCTOR_VACIO } from './segundoConductor';

describe('segundo conductor del cliente', () => {
  it('sin segundo conductor no se valida nada y se guarda null', () => {
    expect(tieneSegundoConductor({})).toBe(false);
    expect(tieneSegundoConductor({ segundoConductor: null })).toBe(false);
    expect(validarSegundoConductor({})).toBeNull();
    expect(validarSegundoConductor({ segundoConductor: null })).toBeNull();
    expect(segundoConductorParaGuardar({})).toBeNull();
    expect(segundoConductorParaGuardar({ segundoConductor: null })).toBeNull();
  });

  it('con la casilla marcada hacen falta nombre, documento y permiso', () => {
    expect(tieneSegundoConductor({ segundoConductor: { ...SEGUNDO_CONDUCTOR_VACIO } })).toBe(true);
    expect(validarSegundoConductor({ segundoConductor: { ...SEGUNDO_CONDUCTOR_VACIO } })).toMatch(/nombre.*documento.*permiso/);
    expect(validarSegundoConductor({ segundoConductor: { nombre: 'Luis Gil', dni: '', permiso: 'P123' } })).not.toBeNull();
    expect(validarSegundoConductor({ segundoConductor: { nombre: 'Luis Gil', dni: '12345678Z', permiso: '   ' } })).not.toBeNull();
    expect(validarSegundoConductor({ segundoConductor: { nombre: 'Luis Gil', dni: '12345678Z', permiso: 'P123' } })).toBeNull();
  });

  it('al guardar quita espacios y pone documento y permiso en mayúsculas', () => {
    expect(segundoConductorParaGuardar({ segundoConductor: { nombre: '  Luis Gil ', dni: ' 12345678z', permiso: 'b-123 ' } }))
      .toEqual({ nombre: 'Luis Gil', dni: '12345678Z', permiso: 'B-123' });
  });

  it('en la base de datos va en la columna segundo_conductor, sin tocar las claves de dentro (y null se envía para poder borrarlo)', async () => {
    const { objToRow, rowToObj } = await import('../lib/caseMap');
    const c = { nombre: 'Luis Gil', dni: '12345678Z', permiso: 'B-123' };
    expect(objToRow({ id: 'c1', segundoConductor: c })).toMatchObject({ segundo_conductor: c });
    expect(objToRow({ id: 'c1', segundoConductor: null })).toHaveProperty('segundo_conductor', null);
    expect(rowToObj({ id: 'c1', segundo_conductor: c })).toMatchObject({ segundoConductor: c });
  });
});
