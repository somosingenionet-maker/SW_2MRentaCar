import { describe, it, expect } from 'vitest';
import { buscarReservas } from './buscarReservas';
import type { Cliente, Reserva, SolicitudReserva, Vehiculo } from '../types';

const clientes = [
  { id: 'c1', nombre: 'Ana', apellidos: 'Pérez Gómez', nifNiePasaporte: '12345678Z' },
  { id: 'c2', nombre: 'John', apellidos: 'Smith', nifNiePasaporte: 'X1234567L' },
] as Cliente[];
const vehiculos = [
  { id: 'v1', marca: 'Seat', modelo: 'Ibiza', matricula: '5612 HDR' },
  { id: 'v2', marca: 'Fiat', modelo: '500', matricula: '9383JMZ' },
] as Vehiculo[];
const reservas = [
  { id: 'res-mvry2uo8eyu291', clienteId: 'c1', vehiculoId: 'v1' },
  { id: 'res-abc123def456', clienteId: 'c2', vehiculoId: 'v2' },
  { id: 'res-sinficha00001', clienteId: 'borrado', vehiculoId: 'borrado' },
] as Reserva[];
const solicitudes = [{ reservaId: 'res-abc123def456', referenciaExterna: '4821' }] as SolicitudReserva[];
const datos = { clientes, vehiculos, solicitudes };
const ids = (t: string) => buscarReservas(reservas, datos, t).map(r => r.id);

describe('buscarReservas', () => {
  it('sin texto devuelve todas', () => {
    expect(ids('')).toHaveLength(3);
    expect(ids('   ')).toHaveLength(3);
  });

  it('busca por nombre, apellidos y documento sin importar mayúsculas ni acentos', () => {
    expect(ids('perez')).toEqual(['res-mvry2uo8eyu291']);
    expect(ids('ANA')).toEqual(['res-mvry2uo8eyu291']);
    expect(ids('smith')).toEqual(['res-abc123def456']);
    expect(ids('x1234567l')).toEqual(['res-abc123def456']);
  });

  it('busca por matrícula con o sin espacio, marca y modelo', () => {
    expect(ids('5612hdr')).toEqual(['res-mvry2uo8eyu291']);
    expect(ids('5612 hdr')).toEqual(['res-mvry2uo8eyu291']);
    expect(ids('fiat')).toEqual(['res-abc123def456']);
    expect(ids('ibiza')).toEqual(['res-mvry2uo8eyu291']);
  });

  it('busca por número de reserva: el de la tabla (6), el del contrato (8, en mayúsculas) o el completo', () => {
    expect(ids('eyu291')).toEqual(['res-mvry2uo8eyu291']);
    expect(ids('O8EYU291')).toEqual(['res-mvry2uo8eyu291']);
    expect(ids('08EYU291')).toEqual(['res-mvry2uo8eyu291']); // un cero leído en lugar de la letra O
    expect(ids('res-abc123def456')).toEqual(['res-abc123def456']);
  });

  it('busca por número de pedido de la web, con o sin #', () => {
    expect(ids('4821')).toEqual(['res-abc123def456']);
    expect(ids('#4821')).toEqual(['res-abc123def456']);
  });

  it('varias palabras: todas deben coincidir', () => {
    expect(ids('ana seat')).toEqual(['res-mvry2uo8eyu291']);
    expect(ids('ana fiat')).toEqual([]);
  });

  it('un cliente o coche borrado no rompe la búsqueda', () => {
    expect(ids('sinficha')).toEqual(['res-sinficha00001']);
    expect(ids('zzz')).toEqual([]);
  });
});
