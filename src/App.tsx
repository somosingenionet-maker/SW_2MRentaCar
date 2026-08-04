import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { contrastText } from './utils/color';
import { genId } from './utils/id';
import {
  getIntervenciones, saveIntervenciones,
  getClientes, saveClientes,
  getReservas, saveReservas,
  getAlertas, saveAlertas,
  getNotificaciones, saveNotificaciones,
  getFacturas, saveFacturas,
  getOrdenesTrabajo, saveOrdenesTrabajo,
} from './data/mockData';
import { Vehiculo, Intervencion, Cliente, Reserva, Alerta, NotificacionCliente, InteraccionCliente, AlertaTipo, Usuario, Factura, ModuloId, OrdenTrabajo } from './types';
import { getSessionUsuario, signOut } from './lib/auth';
import { fetchVehiculos, upsertVehiculo, deleteVehiculoDb } from './data/vehiculosDb';
import VehiclesTab from './components/VehiclesTab';
import OrdenesTrabajoTab from './components/OrdenesTrabajoTab';
import CrmTab from './components/CrmTab';
import RentalsTab from './components/RentalsTab';
import AnalyticsTab from './components/AnalyticsTab';
import AlertsNotificationsTab from './components/AlertsNotificationsTab';
import FacturasTab from './components/FacturasTab';
import LoginScreen from './components/LoginScreen';
import AdminPanel from './components/AdminPanel';
import {
  Car, Wrench, Users, Calendar, BarChart2, Bell, Shield, Phone, Mail, Globe, Menu, X, Settings, FileText, LogOut
} from 'lucide-react';
import CompanySettingsPanel from './components/CompanySettingsPanel';
import { EmpresaConfig, getEmpresaConfig, saveEmpresaConfig } from './data/mockData';

type TabId = ModuloId;

