import { describe, it, expect } from 'vitest';
import { siguienteNumero } from './numeracion';

describe('siguienteNumero', () => {
  it('empieza en 1 si no hay ninguno', () => {
    expect(siguienteNumero([], 'FAC-', 4)).toBe('FAC-0001');
  });
  it('usa el mayor existente + 1, no la cantidad (aunque se haya borrado alguno)', () => {
    expect(siguienteNumero(['FAC-0001', 'FAC-0003'], 'FAC-', 4)).toBe('FAC-0004');
  });
  it('separa las series por prefijo (año)', () => {
    expect(siguienteNumero(['OT-2025-040', 'OT-2026-002'], 'OT-2026-', 3)).toBe('OT-2026-003');
    expect(siguienteNumero(['OT-2025-040'], 'OT-2026-', 3)).toBe('OT-2026-001');
  });
  it('ignora valores que no son números', () => {
    expect(siguienteNumero(['FAC-ABC', 'FAC-0002'], 'FAC-', 4)).toBe('FAC-0003');
  });
});
