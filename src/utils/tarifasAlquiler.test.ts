import { describe, it, expect } from 'vitest';
import { cambiarTarifa, precioConvenio, tarifaDeTemporada } from './tarifasAlquiler';

const base = { temporadaAlta: 60, temporadaMedia: 45, temporadaBaja: 30 };

describe('cambiarTarifa', () => {
  it('cambia una tarifa de temporada y conserva las otras', () => {
    expect(cambiarTarifa(base, 'temporadaMedia', '50')).toEqual({ ...base, temporadaMedia: 50 });
  });
  it('sin tarifas previas, las tres de temporada empiezan en 0', () => {
    expect(cambiarTarifa(undefined, 'temporadaAlta', '70')).toEqual({ temporadaAlta: 70, temporadaMedia: 0, temporadaBaja: 0 });
  });
  it('vaciar una temporada la deja en 0', () => {
    expect(cambiarTarifa(base, 'temporadaBaja', '').temporadaBaja).toBe(0);
  });
  it('el precio personalizado se guarda con decimales y las temporadas no lo pisan', () => {
    const c = cambiarTarifa(base, 'precioPersonalizado', '37.5');
    expect(c).toEqual({ ...base, precioPersonalizado: 37.5 });
    expect(cambiarTarifa(c, 'temporadaAlta', '65')).toEqual({ ...base, temporadaAlta: 65, precioPersonalizado: 37.5 });
  });
  it('vaciar el precio personalizado, o ponerle 0 o un valor inválido, lo quita en vez de guardar un 0', () => {
    const con = { ...base, precioPersonalizado: 37.5 };
    for (const v of ['', '0', 'abc', '-5']) expect('precioPersonalizado' in cambiarTarifa(con, 'precioPersonalizado', v), v).toBe(false);
  });
  it('un precio personalizado de 0 que ya estuviera guardado no se arrastra', () => {
    expect('precioPersonalizado' in cambiarTarifa({ ...base, precioPersonalizado: 0 }, 'temporadaAlta', '61')).toBe(false);
  });
});

describe('precioConvenio', () => {
  it('devuelve el precio pactado o null si no hay convenio', () => {
    expect(precioConvenio({ ...base, precioPersonalizado: 33 })).toBe(33);
    expect(precioConvenio(base)).toBeNull();
    expect(precioConvenio(undefined)).toBeNull();
    expect(precioConvenio({ ...base, precioPersonalizado: 0 })).toBeNull();
  });
});

describe('tarifaDeTemporada', () => {
  const t = { temporadaAlta: 60, temporadaMedia: 45, temporadaBaja: 30, precioPersonalizado: 38 };
  it('devuelve el precio de cada temporada y el del convenio', () => {
    expect(tarifaDeTemporada(t, 'alta')).toBe(60);
    expect(tarifaDeTemporada(t, 'media')).toBe(45);
    expect(tarifaDeTemporada(t, 'baja')).toBe(30);
    expect(tarifaDeTemporada(t, 'convenio')).toBe(38);
  });
  it('sin convenio o sin tarifas devuelve null', () => {
    expect(tarifaDeTemporada({ ...t, precioPersonalizado: undefined }, 'convenio')).toBeNull();
    expect(tarifaDeTemporada(undefined, 'media')).toBeNull();
  });
});
