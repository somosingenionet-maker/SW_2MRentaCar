import { describe, expect, it } from 'vitest';
import { genId } from './id';

describe('genId', () => {
  it('lleva el prefijo y solo caracteres seguros', () => expect(genId('res')).toMatch(/^res-[a-z0-9]+$/));
  it('no repite ids ni siquiera creando miles en el mismo instante', () => {
    const ids = new Set(Array.from({ length: 50000 }, () => genId('x')));
    expect(ids.size).toBe(50000);
  });
});
