import { useState, useEffect, useMemo } from 'react';
import { usePaginacion } from '../utils/usePaginacion';
import Pagination from './Pagination';
import { Alerta, NotificacionCliente, Cliente, Vehiculo, AlertaTipo, OrdenTrabajo } from '../types';
import {
  Bell, Check, MessageSquare, AlertTriangle, Mail, Calendar, Droplets, Send, Clock, BellOff, Search, ClipboardList
} from 'lucide-react';
import RenovarVencimientoModal from './RenovarVencimientoModal';
import { formatDate } from '../utils/dateFormat';
import { getEmpresaConfig } from '../data/empresaConfig';
import { genId } from '../utils/id';
import { hoyISO } from '../utils/fechas';
import { coincideBusqueda, estadoAlerta, ordenarAlertas, resumenAlertas, textoPlazo, DIAS_VENCE_PRONTO } from '../utils/alertasEstado';
import { esLunes, resumenSemanal } from '../utils/resumenSemanal';
import { avisosPendientes, clienteDelVehiculo, tipoEventoAceite, DIAS_ANTES_RECORDATORIO, type AvisoPendiente, type EtapaAviso } from '../utils/avisosAceite';
import { enlaceWhatsApp } from '../utils/tallerMecanico';
import type { EstadoFiltros } from '../utils/filtrosAceite';

interface AlertsNotificationsTabProps {
  alertas: Alerta[];
  notificaciones: NotificacionCliente[];
  clientes: Cliente[];
  vehiculos: Vehiculo[];
  /** Órdenes del taller: dicen quién es el cliente de cada coche y qué cambios de aceite se han entregado. */
  ordenesTrabajo?: OrdenTrabajo[];
  /** Check list de filtros de cada orden, para el resumen que se manda al cliente. */
  filtrosOT?: Record<string, EstadoFiltros>;
  onAddNotificacion: (notif: NotificacionCliente) => void;
  onDeleteNotificacion: (id: string) => void;
  onTriggerAutoRenew: (vehiculoId: string, tipo: AlertaTipo, nuevaFecha: string) => void;
}

const NOMBRE_TIPO: Record<AlertaTipo, string> = { itv: 'ITV', seguro: 'Seguro', impuesto: 'Impuesto', aceite: 'Cambio de aceite' };
const ETIQUETA_ETAPA: Record<EtapaAviso, string> = { entrega: 'Resumen de entrega', recordatorio: 'Recordatorio', vencido: 'Cambio pasado de fecha' };
const COLOR_ETAPA: Record<EtapaAviso, string> = { entrega: 'bg-emerald-100 text-emerald-800', recordatorio: 'bg-blue-100 text-blue-800', vencido: 'bg-rose-100 text-rose-800' };
const ETIQUETA_EVENTO: Record<NotificacionCliente['tipoEvento'], string> = {
  mantenimiento_preventivo: 'Mantenimiento', itv_proxima: 'ITV próxima', reserva_confirmada: 'Reserva confirmada', vencimiento_seguro: 'Seguro',
  reparacion_lista: 'Reparación lista', aceite_entrega: 'Resumen de entrega (aceite)', aceite_recordatorio: 'Recordatorio de aceite', aceite_vencido: 'Aceite pasado de fecha',
};
const COLOR_PLAZO = {
  vencida: 'bg-rose-100 text-rose-800', pronto: 'bg-amber-100 text-amber-800', programada: 'bg-slate-100 text-slate-600', atendida: 'bg-emerald-50 text-emerald-700',
} as const;

const abrir = (url: string) => { window.open(url, '_blank', 'noopener,noreferrer'); };
const enlaceCorreo = (correo: string, asunto: string, mensaje: string) => `mailto:${correo}?subject=${encodeURIComponent(asunto)}&body=${encodeURIComponent(mensaje)}`;
const ahoraTexto = () => {
  const d = new Date(), dos = (n: number) => String(n).padStart(2, '0');
  return `${hoyISO()} ${dos(d.getHours())}:${dos(d.getMinutes())}`;
};

