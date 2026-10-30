import { describe, it, expect } from 'vitest';
import { jsonCanonico, crearSnapshot, calcularHuella, integridadCorrecta, referenciaCorta, cambiosTrasFirma, firmaSuficiente } from './firmaContrato';
import type { Cliente, ContratoFirmado, Reserva, SolicitudReserva, Vehiculo } from '../types';

const empresa = { nombre: '2M Rent a Car', razonSocial: 'Two M Rent a Car SL', nif: 'B13712658', direccionFiscal: 'Camí', ciudad: 'Palma', pais: 'España', telefono: '1', logoBase64: 'NO-DEBE-GUARDARSE', brandColor: '#fff' };
const cliente = { id: 'c1', nombre: 'Ana', apellidos: 'Pérez', nifNiePasaporte: '1Z', correo: 'a@b.c', telefono: '6', direccion: 'Calle', carnetNumero: 'ABC', interacciones: [{ id: 'i', notas: 'secreto interno' }], vehiculosAsociados: ['v9'] } as unknown as Cliente;
const vehiculo = { id: 'v1', marca: 'Seat', modelo: 'Ibiza', matricula: '5612HDR', bastidor: 'VF3', kilometraje: 100, transmision: 'manual', itvVencimiento: '2027-01-01', seguroVencimiento: '2027-01-01' } as Vehiculo;
const reserva = { id: 'res-1', vehiculoId: 'v1', clienteId: 'c1', fechaInicio: '2026-10-31', fechaFin: '2026-11-02', horaInicio: '10:00', horaFin: '09:30', temporada: 'media', tarifaDiaria: 23, totalCobrado: 76, estado: 'confirmada', incluyeSeguroTodoRiesgo: true, fianza: 500, seguroDia: 15 } as Reserva;
const solicitud = { referenciaExterna: '4821', lugarRecogida: 'Aeropuerto', lugarDevolucion: 'Oficina', estadoExterno: 'x' } as SolicitudReserva;

const firmar = async (): Promise<ContratoFirmado> => {
  const base = { contrato: crearSnapshot(reserva, cliente, vehiculo, solicitud, empresa), idioma: 'es' as const, firmaPng: 'data:image/png;base64,AAAA', firmadoEn: '2026-10-30T13:05:00.000Z' };
  return { id: 'f1', reservaId: 'res-1', ...base, huella: await calcularHuella(base) };
};

describe('jsonCanonico', () => {
  it('no depende del orden de las claves ni de los undefined', () => {
    expect(jsonCanonico({ b: 1, a: { d: [1, 2], c: undefined } })).toBe(jsonCanonico({ a: { c: undefined, d: [1, 2] }, b: 1 }));
    expect(jsonCanonico({ a: 1, b: undefined })).toBe('{"a":1}');
  });
  it('distingue valores distintos', () => {
    expect(jsonCanonico({ a: 1 })).not.toBe(jsonCanonico({ a: 2 }));
    expect(jsonCanonico([1, 2])).not.toBe(jsonCanonico([2, 1]));
  });
});

describe('crearSnapshot', () => {
  const snap = crearSnapshot(reserva, cliente, vehiculo, solicitud, empresa);

  it('guarda lo que usa el contrato y deja fuera lo interno', () => {
    const texto = JSON.stringify(snap);
    expect(texto).not.toContain('secreto interno');
    expect(texto).not.toContain('NO-DEBE-GUARDARSE');
    expect(texto).not.toContain('vehiculosAsociados');
    expect(snap.cliente?.nombre).toBe('Ana');
    expect(snap.vehiculo?.matricula).toBe('5612HDR');
    expect(snap.empresa.razonSocial).toBe('Two M Rent a Car SL');
    expect(snap.solicitud?.referenciaExterna).toBe('4821');
  });

  it('congela el lugar: si la reserva no lo tiene, guarda el del pedido web', () => {
    expect(snap.reserva.lugarRecogida).toBe('Aeropuerto');
    expect(snap.reserva.lugarDevolucion).toBe('Oficina');
  });

  it('es idéntico tras pasar por JSON (como en la base de datos)', () => {
    expect(JSON.parse(JSON.stringify(snap))).toEqual(snap);
  });

  it('sin cliente, coche ni pedido web guarda null', () => {
    const s = crearSnapshot(reserva, undefined, undefined, undefined, empresa);
    expect(s.cliente).toBeNull();
    expect(s.vehiculo).toBeNull();
    expect(s.solicitud).toBeNull();
  });
});

describe('huella e integridad', () => {
  it('es un SHA-256 en hexadecimal y mayúsculas, estable', async () => {
    const f = await firmar();
    expect(f.huella).toMatch(/^[0-9A-F]{64}$/);
    expect((await firmar()).huella).toBe(f.huella);
    expect(referenciaCorta(f.huella)).toHaveLength(8);
  });

  it('se verifica igual aunque la base de datos reordene las claves', async () => {
    const f = await firmar();
    const releido = JSON.parse(jsonCanonico(f)) as ContratoFirmado;
    expect(await integridadCorrecta(releido)).toBe(true);
  });

  it('detecta cualquier cambio: importe, firma, idioma o fecha', async () => {
    const f = await firmar();
    expect(await integridadCorrecta({ ...f, contrato: { ...f.contrato, reserva: { ...f.contrato.reserva, totalCobrado: 1 } } })).toBe(false);
    expect(await integridadCorrecta({ ...f, firmaPng: 'data:image/png;base64,BBBB' })).toBe(false);
    expect(await integridadCorrecta({ ...f, idioma: 'en' })).toBe(false);
    expect(await integridadCorrecta({ ...f, firmadoEn: '2026-10-30T13:06:00.000Z' })).toBe(false);
  });

  it('la fecha cuenta igual escrita con Z o con +00:00', async () => {
    const f = await firmar();
    expect(await integridadCorrecta({ ...f, firmadoEn: '2026-10-30T13:05:00+00:00' })).toBe(true);
  });
});

describe('cambiosTrasFirma', () => {
  const f = crearSnapshot(reserva, cliente, vehiculo, solicitud, empresa);

  it('sin cambios no avisa de nada (el lugar del pedido web cuenta como el de la reserva)', () => {
    expect(cambiosTrasFirma(f, reserva, solicitud)).toEqual([]);
  });

  it('lista lo que cambió', () => {
    const r = { ...reserva, fechaFin: '2026-11-05', horaInicio: '12:00', totalCobrado: 90, fianza: 300, lugarRecogida: 'Hotel', vehiculoId: 'v2' };
    expect(cambiosTrasFirma(f, r, solicitud)).toEqual(['el vehículo', 'las fechas', 'las horas', 'los lugares', 'el importe', 'la fianza']);
  });
});

describe('firmaSuficiente', () => {
  const trazo = (n: number, paso: number): { x: number; y: number }[] => Array.from({ length: n }, (_, i) => ({ x: i * paso, y: 0.1 }));
  it('rechaza un toque suelto o una raya diminuta', () => {
    expect(firmaSuficiente([])).toBe(false);
    expect(firmaSuficiente([[{ x: 0.5, y: 0.5 }]])).toBe(false);
    expect(firmaSuficiente([trazo(20, 0.001)])).toBe(false);
    expect(firmaSuficiente([trazo(4, 0.2)])).toBe(false); // recorrido largo pero con muy pocos puntos: dos toques, no una firma
  });
  it('acepta un trazo con recorrido, también repartido en varios', () => {
    expect(firmaSuficiente([trazo(30, 0.02)])).toBe(true);
    expect(firmaSuficiente([trazo(8, 0.03), trazo(8, 0.03)])).toBe(true);
  });
});
