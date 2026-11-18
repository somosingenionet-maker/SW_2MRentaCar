import { describe, it, expect, vi, beforeAll } from 'vitest';
import { renderToString } from 'react-dom/server';
import RentalsTab from './components/RentalsTab';
import { hoyISO, sumarDias } from './utils/fechas';
import type { Cliente, Reserva, Vehiculo } from './types';

// El visor del contrato carga la firma de la base de datos: en los tests no hay conexión.
vi.mock('./data/contratosFirmadosDb', () => ({
  fetchContratoFirmado: async () => null,
  guardarContratoFirmado: async () => undefined,
  anularContratoFirmado: async () => undefined,
  fetchFirmasVigentes: async () => ({}),
}));

// Sin navegador: un localStorage mínimo en memoria, que es lo único que la pestaña toca al dibujarse.
beforeAll(() => {
  const mem = new Map<string, string>();
  (globalThis as unknown as { localStorage: Storage }).localStorage = {
    getItem: (k: string) => mem.get(k) ?? null, setItem: (k: string, v: string) => { mem.set(k, v); }, removeItem: (k: string) => { mem.delete(k); },
    clear: () => mem.clear(), key: () => null, length: 0,
  } as Storage;
});

const nop = () => undefined;
const nopAsync = async () => undefined;
const veh = { id: 'v1', marca: 'Citroën', modelo: 'Berlingo', matricula: '1956LMR', kilometraje: 1, estado: 'disponible', esFlotaAlquiler: true } as unknown as Vehiculo;
const cli = { id: 'c1', nombre: 'Claudia', apellidos: 'Fernández', nifNiePasaporte: 'Y7253595F', correo: '', telefono: '1', direccion: '', esClienteAlquiler: true, interacciones: [], fechaRegistro: '2026-01-01' } as unknown as Cliente;
const hoy = hoyISO();
const reserva = (id: string, extra: Partial<Reserva> = {}) => ({
  id, vehiculoId: 'v1', clienteId: 'c1', fechaInicio: sumarDias(hoy, -2), fechaFin: sumarDias(hoy, 10), horaInicio: '10:30', horaFin: '10:30', temporada: 'alta',
  tarifaDiaria: 16, totalCobrado: 600, estado: 'confirmada', incluyeSeguroTodoRiesgo: false, origen: 'manual', ...extra,
}) as Reserva;
const pinta = (reservas: Reserva[]) => renderToString(
  <RentalsTab reservas={reservas} vehiculos={[veh]} clientes={[cli]} solicitudes={[]} onAddReserva={nop} onUpdateReserva={nop} onConvertirSolicitud={nopAsync} onDescartarSolicitud={nopAsync} />,
);

describe('etiqueta EXTRAS en la lista de reservas', () => {
  it('sale en las reservas con días añadidos, con el detalle al pasar el ratón', () => {
    const h = pinta([reserva('res-a', { ampliacion: { diasBase: 30, totalBase: 500, extras: [{ dias: 7, importe: 100, hasta: sumarDias(hoy, 10), modo: 'cerrado' }] } })]);
    expect(h.match(/data-testid="etiqueta-extras"/g)).toHaveLength(1);
    expect(h).toContain('Extras');
    expect(h).toContain('Se ampliaron 7 días: 500,00 € la reserva inicial + 100,00 € de extras');
  });
  it('suma los días de varias ampliaciones', () => {
    const h = pinta([reserva('res-a', { totalCobrado: 650, ampliacion: { diasBase: 30, totalBase: 500, extras: [{ dias: 7, importe: 100, hasta: 'x' }, { dias: 1, importe: 50, hasta: 'y' }] } })]);
    expect(h).toContain('Se ampliaron 8 días');
  });
  it('no sale en las reservas que nunca se ampliaron ni con una ampliación vacía', () => {
    expect(pinta([reserva('res-a')])).not.toContain('etiqueta-extras');
    expect(pinta([reserva('res-a', { ampliacion: null })])).not.toContain('etiqueta-extras');
    expect(pinta([reserva('res-a', { ampliacion: { diasBase: 3, totalBase: 1, extras: [] } })])).not.toContain('etiqueta-extras');
  });
  it('solo la lleva la reserva ampliada cuando hay varias', () => {
    const h = pinta([reserva('res-a'), reserva('res-b', { ampliacion: { diasBase: 30, totalBase: 500, extras: [{ dias: 7, importe: 100, hasta: 'x' }] } })]);
    expect(h.match(/data-testid="etiqueta-extras"/g)).toHaveLength(1);
  });
});