export default function AlertsNotificationsTab({
  alertas,
  notificaciones,
  clientes,
  vehiculos,
  ordenesTrabajo = [],
  filtrosOT = {},
  onAddNotificacion,
  onDeleteNotificacion,
  onTriggerAutoRenew
}: AlertsNotificationsTabProps) {

  const empresa = getEmpresaConfig();
  const hoy = hoyISO();
  const [selectedTipoFilter, setSelectedTipoFilter] = useState<string>('all');
  const [busqueda, setBusqueda] = useState('');
  const [selectedAlertaId, setSelectedAlertaId] = useState<string | null>(null);
  // Alerta que se está cerrando (elige cuándo se hizo y el nuevo vencimiento en un cuadro propio).
  const [renovando, setRenovando] = useState<{ alerta: Alerta; titulo: string; etiqueta: string } | null>(null);
  // Texto de cada aviso pendiente si el taller lo ha editado antes de enviarlo.
  const [textos, setTextos] = useState<Record<string, string>>({});

  // Aviso manual
  const [targetClienteId, setTargetClienteId] = useState(() => clientes[0]?.id ?? '');
  const [targetVehiculoId, setTargetVehiculoId] = useState(() => vehiculos[0]?.id ?? '');
  const [selectedTemplate, setSelectedTemplate] = useState<NotificacionCliente['tipoEvento']>('aceite_recordatorio');
  const [customSubject, setCustomSubject] = useState('');
  const [customBody, setCustomBody] = useState('');
  const [registrado, setRegistrado] = useState(false);

  useEffect(() => {
    if (clientes.length > 0 && !targetClienteId) setTargetClienteId(clientes[0].id);
    if (vehiculos.length > 0 && !targetVehiculoId) setTargetVehiculoId(vehiculos[0].id);
  }, [clientes, vehiculos]);

  // Texto de la plantilla elegida con los datos del cliente y del coche.
  useEffect(() => {
    const cli = clientes.find(c => c.id === targetClienteId);
    const veh = vehiculos.find(v => v.id === targetVehiculoId);
    if (!cli || !veh) return;
    const coche = `${veh.marca} ${veh.modelo} (${veh.matricula})`;
    if (selectedTemplate === 'aceite_recordatorio' || selectedTemplate === 'aceite_vencido' || selectedTemplate === 'aceite_entrega' || selectedTemplate === 'mantenimiento_preventivo') {
      setCustomSubject(`Cambio de aceite de su ${veh.marca} ${veh.matricula}`);
      setCustomBody(`Hola ${cli.nombre},\n\nLe recordamos que el próximo cambio de aceite de su ${coche}${veh.aceiteProximaFecha ? ` está previsto para el ${formatDate(veh.aceiteProximaFecha)}${veh.aceiteProximoKm != null ? ` o a los ${veh.aceiteProximoKm.toLocaleString('es-ES')} km, lo que ocurra antes` : ''}` : ' se acerca'}. Para pedir cita, llámenos o escríbanos${empresa.telefono ? ` al ${empresa.telefono}` : ''}.\n\n${empresa.nombre}`);
    } else if (selectedTemplate === 'itv_proxima') {
      setCustomSubject(`Recordatorio de ITV: ${veh.marca} ${veh.matricula}`);
      setCustomBody(`Hola ${cli.nombre},\n\nLe recordamos que la ITV de su ${coche} caduca el ${formatDate(veh.itvVencimiento)}.\n\n${empresa.nombre}`);
    } else if (selectedTemplate === 'reserva_confirmada') {
      setCustomSubject(`Confirmación de su reserva: ${veh.marca}`);
      setCustomBody(`Hola ${cli.nombre},\n\nConfirmamos su reserva del ${coche}. ¡Gracias!\n\n${empresa.nombre}`);
    } else if (selectedTemplate === 'vencimiento_seguro') {
      setCustomSubject(`Seguro próximo a vencer: ${veh.marca}`);
      setCustomBody(`Hola ${cli.nombre},\n\nLa póliza de seguro del ${coche} vence el ${formatDate(veh.seguroVencimiento)}.\n\n${empresa.nombre}`);
    } else {
      setCustomSubject(`Su vehículo está listo: ${veh.marca} ${veh.matricula}`);
      setCustomBody(`Hola ${cli.nombre},\n\nLa reparación de su ${coche} ha terminado. Puede pasar a recogerlo.\n\n${empresa.nombre}`);
    }
  }, [targetClienteId, targetVehiculoId, selectedTemplate]);

  const pendientes = useMemo(
    () => avisosPendientes({ vehiculos, ordenes: ordenesTrabajo, clientes, notificaciones, filtrosOT, empresa: { nombre: empresa.nombre, telefono: empresa.telefono }, hoy }),
    [vehiculos, ordenesTrabajo, clientes, notificaciones, filtrosOT, empresa.nombre, empresa.telefono, hoy],
  );

  const registrar = (n: Omit<NotificacionCliente, 'id' | 'fechaEnvio' | 'leido'>) =>
    onAddNotificacion({ ...n, id: genId('not'), fechaEnvio: ahoraTexto(), leido: false });

  // Abre el chat o el correo con el texto escrito y lo anota como avisado: así deja de aparecer en «Toca avisar».
  const enviarPendiente = (a: AvisoPendiente, canal: 'whatsapp' | 'email') => {
    const mensaje = textos[a.clave] ?? a.mensaje;
    abrir(canal === 'whatsapp' ? enlaceWhatsApp(a.telefono, mensaje) : enlaceCorreo(a.correo, a.asunto, mensaje));
    registrar({ clienteId: a.cliente.id, vehiculoId: a.vehiculo.id, tipoEnvio: canal, asunto: canal === 'email' ? a.asunto : undefined, mensaje, tipoEvento: tipoEventoAceite(a.etapa), referencia: a.referencia });
  };
  const descartarPendiente = (a: AvisoPendiente) =>
    registrar({ clienteId: a.cliente.id, vehiculoId: a.vehiculo.id, tipoEnvio: 'omitido', mensaje: 'Aviso descartado por el taller.', tipoEvento: tipoEventoAceite(a.etapa), referencia: a.referencia });

  const enviarManual = (canal: 'whatsapp' | 'email') => {
    const cli = clientes.find(c => c.id === targetClienteId);
    if (!cli || !customBody) return;
    abrir(canal === 'whatsapp' ? enlaceWhatsApp(cli.telefono, customBody) : enlaceCorreo(cli.correo, customSubject, customBody));
    registrar({ clienteId: cli.id, vehiculoId: targetVehiculoId || undefined, tipoEnvio: canal, asunto: canal === 'email' ? customSubject : undefined, mensaje: customBody, tipoEvento: selectedTemplate });
    setRegistrado(true);
    setTimeout(() => setRegistrado(false), 3000);
  };

  const handleSelectAlerta = (alerta: Alerta) => {
    setSelectedAlertaId(alerta.id);
    setTargetVehiculoId(alerta.vehiculoId);
    const cliente = clienteDelVehiculo(alerta.vehiculoId, ordenesTrabajo, clientes) ?? clientes.find(c => c.vehiculosAsociados?.includes(alerta.vehiculoId));
    if (cliente) setTargetClienteId(cliente.id);
    const plantilla: Record<AlertaTipo, NotificacionCliente['tipoEvento']> = { itv: 'itv_proxima', seguro: 'vencimiento_seguro', impuesto: 'itv_proxima', aceite: 'aceite_recordatorio' };
    setSelectedTemplate(plantilla[alerta.tipo]);
  };

  // Atender una alerta cambia la fecha del vehículo; un trigger de la base de datos reabre/actualiza esta misma alerta con el nuevo vencimiento.
  const handleResolveAlertClick = (alerta: Alerta) => {
    const modal: Record<AlertaTipo, { titulo: string; etiqueta: string }> = {
      itv: { titulo: 'ITV realizada', etiqueta: 'la ITV' },
      seguro: { titulo: 'Renovación de seguro', etiqueta: 'renovación' },
      impuesto: { titulo: 'Pago del impuesto de circulación', etiqueta: 'pago' },
      aceite: { titulo: 'Cambio de aceite realizado', etiqueta: 'el cambio de aceite' },
    };
    setRenovando({ alerta, titulo: modal[alerta.tipo].titulo, etiqueta: modal[alerta.tipo].etiqueta });
  };

  const filteredAlertas = useMemo(
    () => ordenarAlertas(
      alertas.filter(al => (selectedTipoFilter === 'all' || al.tipo === selectedTipoFilter) && coincideBusqueda(vehiculos.find(v => v.id === al.vehiculoId), busqueda)),
      hoy,
    ),
    [alertas, vehiculos, selectedTipoFilter, busqueda, hoy],
  );
  const resumenDeLaSemana = useMemo(
    () => resumenSemanal({ alertas, vehiculos, avisosPendientes: pendientes.length, hoy, empresa: empresa.nombre }),
    [alertas, vehiculos, pendientes.length, hoy, empresa.nombre],
  );
  const resumen = resumenAlertas(alertas, hoy);

  const pagAlertas = usePaginacion(filteredAlertas, 'alertas', `${selectedTipoFilter}|${busqueda}`);
  const avisosOrdenados = [...notificaciones].reverse();
  const pagAvisos = usePaginacion(avisosOrdenados, 'avisos');

  /** Último aviso de aceite registrado para un coche, para enseñarlo en su alerta. */
  const ultimoAvisoAceite = (vehiculoId: string) =>
    [...notificaciones].reverse().find(n => n.vehiculoId === vehiculoId && n.tipoEnvio !== 'omitido' && n.tipoEvento.startsWith('aceite_'));

  const clienteManual = clientes.find(c => c.id === targetClienteId);

  return (
    <div className="space-y-6 text-slate-700" id="alerts-notifications-tab-root">

      {/* Resumen del monitor */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-white border border-slate-200 rounded-2xl p-5" data-testid="resumen-vencidas">
          <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Vencidas</p>
          <p className={`text-2xl font-bold mt-1 ${resumen.vencidas > 0 ? 'text-rose-600' : 'text-slate-800'}`}>{resumen.vencidas}</p>
        </div>
        <div className="bg-white border border-slate-200 rounded-2xl p-5" data-testid="resumen-pronto">
          <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Vencen en {DIAS_VENCE_PRONTO} días</p>
          <p className={`text-2xl font-bold mt-1 ${resumen.pronto > 0 ? 'text-amber-600' : 'text-slate-800'}`}>{resumen.pronto}</p>
        </div>
        <div className="bg-white border border-slate-200 rounded-2xl p-5" data-testid="resumen-programadas">
          <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Programadas</p>
          <p className="text-2xl font-bold text-slate-800 mt-1">{resumen.programadas}</p>
        </div>
        <div className="bg-white border border-slate-200 rounded-2xl p-5">
          <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Atendidas</p>
          <p className="text-2xl font-bold text-emerald-600 mt-1">{resumen.atendidas}</p>
        </div>
      </div>

      {/* Resumen semanal: los lunes */}
      <div data-testid="resumen-semanal" className={`p-5 rounded-2xl border shadow-sm space-y-3 ${esLunes(hoy) ? 'bg-blue-50/60 border-blue-200' : 'bg-white border-slate-100'}`}>
        <div className="flex flex-wrap items-center gap-2">
          <h2 className="text-sm font-bold text-slate-800 flex items-center gap-2"><ClipboardList className="w-4 h-4 text-blue-600" /> Resumen de la semana</h2>
          {esLunes(hoy) && <span data-testid="resumen-lunes" className="text-[11px] font-bold bg-blue-600 text-white rounded-full px-2 py-0.5">Hoy es lunes: toca enviarlo</span>}
        </div>
        <pre data-testid="texto-resumen-semanal" className="whitespace-pre-wrap font-sans text-xs text-slate-600 bg-white border border-slate-200 rounded-xl p-3 max-h-64 overflow-auto">{resumenDeLaSemana.texto}</pre>
        <div className="flex flex-wrap items-center gap-2 text-xs font-bold">
          <button type="button" onClick={() => abrir(enlaceWhatsApp(undefined, resumenDeLaSemana.texto))}
            className="px-3 py-1.5 rounded-lg bg-green-600 hover:bg-green-500 text-white inline-flex items-center gap-1 cursor-pointer"><MessageSquare className="w-3.5 h-3.5" /> Enviar por WhatsApp</button>
          <button type="button" onClick={() => abrir(enlaceCorreo(empresa.correo, resumenDeLaSemana.asunto, resumenDeLaSemana.texto))}
            className="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white inline-flex items-center gap-1 cursor-pointer"><Mail className="w-3.5 h-3.5" /> Enviar por correo</button>
          <span className="text-[11px] font-normal text-slate-400">Al pulsar se abre con el texto escrito; tú eliges a quién. Todavía no se envía solo.</span>
        </div>
      </div>

      {/* Toca avisar a clientes */}
      <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm space-y-4" data-testid="toca-avisar">
        <div>
          <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
            <Droplets className="w-5 h-5 text-amber-500" />
            Toca avisar a clientes
            {pendientes.length > 0 && <span className="text-xs font-bold bg-amber-100 text-amber-800 rounded-full px-2 py-0.5">{pendientes.length}</span>}
          </h2>
          <p className="text-xs text-slate-400">
            Cambio de aceite de los coches de clientes del taller. Solo salen tres avisos por cambio (resumen al entregar, recordatorio {DIAS_ANTES_RECORDATORIO} días antes y, si pasa una semana, un último aviso) y cada uno una sola vez.
            Al pulsar WhatsApp o Correo se abre con el texto escrito y queda anotado como avisado.
          </p>
        </div>
        {pendientes.length === 0 ? (
          <div className="text-center py-6 bg-slate-50 border border-slate-100 rounded-xl text-slate-400 text-xs">
            <Check className="w-5 h-5 text-emerald-500 mx-auto mb-1" /> No hay avisos pendientes hoy.
          </div>
        ) : (
          <ul className="space-y-3">
            {pendientes.map(a => (
              <li key={a.clave} data-testid="aviso-pendiente" className="p-4 border border-slate-200 rounded-xl space-y-2.5 bg-slate-50/40">
                <div className="flex flex-wrap items-center gap-2">
                  <span className={`px-2 py-0.5 rounded text-[10px] font-extrabold uppercase ${COLOR_ETAPA[a.etapa]}`}>{ETIQUETA_ETAPA[a.etapa]}</span>
                  <strong className="text-sm text-slate-800">{a.cliente.nombre} {a.cliente.apellidos}</strong>
                  <span className="text-xs text-slate-500">· {a.vehiculo.marca} {a.vehiculo.modelo} ({a.vehiculo.matricula})</span>
                  <span className="text-[11px] font-semibold text-slate-400 sm:ml-auto">{a.motivo}</span>
                </div>
                {a.sinProximoCambio && (
                  <p data-testid="aviso-sin-proximo" className="text-[11px] font-semibold text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-2 py-1">
                    Falta anotar el próximo cambio en la ficha del vehículo: este mensaje saldría sin fecha.
                  </p>
                )}
                <textarea
                  aria-label={`Mensaje para ${a.cliente.nombre}`} rows={a.etapa === 'entrega' ? 7 : 4}
                  value={textos[a.clave] ?? a.mensaje}
                  onChange={e => setTextos(prev => ({ ...prev, [a.clave]: e.target.value }))}
                  className="w-full p-2.5 border border-slate-200 bg-white text-slate-600 rounded-lg text-xs leading-relaxed focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
                <div className="flex flex-wrap items-center gap-2 text-xs font-bold">
                  <button type="button" disabled={!a.telefono} onClick={() => enviarPendiente(a, 'whatsapp')}
                    className="px-3 py-1.5 rounded-lg bg-green-600 hover:bg-green-500 text-white inline-flex items-center gap-1 cursor-pointer disabled:bg-slate-200 disabled:text-slate-400 disabled:cursor-not-allowed">
                    <MessageSquare className="w-3.5 h-3.5" /> {a.telefono ? 'WhatsApp' : 'Sin teléfono'}
                  </button>
                  <button type="button" disabled={!a.correo} onClick={() => enviarPendiente(a, 'email')}
                    className="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white inline-flex items-center gap-1 cursor-pointer disabled:bg-slate-200 disabled:text-slate-400 disabled:cursor-not-allowed">
                    <Mail className="w-3.5 h-3.5" /> {a.correo ? 'Correo' : 'Sin correo'}
                  </button>
                  <button type="button" onClick={() => descartarPendiente(a)} title="Queda anotado y no vuelve a salir"
                    className="px-3 py-1.5 rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-100 inline-flex items-center gap-1 cursor-pointer ml-auto">
                    <BellOff className="w-3.5 h-3.5" /> No avisar
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Monitor de alertas */}
      <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm space-y-4">
        <div>
          <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-amber-500" />
            Vencimientos de la flota
          </h2>
          <p className="text-xs text-slate-400">ITV, seguro, impuesto y cambio de aceite se crean y renuevan solos con las fechas de la ficha del vehículo. Lo más urgente va arriba.</p>
        </div>

        <div className="flex flex-wrap gap-2 p-1 border-slate-100 border text-xs bg-slate-50/40 rounded-lg w-full sm:w-fit">
          {['all', 'itv', 'seguro', 'impuesto', 'aceite'].map(tipo => (
            <button
              key={tipo}
              onClick={() => setSelectedTipoFilter(tipo)}
              className={`flex-1 py-1 px-2.5 font-bold text-[10px] rounded transition-all cursor-pointer ${
                selectedTipoFilter === tipo ? 'bg-white text-slate-800 shadow-3xs' : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              {tipo === 'all' ? 'Ver todas' : NOMBRE_TIPO[tipo as AlertaTipo]}
            </button>
          ))}
        </div>

        <div className="relative max-w-sm">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input type="search" data-testid="buscador-vencimientos" aria-label="Buscar vencimiento por matrícula" placeholder="Buscar por matrícula, marca o modelo…" value={busqueda} onChange={e => setBusqueda(e.target.value)}
            className="w-full pl-8 pr-3 py-2 border border-slate-200 rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-blue-500" />
        </div>

        <div className="space-y-3.5" id="active-alerts-scroller">
          {filteredAlertas.length === 0 ? (
            <div className="text-center py-10 bg-slate-50 border border-slate-100 rounded-xl text-slate-400 text-xs">
              <Check className="w-6 h-6 text-blue-500 mx-auto mb-2" />
              {busqueda.trim() ? `Ningún vencimiento coincide con «${busqueda.trim()}».` : 'No hay vencimientos en este momento.'}
            </div>
          ) : (
            pagAlertas.items.map(al => {
              const veh = vehiculos.find(v => v.id === al.vehiculoId);
              const e = estadoAlerta(al, hoy);
              const cliente = al.tipo === 'aceite' ? clienteDelVehiculo(al.vehiculoId, ordenesTrabajo, clientes) : undefined;
              const ultimo = al.tipo === 'aceite' ? ultimoAvisoAceite(al.vehiculoId) : undefined;
              return (
                <div
                  key={al.id}
                  id={`alert-card-${al.id}`}
                  onClick={() => handleSelectAlerta(al)}
                  className={`p-4 rounded-xl border transition-colors cursor-pointer ${
                    selectedAlertaId === al.id
                      ? 'border-2 border-blue-400 bg-blue-50/50 shadow-sm shadow-blue-100'
                      : e === 'vencida' ? 'border-rose-200 bg-rose-50/40 hover:border-rose-300'
                      : e === 'pronto' ? 'border-amber-200 bg-amber-50/30 hover:border-amber-300'
                      : 'border-slate-200 bg-slate-50 hover:border-slate-300'
                  }`}
                >
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                    <div className="space-y-1">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <span className="px-2 py-0.5 rounded text-[9px] font-extrabold uppercase bg-slate-200 text-slate-700">{NOMBRE_TIPO[al.tipo]}</span>
                        <span data-testid="plazo-alerta" className={`px-2 py-0.5 rounded text-[10px] font-bold ${COLOR_PLAZO[e]}`}>{textoPlazo(al, hoy)}</span>
                        {veh && <strong className="text-xs text-slate-800 font-bold">{veh.marca} ({veh.matricula})</strong>}
                      </div>
                      <p className="text-xs text-slate-600 font-medium leading-relaxed">{al.descripcion}</p>
                      {al.fechaLimite && (
                        <div className="text-[10px] text-slate-400 font-semibold flex items-center gap-1">
                          <Calendar className="w-3 h-3 text-slate-400" /> {al.tipo === 'aceite' ? 'Próximo cambio' : 'Vencimiento'}: {formatDate(al.fechaLimite)}
                        </div>
                      )}
                      {al.tipo === 'aceite' && (
                        <div className="text-[10px] font-semibold text-slate-500 flex items-center gap-1" data-testid="aceite-cliente">
                          <Clock className="w-3 h-3 text-slate-400" />
                          {cliente
                            ? <>Cliente: {cliente.nombre} {cliente.apellidos}{cliente.noAvisar ? ' (no quiere avisos)' : ultimo ? ` · último aviso: ${ETIQUETA_EVENTO[ultimo.tipoEvento]} por ${ultimo.tipoEnvio === 'whatsapp' ? 'WhatsApp' : ultimo.tipoEnvio === 'email' ? 'correo' : ultimo.tipoEnvio} el ${formatDate(ultimo.fechaEnvio.slice(0, 10))}` : ' · sin avisos todavía'}</>
                            : 'Flota propia: control interno, no se avisa a ningún cliente'}
                        </div>
                      )}
                    </div>

                    {al.estado !== 'atendida' ? (
                      <button
                        onClick={ev => { ev.stopPropagation(); handleResolveAlertClick(al); }}
                        id={`btn-resolve-alert-${al.id}`}
                        className="w-full sm:w-auto px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded text-[10px] font-bold transition duration-150 self-end sm:self-center cursor-pointer flex items-center gap-1 shrink-0 font-sans"
                      >
                        <Check className="w-3.5 h-3.5" /> Atender Alerta
                      </button>
                    ) : (
                      <span className="text-[10px] text-slate-400 font-bold uppercase shrink-0">✓ Atendida</span>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
        <Pagination {...pagAlertas.props} />
      </div>

      {/* Aviso manual */}
      <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm space-y-4">
        <div>
          <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
            <Send className="w-5 h-5 text-blue-600" />
            Aviso manual a un cliente
          </h2>
          <p className="text-xs text-slate-400">Para cualquier otro aviso. Se abre WhatsApp o tu correo con el texto escrito y queda anotado en el historial del cliente.</p>
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
            Registre algún cliente y vehículo para poder enviar avisos.
          </div>
        ) : (
          <form onSubmit={ev => ev.preventDefault()} className="p-4.5 bg-slate-50/40 border border-slate-100 rounded-xl space-y-3.5 grid grid-cols-1 sm:grid-cols-2 gap-x-4 sm:gap-y-0 gap-y-3.5" id="notif-dispatch-form">
            <div className="space-y-1">
              <label className="block text-[10px] font-bold text-slate-500 uppercase">Destinatario (Cliente)</label>
              <select value={targetClienteId} onChange={ev => setTargetClienteId(ev.target.value)}
                className="w-full px-2.5 py-1.5 border border-slate-200 bg-white rounded-lg text-xs font-semibold text-slate-700 focus:outline-none">
                {clientes.map(c => <option key={c.id} value={c.id}>{c.nombre} {c.apellidos}</option>)}
              </select>
            </div>

            <div className="space-y-1">
              <label className="block text-[10px] font-bold text-slate-500 uppercase">Vehículo</label>
              <select value={targetVehiculoId} onChange={ev => setTargetVehiculoId(ev.target.value)}
                className="w-full px-2.5 py-1.5 border border-slate-200 bg-white rounded-lg text-xs font-semibold text-slate-700 focus:outline-none">
                {vehiculos.map(v => <option key={v.id} value={v.id}>{v.marca} ({v.matricula})</option>)}
              </select>
            </div>

            <div className="space-y-1 sm:col-span-2">
              <label className="block text-[10px] font-bold text-slate-500 uppercase">Motivo / Plantilla</label>
              <select value={selectedTemplate} onChange={ev => setSelectedTemplate(ev.target.value as NotificacionCliente['tipoEvento'])}
                className="w-full px-2.5 py-1.5 border border-slate-200 bg-white rounded-lg text-xs font-semibold text-slate-700 focus:outline-none">
                <option value="aceite_recordatorio">Cambio de aceite</option>
                <option value="itv_proxima">Vencimiento de ITV</option>
                <option value="vencimiento_seguro">Renovación del seguro</option>
                <option value="reserva_confirmada">Confirmación de reserva</option>
                <option value="reparacion_lista">Vehículo reparado, listo para entrega</option>
              </select>
            </div>

            <div className="space-y-1 sm:col-span-2">
              <label className="block text-[10px] font-bold text-slate-500 uppercase">Asunto (solo para el correo)</label>
              <input type="text" value={customSubject} onChange={ev => setCustomSubject(ev.target.value)}
                className="w-full px-3 py-1 border border-slate-200 bg-white rounded-lg text-xs focus:outline-none" />
            </div>

            <div className="space-y-1 sm:col-span-2">
              <label className="block text-[10px] font-bold text-slate-500 uppercase">Mensaje</label>
              <textarea rows={4} value={customBody} onChange={ev => setCustomBody(ev.target.value)}
                className="w-full p-2.5 border border-slate-200 bg-white font-semibold text-slate-600 rounded-lg text-xs leading-relaxed focus:outline-none focus:ring-1 focus:ring-blue-500" />
            </div>

            <div className="flex flex-wrap justify-end items-center gap-2 text-xs sm:col-span-2">
              {registrado && <span className="text-blue-600 font-bold">✓ Anotado en el historial</span>}
              <button type="button" disabled={!clienteManual?.telefono} onClick={() => enviarManual('whatsapp')}
                className="px-4 py-2 bg-green-600 hover:bg-green-500 text-white rounded-xl font-bold inline-flex items-center gap-1 cursor-pointer disabled:bg-slate-200 disabled:text-slate-400 disabled:cursor-not-allowed">
                <MessageSquare className="w-3.5 h-3.5" /> {clienteManual?.telefono ? 'Abrir WhatsApp' : 'Sin teléfono'}
              </button>
              <button type="button" disabled={!clienteManual?.correo} onClick={() => enviarManual('email')}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-bold inline-flex items-center gap-1 cursor-pointer disabled:bg-slate-200 disabled:text-slate-400 disabled:cursor-not-allowed">
                <Mail className="w-3.5 h-3.5" /> {clienteManual?.correo ? 'Abrir correo' : 'Sin correo'}
              </button>
            </div>
          </form>
        )}
      </div>

      {/* Historial de avisos */}
      <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm space-y-4">
        <div>
          <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5 font-display">
            <MessageSquare className="w-4 h-4 text-blue-600" />
            Registro de avisos a clientes
          </h3>
          <p className="text-[11px] text-slate-400">Lo que se ha avisado (o descartado). Si eliminas un registro, ese aviso vuelve a salir en «Toca avisar» cuando corresponda.</p>
        </div>

        <div className="space-y-2">
          {notificaciones.length === 0 ? (
            <div className="text-center py-6 text-slate-400 text-xs">Todavía no hay avisos registrados.</div>
          ) : (
            pagAvisos.items.map(not => {
              const cli = clientes.find(c => c.id === not.clienteId);
              const veh = vehiculos.find(v => v.id === not.vehiculoId);
              const omitido = not.tipoEnvio === 'omitido';
              return (
                <div key={not.id} className="p-3 bg-slate-50 border border-slate-100 rounded-xl space-y-1.5 hover:bg-slate-100/50 transition">
                  <div className="flex justify-between items-center text-[10px] font-bold text-slate-400">
                    <span className="flex items-center gap-1">
                      {not.tipoEnvio === 'email' ? <Mail className="w-3 h-3 text-blue-500" /> : omitido ? <BellOff className="w-3 h-3 text-slate-400" /> : <MessageSquare className="w-3 h-3 text-emerald-500" />}
                      {cli ? `${cli.nombre} ${cli.apellidos}` : 'Cliente desconocido'} ({omitido ? 'DESCARTADO' : not.tipoEnvio === 'whatsapp' ? 'WHATSAPP' : not.tipoEnvio === 'email' ? 'CORREO' : not.tipoEnvio.toUpperCase()})
                      {veh && <span className="font-mono text-slate-400"> · {veh.matricula}</span>}
                    </span>
                    <span>{formatDate(not.fechaEnvio.slice(0, 10))}</span>
                  </div>
                  {not.asunto && <strong className="text-slate-800 text-xs block font-bold">{not.asunto}</strong>}
                  {!omitido && <p className="text-xs text-slate-600 leading-relaxed font-semibold whitespace-pre-line">{not.mensaje}</p>}

                  <div className="flex justify-between items-center text-[9px] text-slate-400 pt-1">
                    <span>{ETIQUETA_EVENTO[not.tipoEvento] ?? not.tipoEvento}</span>
                    <button onClick={() => onDeleteNotificacion(not.id)} className="text-slate-400 hover:text-rose-600 text-[10px] shrink-0 cursor-pointer">
                      Eliminar registro
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
        <Pagination {...pagAvisos.props} />
      </div>
      {renovando && (
        <RenovarVencimientoModal
          titulo={renovando.titulo}
          etiquetaRealizado={renovando.etiqueta}
          vencimientoAnterior={renovando.alerta.fechaLimite}
          {...(renovando.alerta.tipo === 'aceite' ? { etiquetaFecha: 'Fecha del cambio', etiquetaAnterior: 'Próximo cambio previsto', etiquetaNuevo: 'Próximo cambio' } : {})}
          onConfirm={nuevaFecha => { onTriggerAutoRenew(renovando.alerta.vehiculoId, renovando.alerta.tipo, nuevaFecha); setRenovando(null); }}
          onCancel={() => setRenovando(null)}
        />
      )}
    </div>
  );
}
