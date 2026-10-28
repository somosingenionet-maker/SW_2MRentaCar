import { describe, it, expect } from 'vitest';
import { validarCarnet, estadoCarnet, resumenCarnet, avisoCarnetReserva, DIAS_AVISO_CARNET } from './carnet';

const HOY = '2026-10-28';

describe('validarCarnet', () => {
  it('acepta un carnet correcto o sin ningún dato', () => {
    expect(validarCarnet({ carnetExpedicion: '2018-03-01', carnetVencimiento: '2028-03-01' }, HOY)).toBeNull();
    expect(validarCarnet({}, HOY)).toBeNull();
  });

  it('acepta rellenar solo una de las dos fechas', () => {
    expect(validarCarnet({ carnetVencimiento: '2030-01-01' }, HOY)).toBeNull();
    expect(validarCarnet({ carnetExpedicion: '2020-01-01' }, HOY)).toBeNull();
  });

  it('no deja un vencimiento anterior a la expedición', () => {
    expect(validarCarnet({ carnetExpedicion: '2020-05-01', carnetVencimiento: '2019-05-01' }, HOY)).toMatch(/anterior/);
  });

  it('acepta que expedición y vencimiento sean el mismo día', () => {
    expect(validarCarnet({ carnetExpedicion: '2020-05-01', carnetVencimiento: '2020-05-01' }, HOY)).toBeNull();
  });

  it('no deja una expedición futura', () => {
    expect(validarCarnet({ carnetExpedicion: '2026-10-29' }, HOY)).toMatch(/futura/);
    expect(validarCarnet({ carnetExpedicion: HOY }, HOY)).toBeNull();
  });
});

describe('estadoCarnet', () => {
  it('sin fecha, no hay dato', () => {
    expect(estadoCarnet(undefined, HOY)).toBe('sin_dato');
    expect(estadoCarnet('', HOY)).toBe('sin_dato');
  });

  it('vencido el día después; el propio día de vencimiento aún vale', () => {
    expect(estadoCarnet('2026-10-27', HOY)).toBe('vencido');
    expect(estadoCarnet(HOY, HOY)).toBe('por_vencer');
  });

  it('vence pronto dentro de la ventana de aviso, vigente después', () => {
    expect(DIAS_AVISO_CARNET).toBe(60);
    expect(estadoCarnet('2026-12-27', HOY)).toBe('por_vencer'); // justo 60 días
    expect(estadoCarnet('2026-12-28', HOY)).toBe('vigente');
  });
});

describe('resumenCarnet', () => {
  const fmt = (iso: string) => iso.split('-').reverse().join('/');

  it('junta número y fechas', () => {
    expect(resumenCarnet({ carnetNumero: ' 12345678 ', carnetExpedicion: '2020-03-01', carnetVencimiento: '2030-03-01' }, fmt))
      .toBe('12345678 · expedido 01/03/2020 · vence 01/03/2030');
  });

  it('omite lo que falta', () => {
    expect(resumenCarnet({ carnetVencimiento: '2030-03-01' }, fmt)).toBe('vence 01/03/2030');
    expect(resumenCarnet({}, fmt)).toBe('');
  });
});

describe('avisoCarnetReserva', () => {
  const fmt = (iso: string) => iso.split('-').reverse().join('/');
  const aviso = (d: Parameters<typeof avisoCarnetReserva>[0], fin = '2026-11-05') => avisoCarnetReserva(d, fin, fmt, HOY);

  it('no avisa si no hay cliente elegido', () => {
    expect(aviso(null)).toBeNull();
  });

  it('no avisa si el carnet vale durante todo el alquiler, incluido el último día', () => {
    expect(aviso({ carnetNumero: 'X1', carnetVencimiento: '2030-01-01' })).toBeNull();
    expect(aviso({ carnetNumero: 'X1', carnetVencimiento: '2026-11-05' })).toBeNull();
  });

  it('aviso crítico si ya está vencido', () => {
    const a = aviso({ carnetNumero: 'X1', carnetVencimiento: '2026-10-01' });
    expect(a?.nivel).toBe('critico');
    expect(a?.texto).toMatch(/venció el 01\/10\/2026/);
  });

  it('aviso crítico si vence antes de terminar el alquiler', () => {
    const a = aviso({ carnetNumero: 'X1', carnetVencimiento: '2026-11-02' });
    expect(a?.nivel).toBe('critico');
    expect(a?.texto).toMatch(/vence el 02\/11\/2026.*05\/11\/2026/);
  });

  it('aviso suave si faltan los datos', () => {
    expect(aviso({})?.nivel).toBe('aviso');
    expect(aviso({})?.texto).toMatch(/No hay datos del carnet/);
    expect(aviso({ carnetNumero: 'X1' })?.texto).toMatch(/fecha de vencimiento/);
  });
});
