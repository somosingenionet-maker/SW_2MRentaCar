import { useState, useEffect } from 'react';
import { Alerta, NotificacionCliente, Cliente, Vehiculo, AlertaTipo } from '../types';
import {
  Bell, Check, MessageSquare, AlertTriangle, Send, Mail, Phone, Calendar, Sparkles, RefreshCw, Clock
} from 'lucide-react';
import ConfirmDialog from './ConfirmDialog';
import { formatDate } from '../utils/dateFormat';
import { getEmpresaConfig } from '../data/mockData';
import { genId } from '../utils/id';

interface AlertsNotificationsTabProps {
  alertas: Alerta[];
  notificaciones: NotificacionCliente[];
  clientes: Cliente[];
  vehiculos: Vehiculo[];
  onAddNotificacion: (notif: NotificacionCliente) => void;
  onResolveAlerta: (alertaId: string) => void;
  onDeleteNotificacion: (id: string) => void;
  onTriggerAutoRenew: (vehiculoId: string, tipo: AlertaTipo, nuevaFecha: string) => void;
}

// Ventana informativa de "próxima a vencer" (días / km) — solo para el
// resumen de la pantalla; el envío automático real todavía no existe en 2M.
const DIAS_AVISO_VENCIMIENTO = 14;
const KM_AVISO_MANTENIMIENTO = 500;

function estaProximaAVencer(alerta: Alerta, vehiculo?: Vehiculo): boolean {
  if (alerta.tipo === 'mantenimiento') {
    if (alerta.kilometrajeLimite == null || !vehiculo) return false;
    return alerta.kilometrajeLimite - vehiculo.kilometraje <= KM_AVISO_MANTENIMIENTO;
  }
  if (!alerta.fechaLimite) return false;
  const limite = new Date();
  limite.setDate(limite.getDate() + DIAS_AVISO_VENCIMIENTO);
  return new Date(alerta.fechaLimite) <= limite;
}

