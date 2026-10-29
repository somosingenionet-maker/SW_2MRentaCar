import { describe, it, expect } from 'vitest';
import { lugaresReserva } from './lugarReserva';

describe('lugaresReserva', () => {
  it('usa el lugar guardado en la reserva', () => {
    expect(lugaresReserva({ lugarRecogida: 'Aeropuerto', lugarDevolucion: 'Oficina' }, { lugarRecogida: 'Otro', lugarDevolucion: 'Otro' }))
      .toEqual({ recogida: 'Aeropuerto', devolucion: 'Oficina' });
  });

  it('si la reserva no lo tiene, usa el del pedido de la web', () => {
    expect(lugaresReserva({}, { lugarRecogida: 'Palma', lugarDevolucion: 'Aeropuerto' }))
      .toEqual({ recogida: 'Palma', devolucion: 'Aeropuerto' });
  });

  it('ignora espacios en blanco y devuelve vacío si no hay nada', () => {
    expect(lugaresReserva({ lugarRecogida: '  ', lugarDevolucion: undefined })).toEqual({ recogida: '', devolucion: '' });
  });
});
