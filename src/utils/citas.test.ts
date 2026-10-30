import { describe, it, expect } from 'vitest';
import { destinoDeCita, horaFinCita, mensajeRecordatorioCita } from './citas';

describe('destinoDeCita', () => {
  const ordenes = new Set(['ot1']);
  it('una cita convertida en una orden que existe lleva a la orden', () => {
    expect(destinoDeCita({ otId: 'ot1' }, ordenes, true)).toBe('orden');
  });
  it('una cita sin convertir lleva a su ficha', () => {
    expect(destinoDeCita({}, ordenes, true)).toBe('ficha');
  });
  it('sin permiso de Taller, o si la orden ya no existe, lleva a la ficha', () => {
    expect(destinoDeCita({ otId: 'ot1' }, ordenes, false)).toBe('ficha');
    expect(destinoDeCita({ otId: 'borrada' }, ordenes, true)).toBe('ficha');
  });
});

describe('horaFinCita', () => {
  it('suma la duración a la hora de inicio', () => {
    const inicio = new Date(2026, 9, 31, 9, 30).toISOString();
    expect(horaFinCita(inicio, 90)).toBe('11:00');
    expect(horaFinCita(inicio, 30)).toBe('10:00');
  });
});

describe('mensajeRecordatorioCita', () => {
  it('lleva nombre, empresa, día, hora y motivo', () => {
    const m = mensajeRecordatorioCita({ nombre: 'Ana', empresa: '2M Rent a Car', fecha: 'viernes 31 de octubre', hora: '09:30', motivo: 'Revisión' });
    expect(m).toContain('Hola Ana,');
    expect(m).toContain('2M Rent a Car el viernes 31 de octubre a las 09:30 (Revisión)');
  });
  it('sin nombre ni motivo no deja huecos', () => {
    const m = mensajeRecordatorioCita({ nombre: '', empresa: '2M', fecha: 'hoy', hora: '10:00', motivo: '' });
    expect(m.startsWith('Hola, le recordamos')).toBe(true);
    expect(m).not.toContain('()');
  });
});
