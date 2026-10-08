import React, { lazy, Suspense, useState, useEffect, useMemo, useCallback } from 'react';
import { contrastText } from './utils/color';
import { genId } from './utils/id';
import { Vehiculo, Cliente, Reserva, Alerta, NotificacionCliente, InteraccionCliente, AlertaTipo, Usuario, Factura, ModuloId, OrdenTrabajo, Tecnico, Cita, SolicitudReserva, InvitacionCliente } from './types';
import { getSessionUsuario, signOut } from './lib/auth';
import { supabase } from './lib/supabase';
import LoginScreenReset from './components/ResetPasswordScreen';
import { fetchVehiculos, upsertVehiculo, deleteVehiculoDb } from './data/vehiculosDb';
import { fetchAll, upsertOne, deleteOne } from './data/db';
import { sinClienteFlota } from './utils/flota';
import { fetchSolicitudes, updateGestionSolicitud } from './data/solicitudesDb';
import { fetchInvitaciones, crearInvitacion, updateEstadoInvitacion } from './data/invitacionesDb';
import LoginScreen from './components/LoginScreen';
import {
  Car, Wrench, Users, Calendar, CalendarClock, BarChart2, Bell, Shield, Phone, Mail, Globe, Menu, X, Settings, FileText, LogOut
} from 'lucide-react';
import { EmpresaConfig, getEmpresaConfig } from './data/empresaConfig';
import { loadEmpresaConfig, saveEmpresaConfigDb } from './data/empresaDb';

// Cada pestaña se descarga solo cuando se abre: el primer arranque (sobre todo
// en el móvil) carga mucho menos código que con todo en un único archivo.
const VehiclesTab = lazy(() => import('./components/VehiclesTab'));
const OrdenesTrabajoTab = lazy(() => import('./components/OrdenesTrabajoTab'));
const CrmTab = lazy(() => import('./components/CrmTab'));
const RentalsTab = lazy(() => import('./components/RentalsTab'));
const AnalyticsTab = lazy(() => import('./components/AnalyticsTab'));
const AlertsNotificationsTab = lazy(() => import('./components/AlertsNotificationsTab'));
const FacturasTab = lazy(() => import('./components/FacturasTab'));
const AgendaTab = lazy(() => import('./components/AgendaTab'));
const AdminPanel = lazy(() => import('./components/AdminPanel'));
const CompanySettingsPanel = lazy(() => import('./components/CompanySettingsPanel'));

type TabId = ModuloId;

