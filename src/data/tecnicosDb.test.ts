import { describe, it, expect, vi, beforeEach } from 'vitest';

// Llamadas que recibe el cliente de Supabase simulado.
const llamadas: { tabla: string; operacion: string; datos?: unknown; filtro?: [string, unknown]; columnas?: string }[] = [];
let respuesta: { data: unknown; error: unknown } = { data: [{ id: 't1' }], error: null };

vi.mock('../lib/supabase', () => {
  const cadena = (tabla: string, operacion: string, datos?: unknown) => {
    const c: Record<string, unknown> = {};
    c.eq = (campo: string, valor: unknown) => { llamadas.push({ tabla, operacion, datos, filtro: [campo, valor] }); return c; };
    c.select = (columnas?: string) => { llamadas.push({ tabla, operacion: 'select', columnas }); return c; };
    c.order = () => c;
    c.range = () => Promise.resolve(respuesta);
    c.then = (ok: (v: unknown) => unknown) => Promise.resolve(respuesta).then(ok);
    return c;
  };
  return {
    supabase: {
      from: (tabla: string) => ({
        update: (datos: unknown) => cadena(tabla, 'update', datos),
        upsert: (datos: unknown) => { llamadas.push({ tabla, operacion: 'upsert', datos }); return Promise.resolve({ error: null }); },
        select: (columnas: string) => { llamadas.push({ tabla, operacion: 'select', columnas }); return cadena(tabla, 'select'); },
      }),
    },
  };
});

import { crearEnlaceTecnico, revocarEnlaceTecnico, guardarTecnico, fetchTecnicos } from './tecnicosDb';

const sha256 = async (t: string) => [...new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(t)))].map(b => b.toString(16).padStart(2, '0')).join('');

beforeEach(() => { llamadas.length = 0; respuesta = { data: [{ id: 't1' }], error: null }; });

describe('enlace del mecánico', () => {
  it('el token tiene el formato que acepta la función (64 hex) y en la base solo se guarda su hash', async () => {
    const { token } = await crearEnlaceTecnico('t1');
    expect(token).toMatch(/^[a-f0-9]{64}$/);
    const u = llamadas.find(l => l.operacion === 'update')!;
    const guardado = u.datos as { enlace_hash: string; enlace_creado_en: string };
    expect(guardado.enlace_hash).toBe(await sha256(token));
    expect(JSON.stringify(u.datos)).not.toContain(token);
    expect(u.filtro).toEqual(['id', 't1']);
  });

  it('cada enlace es distinto', async () => {
    const a = await crearEnlaceTecnico('t1');
    const b = await crearEnlaceTecnico('t1');
    expect(a.token).not.toBe(b.token);
  });

  it('si el técnico no existe, falla en vez de enseñar un enlace que no funcionaría', async () => {
    respuesta = { data: [], error: null };
    await expect(crearEnlaceTecnico('no-existe')).rejects.toThrow();
  });

  it('revocar borra el hash y la fecha', async () => {
    await revocarEnlaceTecnico('t1');
    const u = llamadas.find(l => l.operacion === 'update')!;
    expect(u.datos).toEqual({ enlace_hash: null, enlace_creado_en: null });
  });
});

describe('datos del técnico', () => {
  it('guardar nunca toca el enlace', async () => {
    await guardarTecnico({ id: 't1', nombre: 'Pedro', activo: true, enlaceCreadoEn: '2026-10-30T00:00:00Z', telefono: '+34600' });
    const u = llamadas.find(l => l.operacion === 'upsert')!;
    expect(Object.keys(u.datos as object).sort()).toEqual(['activo', 'especialidad', 'id', 'nombre', 'telefono']);
  });

  it('el personal nunca descarga el hash del enlace', async () => {
    respuesta = { data: [], error: null };
    await fetchTecnicos();
    const s = llamadas.find(l => l.operacion === 'select')!;
    expect(s.columnas).not.toContain('enlace_hash');
    expect(s.columnas).toContain('enlace_creado_en');
  });
});
