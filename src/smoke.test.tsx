// Prueba de humo: dibuja cada pestaña principal con datos de ejemplo completos y comprueba que no
// se rompe ni deja a la vista valores de error (NaN, undefined, Invalid Date, [object Object]).
// Solo cubre lo que se ve nada más abrir cada pestaña; no abre cuadros ni pulsa botones.
import { describe, it, expect, beforeAll, vi } from 'vitest';
import { renderToString } from 'react-dom/server';
import type { ComponentType } from 'react';
import VehiclesTab from './components/VehiclesTab';
import CrmTab from './components/CrmTab';
import RentalsTab from './components/RentalsTab';
import OrdenesTrabajoTab from './components/OrdenesTrabajoTab';
import AgendaTab from './components/AgendaTab';
import FacturasTab from './components/FacturasTab';
import AlertsNotificationsTab from './components/AlertsNotificationsTab';
import AnalyticsTab from './components/AnalyticsTab';
import { formatDate } from './utils/dateFormat';
import type { Vehiculo, Cliente, Reserva, OrdenTrabajo, Factura, Alerta, Cita, Tecnico, SolicitudReserva, InvitacionCliente } from './types';

// El visor del contrato carga la firma de la base de datos: en los tests no hay conexión.
vi.mock('./data/contratosFirmadosDb', () => ({
  fetchContratoFirmado: async () => null,
  guardarContratoFirmado: async () => undefined,
  anularContratoFirmado: async () => undefined,
  fetchFirmasVigentes: async () => ({}),
}));


// Sin navegador: un localStorage mínimo en memoria, que es lo único que las pestañas tocan al dibujarse.
beforeAll(() => {
  const mem = new Map<string, string>();
  (globalThis as unknown as { localStorage: Storage }).localStorage = {
    getItem: k => mem.get(k) ?? null, setItem: (k, v) => { mem.set(k, String(v)); }, removeItem: k => { mem.delete(k); },
    clear: () => mem.clear(), key: i => [...mem.keys()][i] ?? null, get length() { return mem.size; },
  };
});

