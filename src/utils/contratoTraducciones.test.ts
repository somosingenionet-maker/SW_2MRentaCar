import { describe, it, expect } from 'vitest';
import { traducirPais, traducirLugar, traducirComplemento, traducirAseguradora } from './contratoTraducciones';

describe('traducciones del contrato', () => {
  it('los países que hay en la base de datos de 2M pasan a inglés', () => {
    const pares: [string, string][] = [
      ['España', 'Spain'], ['Reino Unido', 'United Kingdom'], ['Portugal', 'Portugal'], ['Rumanía', 'Romania'], ['Italia', 'Italy'],
      ['Austria', 'Austria'], ['Dinamarca', 'Denmark'], ['Francia', 'France'], ['Alemania', 'Germany'], ['Croacia', 'Croatia'],
      ['Turquía', 'Türkiye'], ['Chequia', 'Czechia'], ['Egipto', 'Egypt'], ['Estados Unidos', 'United States'], ['Puerto Rico', 'Puerto Rico'],
      ['Estonia', 'Estonia'], ['Polonia', 'Poland'], ['Eslovenia', 'Slovenia'], ['Lituania', 'Lithuania'], ['Chipre', 'Cyprus'],
      ['Australia', 'Australia'], ['Países Bajos', 'Netherlands'], ['Bélgica', 'Belgium'],
    ];
    for (const [es, en] of pares) expect(traducirPais(es, 'en')).toBe(en);
  });

  it('sin acentos o en mayúsculas, con código, o desconocido; en español no cambia', () => {
    expect(traducirPais('espana', 'en')).toBe('Spain');
    expect(traducirPais('ALEMANIA', 'en')).toBe('Germany');
    expect(traducirPais('GB', 'en')).toBe('United Kingdom');
    expect(traducirPais('Atlantida', 'en')).toBe('Atlantida');
    expect(traducirPais('', 'en')).toBe('');
    expect(traducirPais(undefined, 'en')).toBe('');
    expect(traducirPais('Reino Unido', 'es')).toBe('Reino Unido');
  });

  it('lugares: aeropuerto y «bajos»; las calles se quedan', () => {
    expect(traducirLugar('Aeropuerto, Palma de Mallorca', 'en')).toBe('Airport, Palma de Mallorca');
    expect(traducirLugar('Cami de son Gotleu, 8 bajos, 07008', 'en')).toBe('Cami de son Gotleu, 8 (ground floor), 07008');
    expect(traducirLugar('Camí de Son Gotleu, 8 bajos', 'en')).toBe('Camí de Son Gotleu, 8 (ground floor)');
    expect(traducirLugar('Hotel Bellver', 'en')).toBe('Hotel Bellver');
    expect(traducirLugar('Aeropuerto, Palma de Mallorca', 'es')).toBe('Aeropuerto, Palma de Mallorca');
    expect(traducirLugar(undefined, 'en')).toBe('');
  });

  it('complementos del catálogo y de la web', () => {
    expect(traducirComplemento('Sillita infantil', 'en')).toBe('Child seat');
    expect(traducirComplemento('Asiento elevador', 'en')).toBe('Booster seat');
    expect(traducirComplemento('Asiento elevador de respaldo alto', 'en')).toBe('High-back booster seat');
    expect(traducirComplemento('Baca coche', 'en')).toBe('Roof rack');
    expect(traducirComplemento('Portabicicletas', 'en')).toBe('Bike rack');
    expect(traducirComplemento('Maxi-Cosi', 'en')).toBe('Maxi-Cosi');
    expect(traducirComplemento('Algo nuevo', 'en')).toBe('Algo nuevo');
    expect(traducirComplemento('Sillita infantil', 'es')).toBe('Sillita infantil');
  });

  it('la nota de baja de la aseguradora', () => {
    expect(traducirAseguradora('Mutua (actualmente de baja)', 'en')).toBe('Mutua (currently inactive)');
    expect(traducirAseguradora('FIATC', 'en')).toBe('FIATC');
    expect(traducirAseguradora('Mutua (actualmente de baja)', 'es')).toBe('Mutua (actualmente de baja)');
  });
});