export default function App() {
  // Auth state
  const [currentUser, setCurrentUser] = useState<Usuario | null>(null);
  const [authChecked, setAuthChecked] = useState(false);

  // Navigation
  const [activeTab, setActiveTab] = useState<TabId>('vehiculos');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [adminPanelOpen, setAdminPanelOpen] = useState(false);
  const [empresaConfig, setEmpresaConfig] = useState<EmpresaConfig>(getEmpresaConfig);

  // States
  const [vehiculos, setVehiculos] = useState<Vehiculo[]>([]);
  const [intervenciones, setIntervenciones] = useState<Intervencion[]>([]);
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [reservas, setReservas] = useState<Reserva[]>([]);
  const [alertas, setAlertas] = useState<Alerta[]>([]);
  const [notificaciones, setNotificaciones] = useState<NotificacionCliente[]>([]);
  const [facturas, setFacturas] = useState<Factura[]>([]);
  const [ordenesTrabajo, setOrdenesTrabajo] = useState<OrdenTrabajo[]>([]);

  // Check session on mount (Supabase)
  useEffect(() => {
    getSessionUsuario()
      .then(user => setCurrentUser(user))
      .finally(() => setAuthChecked(true));
  }, []);

  // Load from local storage on mount (entidades aún no migradas a Supabase)
  useEffect(() => {
    setIntervenciones(getIntervenciones());
    setClientes(getClientes());
    setReservas(getReservas());
    setAlertas(getAlertas());
    setNotificaciones(getNotificaciones());
    setFacturas(getFacturas());
    setOrdenesTrabajo(getOrdenesTrabajo());
  }, []);

  // Vehículos: se cargan desde Supabase al iniciar sesión (requiere estar autenticado por RLS).
  useEffect(() => {
    if (!currentUser) { setVehiculos([]); return; }
    fetchVehiculos()
      .then(setVehiculos)
      .catch(err => console.error('Error cargando vehículos', err));
  }, [currentUser]);

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
    signOut();
    setCurrentUser(null);
  }, []);

  // Active modules computed from user
  const activeModulos = useMemo(() => currentUser?.modulos ?? [], [currentUser]);

  // Sync utilities
  const handleAddVehiculo = useCallback((nuevo: Vehiculo) => {
    setVehiculos(prev => [...prev, nuevo]);
    upsertVehiculo(nuevo).catch(err => console.error('Error guardando vehículo', err));

    // Alerta ITV automática (las alertas aún viven en localStorage).
    const nuevaAlerta: Alerta = {
      id: genId('al-aut'),
      vehiculoId: nuevo.id,
      tipo: 'itv',
      descripcion: `Inspección Técnica obligatoria (ITV) programada para el vencimiento: ${nuevo.itvVencimiento}.`,
      estado: 'pendiente',
      fechaLimite: nuevo.itvVencimiento
    };
    const updatedAl = [...alertas, nuevaAlerta];
    setAlertas(updatedAl);
    saveAlertas(updatedAl);
  }, [alertas]);

  const handleUpdateVehiculo = useCallback((editado: Vehiculo) => {
    setVehiculos(prev => prev.map(v => v.id === editado.id ? editado : v));
    upsertVehiculo(editado).catch(err => console.error('Error actualizando vehículo', err));
  }, []);

  const handleDeleteVehiculo = useCallback((id: string) => {
    setVehiculos(prev => prev.filter(v => v.id !== id));
    deleteVehiculoDb(id).catch(err => console.error('Error eliminando vehículo', err));
  }, []);

  const handleAddIntervencion = useCallback((nueva: Intervencion, updateVehicleMileage: boolean) => {
    const updatedInt = [...intervenciones, nueva];
    setIntervenciones(updatedInt);
    saveIntervenciones(updatedInt);

    if (updateVehicleMileage) {
      const targetV = vehiculos.find(v => v.id === nueva.vehiculoId);
      if (targetV && nueva.kilometrajeEnIntervencion > targetV.kilometraje) {
        const updatedVSpec = { ...targetV, kilometraje: nueva.kilometrajeEnIntervencion };
        handleUpdateVehiculo(updatedVSpec);

        let alertChanged = false;
        const updatedAl = alertas.map(a => {
          if (a.vehiculoId === nueva.vehiculoId && a.tipo === 'mantenimiento' && a.estado !== 'atendida') {
            alertChanged = true;
            return { ...a, estado: 'atendida' as const, descripcion: `${a.descripcion} (Amortizado con éxito en visita ${nueva.fechaIntervencion})` };
          }
          return a;
        });
        if (alertChanged) { setAlertas(updatedAl); saveAlertas(updatedAl); }
      }
    }
  }, [intervenciones, vehiculos, alertas, handleUpdateVehiculo]);

  const handleAddCliente = useCallback((nuevo: Cliente) => {
    const updated = [...clientes, nuevo];
    setClientes(updated);
    saveClientes(updated);
  }, [clientes]);

  const handleUpdateCliente = useCallback((editado: Cliente) => {
    const updated = clientes.map(c => c.id === editado.id ? editado : c);
    setClientes(updated);
    saveClientes(updated);
  }, [clientes]);

  const handleDeleteCliente = useCallback((id: string) => {
    const updated = clientes.filter(c => c.id !== id);
    setClientes(updated);
    saveClientes(updated);
  }, [clientes]);

  const handleAddReserva = useCallback((nueva: Reserva) => {
    const updatedRes = [...reservas, nueva];
    setReservas(updatedRes);
    saveReservas(updatedRes);

    const targetCli = clientes.find(c => c.id === nueva.clienteId);
    const targetVeh = vehiculos.find(v => v.id === nueva.vehiculoId);
    if (targetCli && targetVeh) {
      const nuevaInteraccion: InteraccionCliente = {
        id: genId('int-cli-aut-res'),
        fecha: new Date().toISOString().split('T')[0],
        tipo: 'registro_contrato',
        notas: `Contrato de alquiler firmado de coche (${targetVeh.marca} con matrícula ${targetVeh.matricula}). Rango: ${nueva.fechaInicio} al ${nueva.fechaFin}. Liquidado total: ${nueva.totalCobrado.toFixed(2)} €.`
      };
      const updatedCli = { ...targetCli, interacciones: [nuevaInteraccion, ...targetCli.interacciones] };
      handleUpdateCliente(updatedCli);
    }
  }, [reservas, clientes, vehiculos, handleUpdateCliente]);

  const handleUpdateReserva = useCallback((editada: Reserva) => {
    const updated = reservas.map(r => r.id === editada.id ? editada : r);
    setReservas(updated);
    saveReservas(updated);
  }, [reservas]);

  const handleAddInteraccion = useCallback((cliId: string, interaccion: InteraccionCliente) => {
    const targetCli = clientes.find(c => c.id === cliId);
    if (targetCli) {
      const updatedCli = { ...targetCli, interacciones: [interaccion, ...targetCli.interacciones] };
      handleUpdateCliente(updatedCli);
    }
  }, [clientes, handleUpdateCliente]);

  const handleResolveAlerta = useCallback((id: string) => {
    const updated = alertas.map(a => a.id === id ? { ...a, estado: 'atendida' as const } : a);
    setAlertas(updated);
    saveAlertas(updated);
  }, [alertas]);

  const handleAddNotificacion = useCallback((notif: NotificacionCliente) => {
    const updatedNot = [...notificaciones, notif];
    setNotificaciones(updatedNot);
    saveNotificaciones(updatedNot);

    const targetCli = clientes.find(c => c.id === notif.clienteId);
    if (targetCli) {
      const nuevaInteraccion: InteraccionCliente = {
        id: genId('int-cli-not'),
        fecha: new Date().toISOString().split('T')[0],
        tipo: notif.tipoEnvio === 'whatsapp' ? 'whatsapp' : notif.tipoEnvio === 'email' ? 'email' : 'llamada',
        notas: `Notificación enviada por [${notif.tipoEnvio.toUpperCase()}]: "${notif.mensaje.slice(0, 85)}..."`
      };
      const updatedCli = { ...targetCli, interacciones: [nuevaInteraccion, ...targetCli.interacciones] };
      handleUpdateCliente(updatedCli);
    }
  }, [notificaciones, clientes, handleUpdateCliente]);

  const handleDeleteNotificacion = useCallback((id: string) => {
    const updated = notificaciones.filter(n => n.id !== id);
    setNotificaciones(updated);
    saveNotificaciones(updated);
  }, [notificaciones]);

  const handleTriggerAutoRenew = useCallback((vehId: string, tipo: AlertaTipo, nuevaFechaOrKm: string) => {
    const veh = vehiculos.find(v => v.id === vehId);
    if (!veh) return;
    let updatedVeh = { ...veh };
    if (tipo === 'itv') updatedVeh.itvVencimiento = nuevaFechaOrKm;
    else if (tipo === 'seguro') updatedVeh.seguroVencimiento = nuevaFechaOrKm;
    else if (tipo === 'impuesto') updatedVeh.impuestoVencimiento = nuevaFechaOrKm;
    else if (tipo === 'mantenimiento') {
      updatedVeh.kilometraje = Math.max(veh.kilometraje, Number(nuevaFechaOrKm) - 15000);
      const autoTask: Intervencion = {
        id: genId('int-auto'),
        vehiculoId: vehId,
        tipo: 'preventivo',
        descripcion: 'Servicio periódico oficial: Sustitución de aceite sintético, juego completo de filtros y corrección de niveles.',
        tallerRealizador: `Taller Central ${empresaConfig.nombre}`,
        costo: 190.00,
        kilometrajeEnIntervencion: veh.kilometraje,
        fechaIntervencion: new Date().toISOString().split('T')[0],
        notas: 'Servicio realizado tras alerta preventiva. Próxima programada en 15.000 kms.'
      };
      handleAddIntervencion(autoTask, false);
    }
    handleUpdateVehiculo(updatedVeh);
  }, [vehiculos, handleUpdateVehiculo, handleAddIntervencion]);

  // Factura handlers
  const handleAddFactura = useCallback((f: Factura) => {
    const updated = [...facturas, f];
    setFacturas(updated);
    saveFacturas(updated);
  }, [facturas]);

  const handleUpdateFactura = useCallback((f: Factura) => {
    const updated = facturas.map(x => x.id === f.id ? f : x);
    setFacturas(updated);
    saveFacturas(updated);
  }, [facturas]);

  const handleDeleteFactura = useCallback((id: string) => {
    const updated = facturas.filter(x => x.id !== id);
    setFacturas(updated);
    saveFacturas(updated);
  }, [facturas]);

  // OT handlers
  const handleAddOT = useCallback((ot: OrdenTrabajo) => {
    const updated = [...ordenesTrabajo, ot];
    setOrdenesTrabajo(updated);
    saveOrdenesTrabajo(updated);
  }, [ordenesTrabajo]);

  const handleUpdateOT = useCallback((ot: OrdenTrabajo) => {
    const updated = ordenesTrabajo.map(x => x.id === ot.id ? ot : x);
    setOrdenesTrabajo(updated);
    saveOrdenesTrabajo(updated);
  }, [ordenesTrabajo]);

  const handleDeleteOT = useCallback((id: string) => {
    const updated = ordenesTrabajo.filter(x => x.id !== id);
    setOrdenesTrabajo(updated);
    saveOrdenesTrabajo(updated);
  }, [ordenesTrabajo]);

  const handleSaveEmpresa = useCallback((config: EmpresaConfig) => {
    setEmpresaConfig(config);
    saveEmpresaConfig(config);
  }, []);

  const activeAlertsCount = useMemo(() => alertas.filter(a => a.estado === 'activa').length, [alertas]);

  const brandColor = empresaConfig.brandColor;
  const brandText = contrastText(brandColor);

  useEffect(() => {
    const root = document.documentElement;
    root.style.setProperty('--brand-color', brandColor);
    root.style.setProperty('--brand-text-color', brandText);
  }, [brandColor, brandText]);

  // Wait until auth is checked
  if (!authChecked) return null;

  // Show login if no user
  if (!currentUser) {
    return <LoginScreen onLogin={handleLogin} />;
  }

  const hasAlquileres = activeModulos.includes('alquileres');

  const tabDefs: { id: ModuloId; label: string; icon: React.ReactNode; emoji: string }[] = (
    [
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
              <button
                onClick={() => setSettingsOpen(true)}
                title="Configuración de empresa"
                className="p-2 py-1 bg-slate-50 hover:bg-slate-100 text-slate-600 hover:text-slate-800 rounded-lg text-[10px] font-black transition flex items-center gap-1 cursor-pointer border border-slate-200"
              >
                <Settings className="w-3.5 h-3.5" /> Empresa
              </button>
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
              </button>
            ))}
            <div className="pt-2 border-t border-slate-100 space-y-1">
              {(currentUser.rol === 'admin' || currentUser.rol === 'super_admin') && (
                <button onClick={() => { setAdminPanelOpen(true); setMobileMenuOpen(false); }} className="w-full text-left px-3 py-2 text-xs font-bold rounded-lg text-blue-700 block hover:bg-blue-50">
                  🛡️ Panel de Administración
                </button>
              )}
              <button onClick={() => { setSettingsOpen(true); setMobileMenuOpen(false); }} className="w-full text-left px-3 py-2 text-xs font-bold rounded-lg text-slate-700 block hover:bg-slate-50">
                ⚙️ Configuración de empresa
              </button>
              <button onClick={handleLogout} className="w-full text-left px-3 py-2 text-xs font-bold rounded-lg text-slate-600 block hover:bg-slate-50">
                🚪 Cerrar sesión
              </button>
            </div>
          </div>
        )}
      </nav>

      {/* CORE WORKSPACE */}
      <main className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 overflow-y-auto">
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
            hasAlquileres={hasAlquileres}
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
            onAddReserva={handleAddReserva}
            onUpdateReserva={handleUpdateReserva}
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
            intervenciones={intervenciones}
            onAddFactura={handleAddFactura}
            onUpdateFactura={handleUpdateFactura}
            onDeleteFactura={handleDeleteFactura}
          />
        )}
      </main>

      {settingsOpen && (
        <CompanySettingsPanel
          config={empresaConfig}
          onSave={handleSaveEmpresa}
          onClose={() => setSettingsOpen(false)}
        />
      )}

      {adminPanelOpen && (
        <AdminPanel
          currentUser={currentUser}
          onClose={() => setAdminPanelOpen(false)}
        />
      )}

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