const veh = (id: string, matricula: string, extra: Partial<Vehiculo> = {}): Vehiculo => ({
  id, marca: 'Seat', modelo: 'Ibiza', anio: 2018, color: 'rojo', combustible: 'diesel', matricula, bastidor: '', kilometraje: 120000,
  itvVencimiento: '2027-03-31', seguroVencimiento: '', impuestoVencimiento: '', fechaRegistro: '2026-10-15',
  esFlotaAlquiler: true, tarifasAlquiler: { temporadaAlta: 44, temporadaMedia: 23, temporadaBaja: 9 }, transmision: 'manual',
  fianza: 500, seguroAmpliadoDia: 15, aseguradora: 'FIATC', ...extra,
});
const vehiculos: Vehiculo[] = [
  veh('v1', '5612HDR'),
  veh('v2', '6349MKV', { marca: 'Citroen', modelo: 'C3', aseguradora: 'Mutua (actualmente de baja)', itvVencimiento: '2025-08-29', kilometraje: 0 }),
  veh('v3', '0145HSB', { marca: 'Peugeot', modelo: '208', seguroAmpliadoDia: null, fianza: 0, aseguradora: undefined }),
  veh('v4', '1234ABC', { marca: 'Ford', modelo: 'Focus', esFlotaAlquiler: false, tarifasAlquiler: undefined, fianza: undefined, transmision: undefined }),
];
const mov = { fechaHora: '2026-10-27T10:00:00.000Z', km: 120100, combustible: 'lleno' as const, danos: '', responsable: 'Daniel' };
const clientes: Cliente[] = [
  { id: 'c1', nombre: 'Ana', apellidos: 'Pérez', nifNiePasaporte: '12345678Z', correo: 'ana@example.com', telefono: '+34600111222', direccion: 'Calle 1', ciudad: 'Palma', pais: 'España',
    esClienteAlquiler: true, carnetNumero: 'ABC12345', carnetExpedicion: '2018-03-01', carnetVencimiento: '2028-03-01', interacciones: [], fechaRegistro: '2026-10-01', vehiculosAsociados: [] },
  { id: 'c2', nombre: 'Luis', apellidos: 'García', nifNiePasaporte: 'X1234567L', correo: '', telefono: '+34600333444', direccion: '', esClienteAlquiler: true,
    carnetVencimiento: '2026-01-01', interacciones: [{ id: 'i1', fecha: '2026-10-02', tipo: 'llamada', notas: 'Llamó' }], fechaRegistro: '2026-10-02', vehiculosAsociados: [] },
  { id: 'c3', nombre: 'Marta', apellidos: 'Ruiz', nifNiePasaporte: '87654321X', correo: 'm@example.com', telefono: '+34600555666', direccion: 'Calle 3', esClienteAlquiler: false,
    interacciones: [], fechaRegistro: '2026-09-20', vehiculosAsociados: ['v4'] },
];
const reserva = (id: string, extra: Partial<Reserva>): Reserva => ({
  id, vehiculoId: 'v1', clienteId: 'c1', fechaInicio: '2026-10-31', fechaFin: '2026-11-02', horaInicio: '10:00', horaFin: '09:30', temporada: 'media', tarifaDiaria: 23,
  totalCobrado: 46, estado: 'confirmada', incluyeSeguroTodoRiesgo: true, fianza: 500, seguroDia: 15, origen: 'manual', ...extra,
});
const reservas: Reserva[] = [
  reserva('r1', {}),
  reserva('r2', { vehiculoId: 'v2', clienteId: 'c2', fechaInicio: '2026-10-27', fechaFin: '2026-11-01', horaInicio: undefined, horaFin: undefined, fianza: undefined, estado: 'cancelada' }),
  reserva('r3', { vehiculoId: 'v3', fechaInicio: '2026-10-20', fechaFin: '2026-10-25', entrega: mov, devolucion: { ...mov, km: 120400 }, fianza: 0 }),
  reserva('r4', { fechaInicio: '2027-06-10', fechaFin: '2027-06-22', horaInicio: '11:00', horaFin: '11:00', origen: 'web' }),
];
const sol = (id: string, extra: Partial<SolicitudReserva>): SolicitudReserva => ({
  id, origen: 'web', referenciaExterna: id.replace('web-', ''), estadoExterno: 'on-hold', estadoGestion: 'pendiente', clienteNombre: 'Pedro', clienteApellidos: 'Sol',
  clienteEmail: 'p@example.com', clienteTelefono: '+34600777888', fechaRecogida: '2026-11-05T10:00', fechaDevolucion: '2026-11-08T10:00', lugarRecogida: 'Aeropuerto', lugarDevolucion: 'Aeropuerto',
  vehiculoNombre: 'Seat Ibiza o similar', vehiculoTotal: 90, extras: [{ nombre: 'Cobertura Plus', cantidad: 1, total: 15 }], descuento: 0, total: 105, pagado: false, ...extra,
} as SolicitudReserva);
const solicitudes: SolicitudReserva[] = [
  sol('web-1', {}),
  sol('web-2', { estadoGestion: 'historica', estadoExterno: 'processing', pagado: true, fechaRecogida: '2026-10-09T10:00', fechaDevolucion: '2026-10-12T10:00' }),
  sol('web-3', { estadoGestion: 'convertida', reservaId: 'r4', clienteId: 'c1' }),
  sol('web-4', { fechaRecogida: null, fechaDevolucion: null, vehiculoNombre: '' }),
];
const linea = (id: string, tipo: 'mano_de_obra' | 'producto') => ({ id, tipo, descripcion: tipo === 'producto' ? 'Filtro' : 'Cambio de aceite', cantidad: 1, precioUnitario: 40, costoUnitario: 20, subtotal: 40 });
const ordenes: OrdenTrabajo[] = [
  { id: 'o1', numero: 'OT-2026-0001', vehiculoId: 'v4', clienteId: 'c3', estado: 'en_reparacion', fechaRecepcion: '2026-10-26', fechaEstimadaEntrega: '2026-10-30', kilometrajeEntrada: 90000,
    descripcionProblema: 'Ruido', tecnicoAsignado: 'Carlos', lineas: [linea('l1', 'mano_de_obra'), linea('l2', 'producto')], subtotal: 80, ivaPct: 21, totalIva: 16.8, total: 96.8,
    fechaActualizacion: '2026-10-27T10:00:00.000Z', historial: [{ fecha: '2026-10-26T09:00:00.000Z', descripcion: 'Recibido' }] },
  { id: 'o2', numero: 'OT-2026-0002', vehiculoId: 'v1', clienteId: 'c1', estado: 'presupuesto', fechaRecepcion: '2026-10-27', kilometrajeEntrada: 0, descripcionProblema: 'Revisión',
    lineas: [], subtotal: 0, ivaPct: 21, totalIva: 0, total: 0, fechaActualizacion: '2026-10-27T11:00:00.000Z', historial: [] },
];
const facturas: Factura[] = [
  { id: 'f1', numero: 'F-2026-0001', clienteId: 'c3', vehiculoId: 'v4', intervencionIds: [], fecha: '2026-10-27', fechaVencimiento: '2026-11-27', estado: 'emitida',
    lineas: [{ id: 'fl1', descripcion: 'Cambio de aceite', cantidad: 1, precioUnitario: 40, subtotal: 40 }], subtotal: 40, ivaPct: 21, totalIva: 8.4, total: 48.4 } as unknown as Factura,
];
const alertas: Alerta[] = [
  { id: 'a1', vehiculoId: 'v2', tipo: 'itv', descripcion: 'ITV vencida', estado: 'activa', fechaLimite: '2025-08-29' },
  { id: 'a2', vehiculoId: 'v1', tipo: 'mantenimiento', descripcion: 'Revisión a 135000 km', estado: 'activa', kilometrajeLimite: 135000 },
] as Alerta[];
const tecnicos: Tecnico[] = [{ id: 't1', nombre: 'Carlos', especialidad: 'Motor', activo: true }];
// Una cita de hoy, que es el día que enseña la Agenda al abrirse: así se prueba que se dibuja.
const citas: Cita[] = [{ id: 'ci1', fechaHora: new Date().toISOString(), duracionMinutos: 60, clienteId: 'c3', vehiculoId: 'v4', motivo: 'Revisión', tecnicoId: 't1', estado: 'pendiente' } as Cita];
const invitaciones: InvitacionCliente[] = [{ id: 'inv1', estado: 'pendiente', expiraEn: '2099-01-01T00:00:00.000Z', creadaEn: '2026-10-27T00:00:00.000Z' }];

