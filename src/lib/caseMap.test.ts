import { describe, expect, it } from 'vitest';
import { objToRow, rowToObj } from './caseMap';

describe('caseMap', () => {
  it('convierte snake_case a camelCase solo en el primer nivel', () => {
    const o = rowToObj<{ fechaInicio: string; tarifasAlquiler: { temporada_alta: number } }>({ fecha_inicio: '2026-01-01', tarifas_alquiler: { temporada_alta: 90 } });
    expect(o.fechaInicio).toBe('2026-01-01');
    expect(o.tarifasAlquiler).toEqual({ temporada_alta: 90 });
  });
  it('convierte camelCase a snake_case y descarta undefined', () => {
    expect(objToRow({ clienteId: 'c1', nifNiePasaporte: 'X', ciudad: undefined })).toEqual({ cliente_id: 'c1', nif_nie_pasaporte: 'X' });
  });
  it('los campos del carnet de conducir del cliente van a las columnas carnet_*', () => {
    const row = objToRow({ carnetNumero: '123', carnetExpedicion: '2020-03-01', carnetVencimiento: '2030-03-01' });
    expect(row).toEqual({ carnet_numero: '123', carnet_expedicion: '2020-03-01', carnet_vencimiento: '2030-03-01' });
    expect(rowToObj<{ carnetNumero: string }>(row).carnetNumero).toBe('123');
  });
  it('ida y vuelta conserva los datos', () => {
    const original = { id: 'a', fechaInicio: '2026-10-01', incluyeSeguroTodoRiesgo: true, extras: [{ nombreExtra: 'x' }] };
    expect(rowToObj(objToRow(original))).toEqual(original);
  });
});