export default function App() {
  // Auth state
  const [currentUser, setCurrentUser] = useState<Usuario | null>(null);
  const [authChecked, setAuthChecked] = useState(false);
  const [passwordRecovery, setPasswordRecovery] = useState(false);

  // Navigation
  const [activeTab, setActiveTab] = useState<TabId>('vehiculos');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [adminPanelOpen, setAdminPanelOpen] = useState(false);
  const [empresaConfig, setEmpresaConfig] = useState<EmpresaConfig>(getEmpresaConfig);

  // States
  const [vehiculos, setVehiculos] = useState<Vehiculo[]>([]);
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [reservas, setReservas] = useState<Reserva[]>([]);
  const [alertas, setAlertas] = useState<Alerta[]>([]);
  const [notificaciones, setNotificaciones] = useState<NotificacionCliente[]>([]);
  const [facturas, setFacturas] = useState<Factura[]>([]);
  const [ordenesTrabajo, setOrdenesTrabajo] = useState<OrdenTrabajo[]>([]);
  const [tecnicos, setTecnicos] = useState<Tecnico[]>([]);
  const [citas, setCitas] = useState<Cita[]>([]);
  const [solicitudes, setSolicitudes] = useState<SolicitudReserva[]>([]);
  const [invitaciones, setInvitaciones] = useState<InvitacionCliente[]>([]);

  // Check session on mount (Supabase)
  useEffect(() => {
    getSessionUsuario()
      .then(user => setCurrentUser(user))
      .catch(err => { console.error('Error comprobando la sesión', err); setCurrentUser(null); })
      .finally(() => setAuthChecked(true));
  }, []);

  // Detecta el enlace de restablecimiento de contraseña (email → app).
  useEffect(() => {
    const { data } = supabase.auth.onAuthStateChange(event => {
      if (event === 'PASSWORD_RECOVERY') setPasswordRecovery(true);
    });
    return () => data.subscription.unsubscribe();
  }, []);

  // Lista de clientes sin el cliente interno de la flota propia (ver flota.ts).
  const cargarClientes = useCallback(
    () => fetchAll<Cliente>('clientes').then(sinClienteFlota), []);

  // Todas las entidades se cargan desde Supabase al iniciar sesión
  // (requiere estar autenticado: las reglas RLS exigen sesión válida).
  // También se usa para volver al estado real cuando un guardado falla.
  const cargarTodo = useCallback(() => {
    const log = (e: string) => (err: unknown) => console.error(`Error cargando ${e}`, err);
    fetchVehiculos().then(setVehiculos).catch(log('vehículos'));
    cargarClientes().then(setClientes).catch(log('clientes'));
    fetchAll<Reserva>('reservas').then(setReservas).catch(log('reservas'));
    fetchAll<Alerta>('alertas').then(setAlertas).catch(log('alertas'));
    fetchAll<NotificacionCliente>('notificaciones').then(setNotificaciones).catch(log('notificaciones'));
    fetchAll<Factura>('facturas').then(setFacturas).catch(log('facturas'));
    fetchAll<OrdenTrabajo>('ordenes_trabajo').then(setOrdenesTrabajo).catch(log('órdenes de trabajo'));
    fetchAll<Tecnico>('tecnicos').then(setTecnicos).catch(log('técnicos'));
    fetchAll<Cita>('citas').then(setCitas).catch(log('citas'));
    fetchSolicitudes().then(setSolicitudes).catch(log('solicitudes de reserva'));
    fetchInvitaciones().then(setInvitaciones).catch(log('invitaciones de clientes'));
    loadEmpresaConfig().then(setEmpresaConfig).catch(log('configuración de empresa'));
  }, [cargarClientes]);

  useEffect(() => {
    if (!currentUser) {
      setVehiculos([]); setClientes([]); setReservas([]);
      setAlertas([]); setNotificaciones([]); setFacturas([]); setOrdenesTrabajo([]); setTecnicos([]); setCitas([]); setSolicitudes([]); setInvitaciones([]);
      return;
    }
    cargarTodo();
  }, [currentUser, cargarTodo]);

  // Los cambios se pintan al instante y se guardan en segundo plano. Si el
  // guardado falla (sesión caducada, permiso, restricción de la base de datos),
  // se avisa con un mensaje visible y se recarga lo que hay guardado de verdad:
  // así la pantalla nunca enseña como guardado algo que no lo está.
  const [errorGuardado, setErrorGuardado] = useState<string | null>(null);
  const fallo = useCallback((accion: string) => (err: unknown) => {
    console.error(`Error al ${accion}`, err);
    setErrorGuardado(`No se pudo ${accion}. Se ha restaurado la información guardada. Si vuelve a ocurrir, avisa a soporte.`);
    cargarTodo();
  }, [cargarTodo]);

  // Solicitudes de la web en tiempo real: cuando entra o cambia un pedido, se
  // recarga la bandeja (es una tabla pequeña, no merece la pena parchear fila a fila).
  useEffect(() => {
    if (!currentUser) return;
    const recargar = () => {
      fetchSolicitudes().then(setSolicitudes).catch(err => console.error('Error recargando solicitudes', err));
      // La función de la web también da de alta al cliente: se recarga para que aparezca en Clientes.
      cargarClientes().then(setClientes).catch(err => console.error('Error recargando clientes', err));
    };
    const canal = supabase
      .channel('solicitudes-reserva')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'solicitudes_reserva' }, recargar)
      .subscribe();
    const recargarInv = () => {
      fetchInvitaciones().then(setInvitaciones).catch(err => console.error('Error recargando invitaciones', err));
    };
    const canalInv = supabase
      .channel('invitaciones-cliente')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'invitaciones_cliente' }, recargarInv)
      .subscribe();
    return () => { void supabase.removeChannel(canal); void supabase.removeChannel(canalInv); };
  }, [currentUser, cargarClientes]);

  // Set default tab based on user modules
  useEffect(() => {
    if (currentUser) {
      const mods = currentUser.modulos;
      if (mods.length > 0 && !mods.includes(activeTab as ModuloId)) {
        setActiveTab(mods[0]);
      }
    }
  }, [currentUser]);

  const handleLogin = useCallback((user: Usuario) => {
    setCurrentUser(user);
    const mods = user.modulos;
    if (mods.length > 0) setActiveTab(mods[0]);
  }, []);

  const handleLogout = useCallback(() => {
    signOut().catch(err => console.error('Error cerrando sesión', err));
    setCurrentUser(null);
  }, []);

  // Active modules computed from user
  const activeModulos = useMemo(() => currentUser?.modulos ?? [], [currentUser]);

  // Sync utilities
  const handleAddVehiculo = useCallback((nuevo: Vehiculo) => {
    setVehiculos(prev => [...prev, nuevo]);
    // Las alertas (itv/seguro/impuesto/mantenimiento) las crea solo un
    // trigger en Supabase al insertar el vehículo — ver supabase/schema.sql.
    // Se recargan tras confirmar el insert para que aparezcan ya en pantalla.
    upsertVehiculo(nuevo)
      .then(() => fetchAll<Alerta>('alertas').then(setAlertas))
      .catch(fallo('guardar el vehículo'));
  }, [fallo]);

  const handleUpdateVehiculo = useCallback((editado: Vehiculo): Promise<void> => {
    setVehiculos(prev => prev.map(v => v.id === editado.id ? editado : v));
    return upsertVehiculo(editado).catch(fallo('actualizar el vehículo'));
  }, [fallo]);

  const handleDeleteVehiculo = useCallback((id: string) => {
    setVehiculos(prev => prev.filter(v => v.id !== id));
    deleteVehiculoDb(id).catch(fallo('eliminar el vehículo'));
  }, [fallo]);

  const handleAddCliente = useCallback((nuevo: Cliente) => {
    setClientes(prev => [...prev, nuevo]);
    upsertOne('clientes', nuevo).catch(fallo('guardar el cliente'));
  }, [fallo]);

  const handleUpdateCliente = useCallback((editado: Cliente) => {
    setClientes(prev => prev.map(c => c.id === editado.id ? editado : c));
    upsertOne('clientes', editado).catch(fallo('actualizar el cliente'));
  }, [fallo]);

  const handleDeleteCliente = useCallback((id: string) => {
    setClientes(prev => prev.filter(c => c.id !== id));
    deleteOne('clientes', id).catch(fallo('eliminar el cliente'));
  }, [fallo]);

  const handleAddReserva = useCallback((nueva: Reserva) => {
    setReservas(prev => [...prev, nueva]);
    upsertOne('reservas', nueva).catch(fallo('guardar la reserva'));

    const targetCli = clientes.find(c => c.id === nueva.clienteId);
    const targetVeh = vehiculos.find(v => v.id === nueva.vehiculoId);
    if (targetCli && targetVeh) {
      const nuevaInteraccion: InteraccionCliente = {
        id: genId('int-cli-aut-res'),
        fecha: new Date().toISOString().split('T')[0],
        tipo: 'registro_contrato',
        notas: `Reserva de alquiler registrada del coche (${targetVeh.marca} con matrícula ${targetVeh.matricula}). Rango: ${nueva.fechaInicio} al ${nueva.fechaFin}. Liquidado total: ${nueva.totalCobrado.toFixed(2)} €.`
      };
      const updatedCli = { ...targetCli, interacciones: [nuevaInteraccion, ...targetCli.interacciones] };
      handleUpdateCliente(updatedCli);
    }
  }, [clientes, vehiculos, handleUpdateCliente, fallo]);

  const handleUpdateReserva = useCallback((editada: Reserva) => {
    setReservas(prev => prev.map(r => r.id === editada.id ? editada : r));
    upsertOne('reservas', editada).catch(fallo('actualizar la reserva'));
  }, [fallo]);

  // Convierte una solicitud de la web en reserva real. Se encadena en orden
  // (cliente → reserva → solicitud) y se espera cada paso: la reserva tiene
  // clave foránea al cliente, y si algo falla debe verse en pantalla en vez de
  // quedar a medias en silencio.
  const handleConvertirSolicitud = useCallback(async (
    sol: SolicitudReserva, reserva: Reserva, clienteNuevo: Cliente | null,
  ) => {
    const veh = vehiculos.find(v => v.id === reserva.vehiculoId);
    const interaccion: InteraccionCliente = {
      id: genId('int-cli-aut-res'),
      fecha: new Date().toISOString().split('T')[0],
      tipo: 'registro_contrato',
      notas: `Reserva recibida por la web y asignada al coche ${veh ? `${veh.marca} ${veh.modelo} (${veh.matricula})` : ''}. Rango: ${reserva.fechaInicio} al ${reserva.fechaFin}. Total: ${reserva.totalCobrado.toFixed(2)} €.`,
    };
    const existente = clienteNuevo ? null : clientes.find(c => c.id === reserva.clienteId) ?? null;
    // Si la web ya trajo el documento y la ficha existente lo tiene vacío, se completa.
    const documento = existente && !existente.nifNiePasaporte && sol.clienteDocumento ? sol.clienteDocumento : null;
    const cliente: Cliente | null = clienteNuevo
      ? { ...clienteNuevo, interacciones: [interaccion] }
      : existente
        ? { ...existente, nifNiePasaporte: documento ?? existente.nifNiePasaporte, interacciones: [interaccion, ...existente.interacciones] }
        : null;

    if (cliente) {
      await upsertOne('clientes', cliente);
      setClientes(prev => prev.some(c => c.id === cliente.id) ? prev.map(c => c.id === cliente.id ? cliente : c) : [...prev, cliente]);
    }
    await upsertOne('reservas', reserva);
    setReservas(prev => [...prev, reserva]);
    await updateGestionSolicitud(sol.id, { estadoGestion: 'convertida', clienteId: reserva.clienteId, reservaId: reserva.id });
    setSolicitudes(prev => prev.map(s => s.id === sol.id
      ? { ...s, estadoGestion: 'convertida', clienteId: reserva.clienteId, reservaId: reserva.id } : s));
  }, [clientes, vehiculos]);

  // Autorregistro de clientes: el enlace lleva un token de un solo uso que solo
  // existe en el valor devuelto aquí (la base de datos guarda su hash).
  const handleCrearInvitacion = useCallback(async (clienteId: string | null, idioma: 'es' | 'en') => {
    const { invitacion, token } = await crearInvitacion(genId('inv'), clienteId);
    setInvitaciones(prev => [...prev, invitacion]);
    return `${window.location.origin}/?registro=${token}&lang=${idioma}`;
  }, []);

  // Aplica lo que el cliente envió: actualiza su ficha, o crea una nueva si el
  // enlace era para una persona sin ficha. Va en orden y esperando cada paso.
  const handleAplicarInvitacion = useCallback(async (inv: InvitacionCliente) => {
    const d = inv.datos;
    if (!d) throw new Error('La invitación no tiene datos');
    const existente = inv.clienteId ? clientes.find(c => c.id === inv.clienteId) : undefined;
    const campos = {
      nombre: d.nombre, apellidos: d.apellidos, nifNiePasaporte: d.documento, correo: d.correo,
      telefono: d.telefono, direccion: d.direccion, ciudad: d.ciudad, pais: d.pais,
    };
    const cliente: Cliente = existente
      ? { ...existente, ...campos }
      : {
          id: genId('cli'), ...campos, esClienteAlquiler: true, interacciones: [],
          fechaRegistro: new Date().toISOString().split('T')[0], vehiculosAsociados: [],
        };
    await upsertOne('clientes', cliente);
    setClientes(prev => prev.some(c => c.id === cliente.id) ? prev.map(c => c.id === cliente.id ? cliente : c) : [...prev, cliente]);
    await updateEstadoInvitacion(inv.id, 'aplicada');
    setInvitaciones(prev => prev.map(i => i.id === inv.id ? { ...i, estado: 'aplicada' } : i));
  }, [clientes]);

  // Anula un enlace pendiente o descarta lo recibido sin aplicarlo.
  const handleCancelarInvitacion = useCallback(async (inv: InvitacionCliente) => {
    await updateEstadoInvitacion(inv.id, 'cancelada');
    setInvitaciones(prev => prev.map(i => i.id === inv.id ? { ...i, estado: 'cancelada' } : i));
  }, []);

  const handleDescartarSolicitud = useCallback(async (sol: SolicitudReserva) => {
    await updateGestionSolicitud(sol.id, { estadoGestion: 'descartada' });
    setSolicitudes(prev => prev.map(s => s.id === sol.id ? { ...s, estadoGestion: 'descartada' } : s));
  }, []);

  const handleAddInteraccion = useCallback((cliId: string, interaccion: InteraccionCliente) => {
    const targetCli = clientes.find(c => c.id === cliId);
    if (targetCli) {
      const updatedCli = { ...targetCli, interacciones: [interaccion, ...targetCli.interacciones] };
      handleUpdateCliente(updatedCli);
    }
  }, [clientes, handleUpdateCliente]);

  const handleResolveAlerta = useCallback((id: string) => {
    const changed = alertas.find(a => a.id === id);
    if (!changed) return;
    const actualizada = { ...changed, estado: 'atendida' as const };
    setAlertas(prev => prev.map(a => a.id === id ? actualizada : a));
    upsertOne('alertas', actualizada).catch(fallo('actualizar la alerta'));
  }, [alertas, fallo]);

  const handleAddNotificacion = useCallback((notif: NotificacionCliente) => {
    setNotificaciones(prev => [...prev, notif]);
    upsertOne('notificaciones', notif).catch(fallo('guardar la notificación'));

    const targetCli = clientes.find(c => c.id === notif.clienteId);
    if (targetCli) {
      const nuevaInteraccion: InteraccionCliente = {
        id: genId('int-cli-not'),
        fecha: new Date().toISOString().split('T')[0],
        tipo: notif.tipoEnvio === 'whatsapp' ? 'whatsapp' : notif.tipoEnvio === 'email' ? 'email' : 'llamada',
        notas: `Notificación registrada [${notif.tipoEnvio.toUpperCase()}]: "${notif.mensaje.slice(0, 85)}..."`
      };
      const updatedCli = { ...targetCli, interacciones: [nuevaInteraccion, ...targetCli.interacciones] };
      handleUpdateCliente(updatedCli);
    }
  }, [clientes, handleUpdateCliente, fallo]);

  const handleDeleteNotificacion = useCallback((id: string) => {
    setNotificaciones(prev => prev.filter(n => n.id !== id));
    deleteOne('notificaciones', id).catch(fallo('eliminar la notificación'));
  }, [fallo]);

  const handleTriggerAutoRenew = useCallback((vehId: string, tipo: AlertaTipo, nuevaFechaOrKm: string) => {
    const veh = vehiculos.find(v => v.id === vehId);
    if (!veh) return;
    let updatedVeh = { ...veh };
    if (tipo === 'itv') updatedVeh.itvVencimiento = nuevaFechaOrKm;
    else if (tipo === 'seguro') updatedVeh.seguroVencimiento = nuevaFechaOrKm;
    else if (tipo === 'impuesto') updatedVeh.impuestoVencimiento = nuevaFechaOrKm;
    else if (tipo === 'mantenimiento') {
      updatedVeh.kilometraje = Math.max(veh.kilometraje, Number(nuevaFechaOrKm) - 15000);
      // El mantenimiento por km no lo gestiona ningún trigger: se abre aquí
      // la siguiente alerta a +15.000 km para que el ciclo continúe.
      const proximoKm = Number(nuevaFechaOrKm) + 15000;
      const siguiente: Alerta = {
        id: genId('al-mnt'),
        vehiculoId: vehId,
        tipo: 'mantenimiento',
        descripcion: `Revisión de mantenimiento preventivo recomendada a los ${proximoKm.toLocaleString()} km.`,
        estado: 'activa',
        kilometrajeLimite: proximoKm,
      };
      setAlertas(prev => [...prev, siguiente]);
      upsertOne('alertas', siguiente).catch(fallo('guardar la alerta'));
    }

    const actualizado = handleUpdateVehiculo(updatedVeh);
    if (tipo !== 'mantenimiento') {
      // itv/seguro/impuesto: un trigger en Supabase reabre/actualiza la
      // alerta al guardar la nueva fecha del vehículo; se recarga para
      // reflejar ese cambio hecho en el servidor.
      actualizado
        .then(() => fetchAll<Alerta>('alertas').then(setAlertas))
        .catch(err => console.error('Error recargando alertas', err));
    }
  }, [vehiculos, handleUpdateVehiculo, fallo]);

  // Factura handlers
  const handleAddFactura = useCallback((f: Factura) => {
    setFacturas(prev => [...prev, f]);
    upsertOne('facturas', f).catch(fallo('guardar la factura'));
  }, [fallo]);

  const handleUpdateFactura = useCallback((f: Factura) => {
    setFacturas(prev => prev.map(x => x.id === f.id ? f : x));
    upsertOne('facturas', f).catch(fallo('actualizar la factura'));
  }, [fallo]);

  const handleDeleteFactura = useCallback((id: string) => {
    setFacturas(prev => prev.filter(x => x.id !== id));
    deleteOne('facturas', id).catch(fallo('eliminar la factura'));
  }, [fallo]);

  // OT handlers
  const handleAddOT = useCallback((ot: OrdenTrabajo) => {
    setOrdenesTrabajo(prev => [...prev, ot]);
    upsertOne('ordenes_trabajo', ot).catch(fallo('guardar la orden de trabajo'));
  }, [fallo]);

  const handleUpdateOT = useCallback((ot: OrdenTrabajo) => {
    setOrdenesTrabajo(prev => prev.map(x => x.id === ot.id ? ot : x));
    upsertOne('ordenes_trabajo', ot).catch(fallo('actualizar la orden de trabajo'));
  }, [fallo]);

  const handleDeleteOT = useCallback((id: string) => {
    setOrdenesTrabajo(prev => prev.filter(x => x.id !== id));
    deleteOne('ordenes_trabajo', id).catch(fallo('eliminar la orden de trabajo'));
  }, [fallo]);

  const handleSaveEmpresa = useCallback((config: EmpresaConfig) => {
    setEmpresaConfig(config);
    saveEmpresaConfigDb(config).catch(fallo('guardar la configuración de la empresa'));
  }, [fallo]);

  const handleAddTecnico = useCallback((t: Tecnico) => {
    setTecnicos(prev => [...prev, t]);
    upsertOne('tecnicos', t).catch(fallo('guardar el técnico'));
  }, [fallo]);

  const handleUpdateTecnico = useCallback((t: Tecnico) => {
    setTecnicos(prev => prev.map(x => x.id === t.id ? t : x));
    upsertOne('tecnicos', t).catch(fallo('actualizar el técnico'));
  }, [fallo]);

  const handleDeleteTecnico = useCallback((id: string) => {
    setTecnicos(prev => prev.filter(x => x.id !== id));
    deleteOne('tecnicos', id).catch(fallo('eliminar el técnico'));
  }, [fallo]);

  const handleAddCita = useCallback((c: Cita) => {
    setCitas(prev => [...prev, c]);
    upsertOne('citas', c).catch(fallo('guardar la cita'));
  }, [fallo]);

  const handleUpdateCita = useCallback((c: Cita) => {
    setCitas(prev => prev.map(x => x.id === c.id ? c : x));
    upsertOne('citas', c).catch(fallo('actualizar la cita'));
  }, [fallo]);

  const handleDeleteCita = useCallback((id: string) => {
    setCitas(prev => prev.filter(x => x.id !== id));
    deleteOne('citas', id).catch(fallo('eliminar la cita'));
  }, [fallo]);

  const activeAlertsCount = useMemo(() => alertas.filter(a => a.estado === 'activa').length, [alertas]);
  // Solicitudes de la web esperando que alguien asigne el coche.
  const datosRecibidos = useMemo(() => invitaciones.filter(i => i.estado === 'completada').length, [invitaciones]);
  const solicitudesPendientes = useMemo(() => solicitudes.filter(x => x.estadoGestion === 'pendiente').length, [solicitudes]);

  const brandColor = empresaConfig.brandColor;
  const brandText = contrastText(brandColor);

  useEffect(() => {
    const root = document.documentElement;
    root.style.setProperty('--brand-color', brandColor);
    root.style.setProperty('--brand-text-color', brandText);
  }, [brandColor, brandText]);

  // Wait until auth is checked
  if (!authChecked) return null;

  // Flujo de restablecimiento de contraseña (llegada desde el email).
  if (passwordRecovery) {
    return (
      <LoginScreenReset
        onDone={() => {
          setPasswordRecovery(false);
          setCurrentUser(null);
          window.history.replaceState(null, '', window.location.pathname);
        }}
      />
    );
  }

  // Show login if no user
  if (!currentUser) {
    return <LoginScreen onLogin={handleLogin} />;
  }

  const hasAlquileres = activeModulos.includes('alquileres');

  const tabDefs: { id: ModuloId; label: string; icon: React.ReactNode; emoji: string }[] = (
    [
      { id: 'citas' as ModuloId, label: 'Agenda', icon: <CalendarClock className="w-4 h-4" />, emoji: '📅' },
      { id: 'vehiculos' as ModuloId, label: 'Vehículos', icon: <Car className="w-4 h-4" />, emoji: '🚗' },
      { id: 'clientes' as ModuloId, label: 'Clientes', icon: <Users className="w-4 h-4" />, emoji: '👥' },
      { id: 'taller' as ModuloId, label: 'Taller', icon: <Wrench className="w-4 h-4" />, emoji: '🔧' },
      { id: 'alertas' as ModuloId, label: 'Alertas', icon: <Bell className="w-4 h-4" />, emoji: '🔔' },
      { id: 'rentabilidad' as ModuloId, label: 'Rentabilidad', icon: <BarChart2 className="w-4 h-4" />, emoji: '📈' },
      { id: 'facturas' as ModuloId, label: 'Facturas', icon: <FileText className="w-4 h-4" />, emoji: '🧾' },
      { id: 'alquileres' as ModuloId, label: 'Alquileres', icon: <Calendar className="w-4 h-4" />, emoji: '📅' },
    ] as { id: ModuloId; label: string; icon: React.ReactNode; emoji: string }[]
  ).filter(t => activeModulos.includes(t.id));

  return (
    <div
      className="min-h-screen bg-slate-50 font-sans flex flex-col antialiased"
      style={{ '--brand': brandColor, '--brand-text': brandText } as React.CSSProperties}
    >

      {/* Aviso de guardado fallido: se queda hasta que se cierra */}
      {errorGuardado && (
        <div role="alert" className="fixed top-3 left-3 right-3 sm:left-1/2 sm:right-auto sm:-translate-x-1/2 sm:max-w-xl z-[100] print:hidden bg-red-600 text-white rounded-xl shadow-2xl px-4 py-3 flex items-start gap-3">
          <span className="text-sm font-semibold flex-1">{errorGuardado}</span>
          <button onClick={() => setErrorGuardado(null)} aria-label="Cerrar aviso" className="shrink-0 p-0.5 rounded hover:bg-red-700 cursor-pointer">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* PROFESSIONAL UPPER BAR */}
      <header
        className="shadow-md print:hidden shrink-0"
        style={{
          backgroundColor: brandColor,
          backgroundImage: `
            radial-gradient(ellipse at 20% 50%, ${brandText === '#ffffff' ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)'} 0%, transparent 60%),
            radial-gradient(ellipse at 80% 20%, ${brandText === '#ffffff' ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.04)'} 0%, transparent 50%),
            repeating-linear-gradient(
              -45deg,
              transparent,
              transparent 6px,
              ${brandText === '#ffffff' ? 'rgba(255,255,255,0.025)' : 'rgba(0,0,0,0.025)'} 6px,
              ${brandText === '#ffffff' ? 'rgba(255,255,255,0.025)' : 'rgba(0,0,0,0.025)'} 7px
            )
          `,
        }}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex flex-col md:flex-row md:items-center md:justify-between gap-4">

          {/* Logo + Brand */}
          <div className="flex items-center gap-3">
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center font-black tracking-tighter text-lg shadow-md shrink-0 overflow-hidden"
              style={{ backgroundColor: `${brandColor}33`, color: brandText }}
            >
              {empresaConfig.logoBase64 ? (
                <img src={empresaConfig.logoBase64} alt="logo" className="w-full h-full object-contain" />
              ) : (
                empresaConfig.nombre.split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase() || 'E'
              )}
            </div>
            <div>
              <h1 className="text-md sm:text-lg font-display font-bold tracking-tight flex items-center gap-2" style={{ color: brandText }}>
                {empresaConfig.nombre}
                <span
                  className="text-[10px] font-extrabold px-2 py-0.5 rounded uppercase tracking-widest"
                  style={{ backgroundColor: `${brandText === '#ffffff' ? '#ffffff' : '#000000'}22`, color: brandText, border: `1px solid ${brandText}44` }}
                >
                  FLOTAS Y CRM
                </span>
              </h1>
              <p className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: `${brandText}99` }}>{empresaConfig.tagline}</p>
            </div>
          </div>

          {/* Contact info + user/logout */}
          <div className="flex flex-wrap items-center gap-3">
            <div
              className="flex flex-wrap items-center gap-x-6 gap-y-1.5 text-xs p-2.5 px-4 rounded-xl font-medium"
              style={{ backgroundColor: `${brandText === '#ffffff' ? '#00000033' : '#ffffff33'}`, color: brandText }}
            >
              {empresaConfig.correo && (
                <div className="flex items-center gap-1.5">
                  <Mail className="w-3.5 h-3.5" style={{ color: brandText }} />
                  <span>{empresaConfig.correo}</span>
                </div>
              )}
              {empresaConfig.telefono && (
                <div className="flex items-center gap-1.5">
                  <Phone className="w-3.5 h-3.5" style={{ color: brandText }} />
                  <span>{empresaConfig.telefono}</span>
                </div>
              )}
              {empresaConfig.web && (
                <div className="flex items-center gap-1.5">
                  <Globe className="w-3.5 h-3.5" style={{ color: brandText }} />
                  <span>{empresaConfig.web}</span>
                </div>
              )}
            </div>

            {/* User pill + logout */}
            <div className="flex items-center gap-2">
              <div
                className="flex items-center gap-2 rounded-xl px-3 py-2"
                style={{ backgroundColor: `${brandText === '#ffffff' ? '#00000033' : '#ffffff33'}`, color: brandText }}
              >
                <div
                  className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-black"
                  style={{ backgroundColor: brandText, color: brandColor }}
                >
                  {currentUser.nombre[0].toUpperCase()}
                </div>
                <span className="text-xs font-semibold hidden sm:block">{currentUser.nombre}</span>
                {(currentUser.rol === 'admin' || currentUser.rol === 'super_admin') && (
                  <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full" style={{ backgroundColor: `${brandText}22`, color: brandText }}>ADMIN</span>
                )}
              </div>
              <button
                onClick={handleLogout}
                title="Cerrar sesión"
                className="p-2 rounded-xl transition cursor-pointer"
                style={{ backgroundColor: `${brandText === '#ffffff' ? '#00000033' : '#ffffff33'}`, color: brandText }}
              >
                <LogOut className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* NAVIGATION TABS SUBBAR */}
      <nav className="bg-white border-b border-slate-200/80 shadow-3xs print:hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-14">

            {/* Nav Links Desktop */}
            <div className="hidden md:flex space-x-1 py-1.5 overflow-x-auto w-full">
              {tabDefs.map(tab => (
                <button
                  key={tab.id}
                  onClick={() => { setActiveTab(tab.id); setMobileMenuOpen(false); }}
                  className={`px-4 py-2 text-xs font-bold rounded-xl transition duration-150 flex items-center gap-1.5 cursor-pointer relative shrink-0 ${
                    activeTab === tab.id ? 'bg-blue-50 text-blue-700 border border-blue-200/40 shadow-3xs' : 'text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  {tab.icon} {tab.label}
                  {tab.id === 'alertas' && activeAlertsCount > 0 && (
                    <span className="absolute top-1 right-2 px-1.5 py-0.5 text-[8px] bg-rose-500 text-white font-extrabold rounded-full leading-none animate-pulse">
                      {activeAlertsCount}
                    </span>
                  )}
                  {tab.id === 'alquileres' && solicitudesPendientes > 0 && (
                    <span className="absolute top-1 right-2 px-1.5 py-0.5 text-[8px] bg-rose-500 text-white font-extrabold rounded-full leading-none animate-pulse">
                      {solicitudesPendientes}
                    </span>
                  )}
                  {tab.id === 'clientes' && datosRecibidos > 0 && (
                    <span className="absolute top-1 right-2 px-1.5 py-0.5 text-[8px] bg-rose-500 text-white font-extrabold rounded-full leading-none animate-pulse">
                      {datosRecibidos}
                    </span>
                  )}
                </button>
              ))}
            </div>

            {/* Mobile menu triggers */}
            <div className="flex md:hidden items-center justify-between w-full">
              <span className="text-xs font-bold text-slate-700 capitalize">
                Módulo: <span className="text-blue-700 font-extrabold">{activeTab.replace('_', ' ')}</span>
              </span>
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="p-2 hover:bg-slate-50 text-slate-600 rounded-lg"
              >
                {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
              </button>
            </div>

            {/* Actions right */}
            <div className="hidden md:flex items-center gap-2 shrink-0">
              {(currentUser.rol === 'admin' || currentUser.rol === 'super_admin') && (
                <button
                  onClick={() => setAdminPanelOpen(true)}
                  title="Panel de administración"
                  className="p-2 py-1 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-lg text-[10px] font-black transition flex items-center gap-1 cursor-pointer border border-blue-200"
                >
                  <Shield className="w-3.5 h-3.5" /> Admin
                </button>
              )}
              {(currentUser.rol === 'admin' || currentUser.rol === 'super_admin') && (
                <button
                  onClick={() => setSettingsOpen(true)}
                  title="Configuración de empresa"
                  className="p-2 py-1 bg-slate-50 hover:bg-slate-100 text-slate-600 hover:text-slate-800 rounded-lg text-[10px] font-black transition flex items-center gap-1 cursor-pointer border border-slate-200"
                >
                  <Settings className="w-3.5 h-3.5" /> Empresa
                </button>
              )}
            </div>

          </div>
        </div>

        {/* Mobile dropdown */}
        {mobileMenuOpen && (
          <div className="md:hidden border-t border-slate-100 bg-white px-4 py-2 space-y-1 block shrink-0">
            {tabDefs.map(tab => (
              <button
                key={tab.id}
                onClick={() => { setActiveTab(tab.id); setMobileMenuOpen(false); }}
                className="w-full text-left px-3 py-2 text-xs font-bold rounded-lg text-slate-700 block hover:bg-slate-50 flex justify-between"
              >
                <span>{tab.emoji} {tab.label}</span>
                {tab.id === 'alertas' && activeAlertsCount > 0 && (
                  <span className="px-2 py-0.5 bg-rose-500 text-white font-bold text-[9px] rounded-full">{activeAlertsCount}</span>
                )}
                {tab.id === 'alquileres' && solicitudesPendientes > 0 && (
                  <span className="px-2 py-0.5 bg-rose-500 text-white font-bold text-[9px] rounded-full">{solicitudesPendientes}</span>
                )}
                {tab.id === 'clientes' && datosRecibidos > 0 && (
                  <span className="px-2 py-0.5 bg-rose-500 text-white font-bold text-[9px] rounded-full">{datosRecibidos}</span>
                )}
              </button>
            ))}
            <div className="pt-2 border-t border-slate-100 space-y-1">
              {(currentUser.rol === 'admin' || currentUser.rol === 'super_admin') && (
                <button onClick={() => { setAdminPanelOpen(true); setMobileMenuOpen(false); }} className="w-full text-left px-3 py-2 text-xs font-bold rounded-lg text-blue-700 block hover:bg-blue-50">
                  🛡️ Panel de Administración
                </button>
              )}
              {(currentUser.rol === 'admin' || currentUser.rol === 'super_admin') && (
                <button onClick={() => { setSettingsOpen(true); setMobileMenuOpen(false); }} className="w-full text-left px-3 py-2 text-xs font-bold rounded-lg text-slate-700 block hover:bg-slate-50">
                  ⚙️ Configuración de empresa
                </button>
              )}
              <button onClick={handleLogout} className="w-full text-left px-3 py-2 text-xs font-bold rounded-lg text-slate-600 block hover:bg-slate-50">
                🚪 Cerrar sesión
              </button>
            </div>
          </div>
        )}
      </nav>

      {/* CORE WORKSPACE */}
      <main className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 overflow-y-auto">
        <Suspense fallback={<div className="py-24 text-center text-sm text-slate-400" role="status">Cargando…</div>}>
        {activeTab === 'citas' && (
          <AgendaTab
            citas={citas}
            vehiculos={vehiculos}
            clientes={clientes}
            tecnicos={tecnicos}
            ordenes={ordenesTrabajo}
            capacidadTaller={empresaConfig.capacidadTaller}
            onAddCita={handleAddCita}
            onUpdateCita={handleUpdateCita}
            onDeleteCita={handleDeleteCita}
            onCreateOT={handleAddOT}
          />
        )}

        {activeTab === 'vehiculos' && (
          <VehiclesTab
            vehiculos={vehiculos}
            ordenesTrabajo={ordenesTrabajo}
            hasAlquileres={hasAlquileres}
            onAddVehiculo={handleAddVehiculo}
            onUpdateVehiculo={handleUpdateVehiculo}
            onDeleteVehiculo={handleDeleteVehiculo}
          />
        )}

        {activeTab === 'taller' && (
          <OrdenesTrabajoTab
            ordenes={ordenesTrabajo}
            vehiculos={vehiculos}
            clientes={clientes}
            tecnicos={tecnicos}
            onAdd={handleAddOT}
            onUpdate={handleUpdateOT}
            onDelete={handleDeleteOT}
          />
        )}

        {activeTab === 'clientes' && (
          <CrmTab
            clientes={clientes}
            reservas={reservas}
            vehiculos={vehiculos}
            ordenesTrabajo={ordenesTrabajo}
            facturas={facturas}
            hasAlquileres={hasAlquileres}
            solicitudes={solicitudes}
            invitaciones={invitaciones}
            onCrearInvitacion={handleCrearInvitacion}
            onAplicarInvitacion={handleAplicarInvitacion}
            onCancelarInvitacion={handleCancelarInvitacion}
            onAddCliente={handleAddCliente}
            onUpdateCliente={handleUpdateCliente}
            onDeleteCliente={handleDeleteCliente}
            onAddInteraccion={handleAddInteraccion}
          />
        )}

        {activeTab === 'alquileres' && (
          <RentalsTab
            reservas={reservas}
            vehiculos={vehiculos}
            clientes={clientes}
            solicitudes={solicitudes}
            onAddReserva={handleAddReserva}
            onUpdateReserva={handleUpdateReserva}
            onConvertirSolicitud={handleConvertirSolicitud}
            onDescartarSolicitud={handleDescartarSolicitud}
          />
        )}

        {activeTab === 'rentabilidad' && (
          <AnalyticsTab
            ordenesTrabajo={ordenesTrabajo}
            clientes={clientes}
            reservas={reservas}
            vehiculos={vehiculos}
          />
        )}

        {activeTab === 'alertas' && (
          <AlertsNotificationsTab
            alertas={alertas}
            notificaciones={notificaciones}
            clientes={clientes}
            vehiculos={vehiculos}
            onAddNotificacion={handleAddNotificacion}
            onResolveAlerta={handleResolveAlerta}
            onDeleteNotificacion={handleDeleteNotificacion}
            onTriggerAutoRenew={handleTriggerAutoRenew}
          />
        )}

        {activeTab === 'facturas' && (
          <FacturasTab
            facturas={facturas}
            clientes={clientes}
            vehiculos={vehiculos}
            ordenesTrabajo={ordenesTrabajo}
            puedeGestionarFacturas={currentUser.rol === 'admin' || currentUser.rol === 'super_admin'}
            onAddFactura={handleAddFactura}
            onUpdateFactura={handleUpdateFactura}
            onDeleteFactura={handleDeleteFactura}
            onUpdateOT={handleUpdateOT}
          />
        )}
        </Suspense>
      </main>

      <Suspense fallback={null}>
      {settingsOpen && (
        <CompanySettingsPanel
          config={empresaConfig}
          onSave={handleSaveEmpresa}
          tecnicos={tecnicos}
          onAddTecnico={handleAddTecnico}
          onUpdateTecnico={handleUpdateTecnico}
          onDeleteTecnico={handleDeleteTecnico}
          onClose={() => setSettingsOpen(false)}
        />
      )}

      {adminPanelOpen && (
        <AdminPanel
          currentUser={currentUser}
          onClose={() => setAdminPanelOpen(false)}
        />
      )}
      </Suspense>

      {/* FOOTER */}
      <footer className="bg-white border-t border-slate-200 py-4 text-xs text-slate-500 print:hidden shrink-0 mt-auto">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-center gap-x-2 gap-y-1 flex-wrap text-center">
          <span>© 2026 · Entorno privado de backoffice. Reservados todos los derechos.</span>
          <span className="hidden sm:inline text-slate-300">·</span>
          <span>
            Desarrollado por{' '}
            <a
              href="https://somosingenio.net"
              target="_blank"
              rel="noopener noreferrer"
              className="font-semibold hover:underline"
              style={{ color: '#7A4A93' }}
            >
              Somos inGenio
            </a>
            {' · '}
            <a
              href="tel:+34696722198"
              className="hover:underline"
              style={{ color: '#7A4A93' }}
            >
              (+34) 696 722 198
            </a>
          </span>
        </div>
      </footer>
    </div>
  );
}