export default function AlertsNotificationsTab({
  alertas,
  notificaciones,
  clientes,
  vehiculos,
  onAddNotificacion,
  onResolveAlerta,
  onDeleteNotificacion,
  onTriggerAutoRenew
}: AlertsNotificationsTabProps) {

  const empresa = getEmpresaConfig();
  const [selectedTipoFilter, setSelectedTipoFilter] = useState<string>('all');
  const [selectedAlertaId, setSelectedAlertaId] = useState<string | null>(null);
  const [confirmAlerta, setConfirmAlerta] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
  }>({ isOpen: false, title: '', message: '', onConfirm: () => {} });

  // Notification Form states
  const [targetClienteId, setTargetClienteId] = useState('');
  const [targetVehiculoId, setTargetVehiculoId] = useState('');
  const [selectedTemplate, setSelectedTemplate] = useState<NotificacionCliente['tipoEvento']>('mantenimiento_preventivo');
  const [dispatchChannel, setDispatchChannel] = useState<'email' | 'sms' | 'whatsapp'>('email');
  const [customSubject, setCustomSubject] = useState('');
  const [customBody, setCustomBody] = useState('');
  const [isSendingSimulated, setIsSendingSimulated] = useState(false);
  const [sendingDone, setSendingDone] = useState(false);

  // Initialize fields
  useEffect(() => {
    if (clientes.length > 0 && !targetClienteId) {
      setTargetClienteId(clientes[0].id);
    }
    if (vehiculos.length > 0 && !targetVehiculoId) {
      setTargetVehiculoId(vehiculos[0].id);
    }
  }, [clientes, vehiculos]);

  // Live variable template text calculation
  useEffect(() => {
    const cli = clientes.find(c => c.id === targetClienteId);
    const veh = vehiculos.find(v => v.id === targetVehiculoId);

    if (!cli || !veh) return;

    if (selectedTemplate === 'mantenimiento_preventivo') {
      setCustomSubject(`🔧 Mantenimiento Preventivo Pendiente: ${veh.marca} ${veh.matricula}`);
      setCustomBody(`Estimado/a ${cli.nombre} ${cli.apellidos},\n\nLe informamos que de acuerdo con el kilometraje de su vehículo (${veh.marca} ${veh.modelo} con matrícula ${veh.matricula}), se recomienda agendar cita previa para el cambio de filtros y aceite de motor.\n\nAtentamente, Servicio Técnico ${empresa.nombre}.`);
    } else if (selectedTemplate === 'itv_proxima') {
      setCustomSubject(`⚠️ Recordatorio de ITV Próxima: ${veh.marca} ${veh.matricula}`);
      setCustomBody(`Hola ${cli.nombre},\n\nLe recordamos que la Inspección Técnica de Vehículo (ITV) de su coche asignado (${veh.marca} ${veh.modelo} matrícula ${veh.matricula}) caduca el ${veh.itvVencimiento}.\n\nPor favor, pase por nuestras instalaciones para preparar el coche. Taller Central ${empresa.nombre}.`);
    } else if (selectedTemplate === 'reserva_confirmada') {
      setCustomSubject(`📅 Confirmación de Reserva de Vehículo: ${veh.marca}`);
      setCustomBody(`Hola ${cli.nombre} ${cli.apellidos},\n\nConfirmamos su reserva activa del coche ${veh.marca} ${veh.modelo} con matrícula ${veh.matricula}. El mismo cuenta con seguro completo y estará listo para su entrega en la fecha indicada. ¡Gracias!`);
    } else if (selectedTemplate === 'vencimiento_seguro') {
      setCustomSubject(`🛡️ Póliza de Seguro Próxima a Vencer: ${veh.marca}`);
      setCustomBody(`Servicio de Gestión de Flotas: Estimado/a ${cli.nombre}, la póliza de seguro del vehículo ${veh.marca} ${veh.modelo} matrícula ${veh.matricula} vencerá el próximo ${veh.seguroVencimiento}. Estamos tramitando la renovación obligatoria automática.`);
    } else if (selectedTemplate === 'reparacion_lista') {
      setCustomSubject(`✅ Vehículo Reparado Listo para Entrega: ${veh.marca}`);
      setCustomBody(`⚙️ ${empresa.nombre} Taller: Estimado ${cli.nombre}, tenemos el placer de comunicarle que la reparación de su vehículo ${veh.marca} ${veh.modelo} (${veh.matricula}) ha concluido exitosamente y ha sido verificado en carretera. Puede pasar a retirarlo.`);
    }
  }, [targetClienteId, targetVehiculoId, selectedTemplate]);

  const handleDispatchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetClienteId || !customBody) return;

    setIsSendingSimulated(true);

    setTimeout(() => {
      const nueva: NotificacionCliente = {
        id: genId('not'),
        clienteId: targetClienteId,
        vehiculoId: targetVehiculoId || undefined,
        tipoEnvio: dispatchChannel,
        asunto: dispatchChannel === 'email' ? customSubject : undefined,
        mensaje: customBody,
        fechaEnvio: new Date().toISOString().replace('T', ' ').slice(0, 16),
        leido: false,
        tipoEvento: selectedTemplate
      };

      onAddNotificacion(nueva);
      setIsSendingSimulated(false);
      setSendingDone(true);

      setTimeout(() => {
        setSendingDone(false);
      }, 3000);
    }, 1200);
  };

  const handleSelectAlerta = (alerta: Alerta) => {
    setSelectedAlertaId(alerta.id);
    setTargetVehiculoId(alerta.vehiculoId);
    const clienteAsociado = clientes.find(c => c.vehiculosAsociados?.includes(alerta.vehiculoId));
    if (clienteAsociado) setTargetClienteId(clienteAsociado.id);
    const templateMap: Record<AlertaTipo, NotificacionCliente['tipoEvento']> = {
      itv: 'itv_proxima',
      seguro: 'vencimiento_seguro',
      mantenimiento: 'mantenimiento_preventivo',
      impuesto: 'mantenimiento_preventivo',
    };
    setSelectedTemplate(templateMap[alerta.tipo]);
  };

  const handleResolveAlertClick = (alerta: Alerta) => {
    const today = new Date();
    let title = '';
    let message = '';
    let onConfirm = () => {};

    // Para itv/seguro/impuesto NO se llama a onResolveAlerta: al cambiar la
    // fecha del vehículo, un trigger en la base de datos reabre/actualiza
    // esta misma alerta con el nuevo vencimiento automáticamente (ver
    // supabase/schema.sql). Resolverla también desde aquí competiría con esa
    // actualización del servidor.
    if (alerta.tipo === 'itv') {
      const nuevaFecha = new Date(today.setFullYear(today.getFullYear() + 1)).toISOString().split('T')[0];
      title = 'Confirmar ITV realizada';
      message = `La fecha de vencimiento técnico de la ITV se actualizará a ${nuevaFecha} (+1 año) y la alerta se reprogramará automáticamente.`;
      onConfirm = () => { onTriggerAutoRenew(alerta.vehiculoId, 'itv', nuevaFecha); };
    } else if (alerta.tipo === 'seguro') {
      const nuevaFecha = new Date(today.setFullYear(today.getFullYear() + 1)).toISOString().split('T')[0];
      title = 'Confirmar renovación de seguro';
      message = `El vencimiento de la póliza de seguro se actualizará a ${nuevaFecha} (+1 año) y la alerta se reprogramará automáticamente.`;
      onConfirm = () => { onTriggerAutoRenew(alerta.vehiculoId, 'seguro', nuevaFecha); };
    } else if (alerta.tipo === 'impuesto') {
      const nuevaFecha = new Date(today.setFullYear(today.getFullYear() + 1)).toISOString().split('T')[0];
      title = 'Confirmar pago de impuesto de circulación';
      message = `La fecha del impuesto de circulación se actualizará a ${nuevaFecha} (+1 año) y la alerta se reprogramará automáticamente.`;
      onConfirm = () => { onTriggerAutoRenew(alerta.vehiculoId, 'impuesto', nuevaFecha); };
    } else if (alerta.tipo === 'mantenimiento') {
      const targetVeh = vehiculos.find(v => v.id === alerta.vehiculoId);
      const nextMaintKm = (targetVeh ? targetVeh.kilometraje : 0) + 15000;
      title = 'Confirmar mantenimiento realizado';
      message = `La alerta de kilometraje se pospondrá 15.000 km (próxima revisión recomendada: ${nextMaintKm.toLocaleString()} km).`;
      onConfirm = () => { onTriggerAutoRenew(alerta.vehiculoId, 'mantenimiento', nextMaintKm.toString()); onResolveAlerta(alerta.id); };
    }

    setConfirmAlerta({ isOpen: true, title, message, onConfirm });
  };

  const filteredAlertas = alertas.filter(al => {
    if (selectedTipoFilter === 'all') return true;
    return al.tipo === selectedTipoFilter;
  });

  const activas = alertas.filter(al => al.estado !== 'atendida');
  const proximasAVencer = activas.filter(al => estaProximaAVencer(al, vehiculos.find(v => v.id === al.vehiculoId))).length;
  const atendidas = alertas.length - activas.length;

  return (
    <div className="space-y-6 text-slate-700" id="alerts-notifications-tab-root">

      {/* Resumen del monitor */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white border border-slate-200 rounded-2xl p-5">
          <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Alertas activas</p>
          <p className="text-2xl font-bold text-slate-800 mt-1">{activas.length}</p>
        </div>
        <div className="bg-white border border-slate-200 rounded-2xl p-5">
          <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Próximas a vencer</p>
          <p className={`text-2xl font-bold mt-1 ${proximasAVencer > 0 ? 'text-amber-600' : 'text-slate-800'}`}>{proximasAVencer}</p>
        </div>
        <div className="bg-white border border-slate-200 rounded-2xl p-5">
          <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Atendidas</p>
          <p className="text-2xl font-bold text-emerald-600 mt-1">{atendidas}</p>
        </div>
      </div>

      {/* Monitor de alertas */}
      <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm space-y-4">
        <div>
          <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-amber-500" />
            Alertas Preventivas del Sistema de Flotas
          </h2>
          <p className="text-xs text-slate-400">ITV, seguro, impuesto y mantenimiento se crean y renuevan solas al registrar los vencimientos del vehículo</p>
        </div>

        <div className="flex gap-2 p-1 border-slate-100 border text-xs bg-slate-50/40 rounded-lg w-full sm:w-fit">
          {['all', 'itv', 'seguro', 'impuesto', 'mantenimiento'].map(tipo => (
            <button
              key={tipo}
              onClick={() => setSelectedTipoFilter(tipo)}
              className={`flex-1 py-1 px-2.5 font-bold capitalize text-[10px] rounded transition-all cursor-pointer ${
                selectedTipoFilter === tipo ? 'bg-white text-slate-800 shadow-3xs' : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              {tipo === 'all' ? 'Ver Todas' : tipo}
            </button>
          ))}
        </div>

        <div className="space-y-3.5 max-h-[560px] overflow-y-auto pr-1" id="active-alerts-scroller">
          {filteredAlertas.length === 0 ? (
            <div className="text-center py-10 bg-slate-50 border border-slate-100 rounded-xl text-slate-400 text-xs">
              <Check className="w-6 h-6 text-blue-500 mx-auto mb-2" />
              No se registran alertas preventivas activas en este momento.
            </div>
          ) : (
            filteredAlertas.map(al => {
              const veh = vehiculos.find(v => v.id === al.vehiculoId);
              const proxima = al.estado !== 'atendida' && estaProximaAVencer(al, veh);
              return (
                <div
                  key={al.id}
                  id={`alert-card-${al.id}`}
                  onClick={() => handleSelectAlerta(al)}
                  className={`p-4 rounded-xl border transition-colors cursor-pointer ${
                    selectedAlertaId === al.id
                      ? 'border-2 border-blue-400 bg-blue-50/50 shadow-sm shadow-blue-100'
                      : al.estado === 'activa'
                      ? 'border-rose-200 bg-rose-50/40 hover:border-rose-300'
                      : al.estado === 'pendiente'
                      ? 'border-amber-200 bg-amber-50/30 hover:border-amber-300'
                      : 'border-slate-200 bg-slate-50 hover:border-slate-300'
                  }`}
                >
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                    <div className="space-y-1">
                      <div className="flex items-center gap-1.5">
                        <span className={`px-2 py-0.5 rounded text-[9px] font-extrabold uppercase ${
                          al.tipo === 'itv' ? 'bg-amber-100 text-amber-800' :
                          al.tipo === 'seguro' ? 'bg-red-100 text-red-800' : 'bg-blue-100 text-blue-800'
                        }`}>
                          {al.tipo}
                        </span>
                        {veh && (
                          <strong className="text-xs text-slate-800 font-bold">{veh.marca} ({veh.matricula})</strong>
                        )}
                      </div>
                      <p className="text-xs text-slate-600 font-medium leading-relaxed">{al.descripcion}</p>
                      {al.fechaLimite && (
                        <div className="text-[10px] text-slate-400 font-semibold flex items-center gap-1">
                          <Calendar className="w-3 h-3 text-slate-400" /> Vencimiento: {formatDate(al.fechaLimite)}
                        </div>
                      )}
                    </div>

                    {al.estado !== 'atendida' ? (
                      <button
                        onClick={e => { e.stopPropagation(); handleResolveAlertClick(al); }}
                        id={`btn-resolve-alert-${al.id}`}
                        className="w-full sm:w-auto px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded text-[10px] font-bold transition duration-150 self-end sm:self-center cursor-pointer flex items-center gap-1 shrink-0 font-sans"
                      >
                        <Check className="w-3.5 h-3.5" /> Atender Alerta
                      </button>
                    ) : (
                      <span className="text-[10px] text-slate-400 font-bold uppercase shrink-0">✓ Atendida</span>
                    )}
                  </div>

                  {proxima && (
                    <div className="flex items-center gap-1 mt-3 pt-3 border-t border-slate-200/60 text-[10px] font-bold text-amber-700 bg-amber-50 px-2 py-1 rounded-full w-fit">
                      <Clock className="w-3 h-3" /> Próxima a vencer — conviene avisar al cliente
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Notificación manual al cliente */}
      <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm space-y-4">
        <div>
          <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2 font-display">
            <Sparkles className="w-5 h-5 text-blue-600" />
            Notificación Manual al Cliente
          </h2>
          <p className="text-xs text-slate-400">Redacta y registra un aviso por email, SMS o WhatsApp (envío automático aún no activado)</p>
        </div>
        {selectedAlertaId && (
          <div className="flex items-center gap-2 px-3 py-2 bg-blue-50 border border-blue-200 rounded-lg text-xs text-blue-700 font-semibold">
            <Bell className="w-3.5 h-3.5 shrink-0" />
            Formulario precargado desde la alerta seleccionada
            <button onClick={() => setSelectedAlertaId(null)} className="ml-auto text-blue-400 hover:text-blue-700 cursor-pointer">✕</button>
          </div>
        )}

        {clientes.length === 0 || vehiculos.length === 0 ? (
          <div className="text-center py-10 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-400">
            Registre algún cliente y vehículo para poder enviar notificaciones.
          </div>
        ) : (
          <form onSubmit={handleDispatchSubmit} className="p-4.5 bg-slate-50/40 border border-slate-100 rounded-xl space-y-3.5 grid grid-cols-1 sm:grid-cols-2 gap-x-4 sm:gap-y-0 gap-y-3.5" id="notif-dispatch-form">
            <div className="space-y-1">
              <label className="block text-[10px] font-bold text-slate-500 uppercase">Destinatario (Cliente)</label>
              <select
                value={targetClienteId}
                onChange={e => setTargetClienteId(e.target.value)}
                className="w-full px-2.5 py-1.5 border border-slate-200 bg-white rounded-lg text-xs font-semibold text-slate-700 focus:outline-none"
              >
                {clientes.map(c => (
                  <option key={c.id} value={c.id}>{c.nombre} {c.apellidos}</option>
                ))}
              </select>
            </div>

            <div className="space-y-1">
              <label className="block text-[10px] font-bold text-slate-500 uppercase">Vehículo</label>
              <select
                value={targetVehiculoId}
                onChange={e => setTargetVehiculoId(e.target.value)}
                className="w-full px-2.5 py-1.5 border border-slate-200 bg-white rounded-lg text-xs font-semibold text-slate-700 focus:outline-none"
              >
                {vehiculos.map(v => (
                  <option key={v.id} value={v.id}>{v.marca} ({v.matricula})</option>
                ))}
              </select>
            </div>

            <div className="space-y-1 sm:col-span-2">
              <label className="block text-[10px] font-bold text-slate-500 uppercase">Motivo / Plantilla</label>
              <select
                value={selectedTemplate}
                onChange={e => setSelectedTemplate(e.target.value as NotificacionCliente['tipoEvento'])}
                className="w-full px-2.5 py-1.5 border border-slate-200 bg-white rounded-lg text-xs font-semibold text-slate-700 focus:outline-none"
              >
                <option value="mantenimiento_preventivo">⚙️ Mantenimiento Técnico Programado</option>
                <option value="itv_proxima">⚠️ Vencimiento de ITV Próximo</option>
                <option value="reserva_confirmada">📅 Confirmación de Reserva Alquiler</option>
                <option value="vencimiento_seguro">🛡️ Alerta Renovación Póliza Seguro</option>
                <option value="reparacion_lista">🔧 Vehículo reparado listo para entrega</option>
              </select>
            </div>

            <div className="space-y-1 sm:col-span-2">
              <label className="block text-[10px] font-bold text-slate-500 uppercase">Canal de Envío</label>
              <div className="grid grid-cols-3 gap-2">
                {(['email', 'sms', 'whatsapp'] as const).map(ch => (
                  <button
                    key={ch}
                    type="button"
                    onClick={() => setDispatchChannel(ch)}
                    className={`py-1 rounded-lg border text-xs font-bold transition capitalize flex items-center justify-center gap-1 cursor-pointer font-sans ${
                      dispatchChannel === ch
                        ? 'bg-blue-600 text-white border-blue-600'
                        : 'bg-white text-slate-600 border-slate-200'
                    }`}
                  >
                    {ch === 'email' ? <Mail className="w-3 h-3" /> : ch === 'whatsapp' ? <MessageSquare className="w-3 h-3" /> : <Phone className="w-3 h-3" />}
                    {ch}
                  </button>
                ))}
              </div>
            </div>

            {dispatchChannel === 'email' && (
              <div className="space-y-1 sm:col-span-2">
                <label className="block text-[10px] font-bold text-slate-500 uppercase">Asunto del Correo</label>
                <input
                  type="text"
                  value={customSubject}
                  onChange={e => setCustomSubject(e.target.value)}
                  className="w-full px-3 py-1 border border-slate-200 bg-white rounded-lg text-xs focus:outline-none"
                />
              </div>
            )}

            <div className="space-y-1 sm:col-span-2">
              <label className="block text-[10px] font-bold text-slate-500 uppercase">Mensaje</label>
              <textarea
                rows={4}
                value={customBody}
                onChange={e => setCustomBody(e.target.value)}
                className="w-full p-2.5 border border-slate-200 bg-white font-semibold text-slate-600 rounded-lg text-xs leading-relaxed focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>

            <div className="flex justify-end gap-2 text-xs sm:col-span-2">
              {sendingDone && (
                <span className="text-blue-600 font-bold flex items-center gap-1 animate-bounce">
                  ✓ ¡Notificación registrada!
                </span>
              )}
              <button
                type="submit"
                disabled={isSendingSimulated}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition flex items-center gap-1 cursor-pointer font-sans"
              >
                {isSendingSimulated ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" /> Enviando...
                  </>
                ) : (
                  <>
                    <Send className="w-3.5 h-3.5" /> Enviar Notificación
                  </>
                )}
              </button>
            </div>
          </form>
        )}
      </div>

      {/* Dispatched history logs */}
      <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm space-y-4">
        <div>
          <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5 font-display">
            <MessageSquare className="w-4 h-4 text-blue-600" />
            Bandeja de Salida (Registro de Comunicaciones Despachadas)
          </h3>
          <p className="text-[11px] text-slate-400">Mensajes enviados a los titulares para recordatorios ITV/mantenimientos</p>
        </div>

        <div className="space-y-2 max-h-[220px] overflow-y-auto">
          {notificaciones.length === 0 ? (
            <div className="text-center py-6 text-slate-400 text-xs">Ninguna notificación despachada registrada.</div>
          ) : (
            [...notificaciones].reverse().map(not => {
              const cli = clientes.find(c => c.id === not.clienteId);
              return (
                <div key={not.id} className="p-3 bg-slate-50 border border-slate-100 rounded-xl space-y-1.5 hover:bg-slate-100/50 transition">
                  <div className="flex justify-between items-center text-[10px] font-bold text-slate-400">
                    <span className="flex items-center gap-1">
                      {not.tipoEnvio === 'email' ? <Mail className="w-3 h-3 text-blue-500" /> : not.tipoEnvio === 'whatsapp' ? <MessageSquare className="w-3 h-3 text-emerald-500" /> : <Phone className="w-3 h-3 text-amber-500" />}
                      {cli ? `${cli.nombre} ${cli.apellidos}` : 'Cliente desconocido'} ({not.tipoEnvio.toUpperCase()})
                    </span>
                    <span>{formatDate(not.fechaEnvio)}</span>
                  </div>
                  {not.asunto && <strong className="text-slate-800 text-xs block font-bold">{not.asunto}</strong>}
                  <p className="text-xs text-slate-600 leading-relaxed font-semibold whitespace-pre-line">{not.mensaje}</p>

                  <div className="flex justify-between items-center text-[9px] text-slate-400 pt-1">
                    <span>Filtro evento: {not.tipoEvento.replace('_', ' ')}</span>
                    <button
                      onClick={() => onDeleteNotificacion(not.id)}
                      className="text-slate-400 hover:text-rose-600 text-[10px] shrink-0 cursor-pointer"
                    >
                      Eliminar Registro
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
      <ConfirmDialog
        isOpen={confirmAlerta.isOpen}
        title={confirmAlerta.title}
        message={confirmAlerta.message}
        confirmLabel="Sí, confirmar"
        variant="info"
        onConfirm={() => { confirmAlerta.onConfirm(); setConfirmAlerta(prev => ({ ...prev, isOpen: false })); }}
        onCancel={() => setConfirmAlerta(prev => ({ ...prev, isOpen: false }))}
      />
    </div>
  );
}