const nop = () => {};
const nopAsync = async () => {};
const pestanas: [string, ComponentType<never>, Record<string, unknown>][] = [
  ['Vehículos', VehiclesTab, { vehiculos, ordenesTrabajo: ordenes, hasAlquileres: true, onAddVehiculo: nop, onUpdateVehiculo: nop, onDeleteVehiculo: nop }],
  ['Clientes', CrmTab, { clientes, reservas, vehiculos, ordenesTrabajo: ordenes, facturas, hasAlquileres: true, solicitudes, invitaciones, onCrearInvitacion: async () => 'x',
    onAplicarInvitacion: nopAsync, onCancelarInvitacion: nopAsync, onAddCliente: nop, onUpdateCliente: nop, onDeleteCliente: nop, onAddInteraccion: nop }],
  ['Alquileres', RentalsTab, { reservas, vehiculos, clientes, solicitudes, onAddReserva: nop, onUpdateReserva: nop, onConvertirSolicitud: nopAsync, onDescartarSolicitud: nopAsync, usuarioNombre: 'Daniel' }],
  ['Taller (órdenes)', OrdenesTrabajoTab, { ordenes, vehiculos, clientes, tecnicos, onAdd: nop, onUpdate: nop, onDelete: nop }],
  ['Agenda', AgendaTab, { citas, vehiculos, clientes, tecnicos, ordenes, capacidadTaller: 10, onAddCita: nop, onUpdateCita: nop, onDeleteCita: nop, onCreateOT: nop }],
  ['Facturas', FacturasTab, { facturas, clientes, vehiculos, ordenesTrabajo: ordenes, puedeGestionarFacturas: true, onAddFactura: nop, onUpdateFactura: nop, onDeleteFactura: nop, onUpdateOT: nop }],
  ['Alertas', AlertsNotificationsTab, { alertas, notificaciones: [], clientes, vehiculos, onAddNotificacion: nop, onResolveAlerta: nop, onDeleteNotificacion: nop, onTriggerAutoRenew: nop }],
  ['Rentabilidad', AnalyticsTab, { ordenesTrabajo: ordenes, clientes, reservas, vehiculos }],
];
const colecciones = new Set(['vehiculos', 'clientes', 'reservas', 'solicitudes', 'ordenes', 'ordenesTrabajo', 'facturas', 'alertas', 'notificaciones', 'citas', 'tecnicos', 'invitaciones']);
const ERRORES = [/\bNaN\b/, /\bundefined\b/, /Invalid Date/, /\[object Object\]/, /\bnull\b/];

