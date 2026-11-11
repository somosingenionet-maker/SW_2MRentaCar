import { describe, it, expect } from 'vitest';
import { renderToString } from 'react-dom/server';
import AlertsNotificationsTab from './components/AlertsNotificationsTab';
import { hoyISO, sumarDias } from './utils/fechas';
import type { Alerta, Cliente, OrdenTrabajo, Vehiculo } from './types';

const hoy = hoyISO();
const nop = () => undefined;
const vehiculos = [
  { id: 'v1', marca: 'Seat', modelo: 'Ibiza', matricula: '1234ABC', aceiteProximaFecha: sumarDias(hoy, 9) },
  { id: 'v2', marca: 'Fiat', modelo: 'Panda', matricula: '9999FLO', aceiteProximaFecha: sumarDias(hoy, 5) },
] as unknown as Vehiculo[];
const clientes = [{ id: 'c1', nombre: 'Ana', apellidos: 'Pérez', correo: 'ana@x.es', telefono: '644095097', interacciones: [] }] as unknown as Cliente[];
const ordenes = [{ id: 'ot1', numero: 'OT-1', vehiculoId: 'v1', clienteId: 'c1', estado: 'entregado', fechaRecepcion: '2025-01-01', fechaActualizacion: '2025-01-02T00:00:00Z', lineas: [], historial: [] }] as unknown as OrdenTrabajo[];
const alertas = [
  { id: 'a1', vehiculoId: 'v1', tipo: 'itv', descripcion: 'ITV v1', estado: 'activa', fechaLimite: sumarDias(hoy, -3) },
  { id: 'a2', vehiculoId: 'v1', tipo: 'aceite', descripcion: 'Aceite v1', estado: 'activa', fechaLimite: sumarDias(hoy, 9) },
  { id: 'a3', vehiculoId: 'v2', tipo: 'aceite', descripcion: 'Aceite v2', estado: 'activa', fechaLimite: sumarDias(hoy, 5) },
  { id: 'a4', vehiculoId: 'v1', tipo: 'mantenimiento', descripcion: 'Revisión antigua', estado: 'activa', kilometrajeLimite: 15000 },
] as unknown as Alerta[];
const pinta = (o: Partial<Parameters<typeof AlertsNotificationsTab>[0]> = {}) => renderToString(
  <AlertsNotificationsTab alertas={alertas} notificaciones={[]} clientes={clientes} vehiculos={vehiculos} ordenesTrabajo={ordenes} onAddNotificacion={nop} onDeleteNotificacion={nop} onTriggerAutoRenew={nop} {...o} />,
);
const texto = (h: string) => h.replace(/<[^>]*>/g, ' ').replace(/&#x27;/g, "'").replace(/\s+/g, ' ');

describe('pestaña de Alertas', () => {
  it('agrupa por urgencia y no enseña las alertas antiguas de mantenimiento ni el filtro', () => {
    const t = texto(pinta());
    expect(t).toMatch(/Vencidas\s*1/);
    expect(t).toMatch(/Vencen en 14 días\s*2/);
    expect(t).toContain('Vencida hace 3 días');
    expect(t).toContain('Vence en 9 días');
    expect(t).not.toContain('Revisión antigua');
    expect(t).not.toMatch(/Mantenimiento/i);
    expect(t).toContain('Cambio de aceite');
  });
  it('un coche sin cliente es flota propia: control interno, sin aviso', () => {
    const t = texto(pinta());
    expect(t).toContain('Flota propia: control interno, no se avisa a ningún cliente');
    expect(t).toContain('Cliente: Ana Pérez');
  });
  it('«Toca avisar» lista el recordatorio del cliente con WhatsApp y correo, y nada de la flota', () => {
    const h = pinta();
    expect(h.match(/data-testid="aviso-pendiente"/g)).toHaveLength(1);
    const t = texto(h);
    expect(t).toContain('Recordatorio Ana Pérez');
    expect(t).toContain('WhatsApp');
    expect(t).toContain('Correo');
    expect(t).toContain('No avisar');
  });
  it('un aviso ya registrado no vuelve a salir', () => {
    const h = pinta({ notificaciones: [{ id: 'n', clienteId: 'c1', vehiculoId: 'v1', tipoEnvio: 'whatsapp', mensaje: 'x', fechaEnvio: `${hoy} 10:00`, leido: false, tipoEvento: 'aceite_recordatorio', referencia: sumarDias(hoy, 9) }] });
    expect(h).not.toContain('data-testid="aviso-pendiente"');
    expect(texto(h)).toContain('No hay avisos pendientes hoy');
    expect(texto(h)).toContain('último aviso: Recordatorio de aceite por WhatsApp');
  });
  it('un cliente sin teléfono ni correo no puede recibir el aviso por esos canales', () => {
    const h = pinta({ clientes: [{ ...clientes[0], telefono: '', correo: '' }] });
    const t = texto(h);
    expect(t).toContain('Sin teléfono');
    expect(t).toContain('Sin correo');
  });
  it('el aviso manual ofrece WhatsApp y correo, no SMS', () => {
    const t = texto(pinta());
    expect(t).toContain('Abrir WhatsApp');
    expect(t).toContain('Abrir correo');
    expect(t).not.toMatch(/\bsms\b/i);
  });
});