describe.each(pestanas)('pestaña %s', (_nombre, Comp, props) => {
  const Tab = Comp as unknown as ComponentType<Record<string, unknown>>;
  const textoVisible = (html: string) => html.replace(/<(script|style)[\s\S]*?<\/\1>/g, '').replace(/<[^>]*>/g, ' ');

  it('se dibuja con datos de ejemplo, sin valores de error a la vista', () => {
    const html = renderToString(<Tab {...props} />);
    expect(html.length).toBeGreaterThan(200);
    const texto = textoVisible(html);
    for (const re of ERRORES) expect(texto, `aparece ${re} en la pantalla`).not.toMatch(re);
  });

  it('se dibuja también sin ningún dato', () => {
    const vacios = Object.fromEntries(Object.entries(props).map(([k, v]) => [k, colecciones.has(k) ? [] : v]));
    expect(() => renderToString(<Tab {...vacios} />)).not.toThrow();
  });
});

describe('contenido que no debe perderse', () => {
  const texto = (C: unknown, props: Record<string, unknown>) => {
    const Tab = C as ComponentType<Record<string, unknown>>;
    return renderToString(<Tab {...props} />).replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ');
  };
  const alquileres = pestanas.find(p => p[0] === 'Alquileres')!;

  it('Alquileres muestra la hora de entrega y de devolución de cada reserva', () => {
    const t = texto(alquileres[1], alquileres[2]);
    expect(t).toContain('Entrega 10:00 · Devolución 09:30');
    expect(t).toContain('Entrega 11:00 · Devolución 11:00');
  });

  it('Alquileres lista las activas y próximas de la más cercana a la más lejana', () => {
    const t = texto(alquileres[1], alquileres[2]);
    const cercana = t.indexOf(formatDate('2026-10-31'));
    const lejana = t.indexOf(formatDate('2027-06-10'));
    expect(cercana).toBeGreaterThan(-1);
    expect(lejana).toBeGreaterThan(-1);
    expect(cercana).toBeLessThan(lejana);
  });

  it('Alquileres no muestra como pendiente un pedido web ya convertido en reserva', () => {
    const t = texto(alquileres[1], alquileres[2]);
    expect(t).toContain('Reservas de la web');
  });

  it('Alquileres tiene un buscador por cliente, matrícula, reserva o pedido web', () => {
    const Tab = alquileres[1] as ComponentType<Record<string, unknown>>;
    const html = renderToString(<Tab {...alquileres[2]} />);
    expect(html).toContain('aria-label="Buscar reservas"');
    expect(html).toContain('Buscar por cliente, matrícula, nº de reserva o pedido web');
    expect(html).not.toContain('resultados-busqueda');
  });

  it('Taller y Agenda enseñan el tablero con cada coche que está en el taller', () => {
    for (const nombre of ['Taller', 'Agenda']) {
      const p = pestanas.find(x => x[0].startsWith(nombre))!;
      const t = texto(p[1], p[2]);
      expect(t, nombre).toContain('Estado de cada coche en el taller');
      expect(t, nombre).toContain('En reparación');
    }
  });

  it('Vehículos muestra las matrículas de la flota', () => {
    const v = pestanas.find(p => p[0] === 'Vehículos')!;
    const t = texto(v[1], v[2]);
    for (const m of ['5612HDR', '6349MKV', '0145HSB']) expect(t).toContain(m);
  });
});
