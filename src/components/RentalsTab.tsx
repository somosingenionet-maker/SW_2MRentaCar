import { useState } from 'react';
import { Reserva, Vehiculo, Cliente } from '../types';
import SearchableSelect from './SearchableSelect';
import {
  Calendar, Plus, User, Car, FileText, Check, X, Printer, Download, ChevronLeft, ChevronRight, MessageCircle, Mail as MailIcon
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import ConfirmDialog from './ConfirmDialog';
import Pagination from './Pagination';
import { formatDate } from '../utils/dateFormat';
import { downloadCsv, slugify } from '../utils/csvExport';
import { genId } from '../utils/id';
import { getEmpresaConfig } from '../data/mockData';

interface RentalsTabProps {
  reservas: Reserva[];
  vehiculos: Vehiculo[];
  clientes: Cliente[];
  onAddReserva: (reserva: Reserva) => void;
  onUpdateReserva: (reserva: Reserva) => void;
}

export default function RentalsTab({
  reservas,
  vehiculos,
  clientes,
  onAddReserva,
  onUpdateReserva
}: RentalsTabProps) {
  const [selectedReserva, setSelectedReserva] = useState<Reserva | null>(null);
  const [isAddingOpen, setIsAddingOpen] = useState(false);
  const [viewingContract, setViewingContract] = useState<Reserva | null>(null);

  // Form states
  const [formVehiculoId, setFormVehiculoId] = useState('');
  const [formClienteId, setFormClienteId] = useState('');
  const [formFechaInicio, setFormFechaInicio] = useState(new Date().toISOString().split('T')[0]);
  const [formFechaFin, setFormFechaFin] = useState(new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]);
  const [formTarifa, setFormTarifa] = useState<number>(45.00);
  const [formTemporada, setFormTemporada] = useState<'alta' | 'media' | 'baja'>('media');
  const [formSeguro, setFormSeguro] = useState(true);
  const [formError, setFormError] = useState('');
  const [confirmOverlap, setConfirmOverlap] = useState<{ isOpen: boolean; pendingReserva: Reserva | null }>({ isOpen: false, pendingReserva: null });
  const [confirmAnular, setConfirmAnular] = useState<{ isOpen: boolean; resId: string }>({ isOpen: false, resId: '' });
  const [currentPage, setCurrentPage] = useState(1);
  const PAGE_SIZE = 10;
  // Vista de la tabla de reservas: activas/próximas vs historial (finalizadas o anuladas).
  const [reservaView, setReservaView] = useState<'activas' | 'historial'>('activas');
  const [dayModal, setDayModal] = useState<{ iso: string; reservations: Reserva[] } | null>(null);
  const [calendarDate, setCalendarDate] = useState(() => {
    const d = new Date();
    return new Date(d.getFullYear(), d.getMonth(), 1);
  });

  // Helper calculation of days between dates
  const calculateDays = (start: string, end: string): number => {
    if (!start || !end) return 1;
    const date1 = new Date(start);
    const date2 = new Date(end);
    const diffTime = Math.abs(date2.getTime() - date1.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays || 1;
  };

  const currentDuration = calculateDays(formFechaInicio, formFechaFin);
  const calculatedTotal = currentDuration * formTarifa + (formSeguro ? currentDuration * 15 : 0);

  const handleOpenAdd = () => {
    setFormVehiculoId(vehiculos[0]?.id || '');
    setFormClienteId(clientes[0]?.id || '');
    setFormFechaInicio(new Date().toISOString().split('T')[0]);
    setFormFechaFin(new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]);
    setFormTemporada('media');
    setFormTarifa(vehiculos[0]?.tarifasAlquiler?.temporadaMedia ?? 45);
    setFormSeguro(true);
    setIsAddingOpen(true);
  };

  const buildReserva = (): Reserva => {
    const duration = calculateDays(formFechaInicio, formFechaFin);
    const total = duration * Number(formTarifa) + (formSeguro ? duration * 15 : 0);
    return {
      id: genId('res'),
      vehiculoId: formVehiculoId,
      clienteId: formClienteId,
      fechaInicio: formFechaInicio,
      fechaFin: formFechaFin,
      temporada: formTemporada,
      tarifaDiaria: Number(formTarifa),
      totalCobrado: total,
      estado: 'confirmada',
      incluyeSeguroTodoRiesgo: formSeguro
    };
  };

  const handleAddSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formVehiculoId || !formClienteId || !formFechaInicio || !formFechaFin) {
      setFormError('Por favor complete todos los datos requeridos.');
      return;
    }
    if (new Date(formFechaFin) < new Date(formFechaInicio)) {
      setFormError('La fecha de fin no puede ser anterior a la fecha de inicio.');
      return;
    }
    setFormError('');

    const overlaps = reservas.filter(res => {
      if (res.vehiculoId !== formVehiculoId || res.estado === 'cancelada') return false;
      const startA = new Date(res.fechaInicio).getTime();
      const endA = new Date(res.fechaFin).getTime();
      const startB = new Date(formFechaInicio).getTime();
      const endB = new Date(formFechaFin).getTime();
      return startB <= endA && startA <= endB;
    });

    if (overlaps.length > 0) {
      setConfirmOverlap({ isOpen: true, pendingReserva: buildReserva() });
      return;
    }

    onAddReserva(buildReserva());
    setIsAddingOpen(false);
  };

  const handleOverlapConfirm = () => {
    if (confirmOverlap.pendingReserva) {
      onAddReserva(confirmOverlap.pendingReserva);
      setIsAddingOpen(false);
    }
    setConfirmOverlap({ isOpen: false, pendingReserva: null });
  };

  const handleStatusChange = (resId: string, nuevoEstado: Reserva['estado']) => {
    const res = reservas.find(r => r.id === resId);
    if (res) {
      onUpdateReserva({
        ...res,
        estado: nuevoEstado
      });
      if (selectedReserva?.id === resId) {
        setSelectedReserva({ ...res, estado: nuevoEstado });
      }
    }
  };

  const handlePrintContract = () => {
    window.print();
  };

  const handleExportCsv = () => {
    const headers = ['ID', 'Vehículo', 'Matrícula', 'Cliente', 'Fecha Inicio', 'Fecha Fin', 'Días', 'Tarifa/día (€)', 'Seguro', 'Total (€)', 'Estado'];
    const rows = reservas.map(res => {
      const veh = vehiculos.find(v => v.id === res.vehiculoId);
      const cli = clientes.find(c => c.id === res.clienteId);
      const days = calculateDays(res.fechaInicio, res.fechaFin);
      return [
        res.id,
        veh ? `${veh.marca} ${veh.modelo}` : res.vehiculoId,
        veh?.matricula ?? '',
        cli ? `${cli.nombre} ${cli.apellidos}` : res.clienteId,
        res.fechaInicio,
        res.fechaFin,
        String(days),
        String(res.tarifaDiaria),
        res.incluyeSeguroTodoRiesgo ? 'Sí' : 'No',
        String(res.totalCobrado),
        res.estado
      ];
    });
    downloadCsv(`${slugify(empresaCfg.nombre)}_alquileres_${new Date().toISOString().slice(0, 10)}.csv`, [headers, ...rows]);
  };

  const sortedReservas = [...reservas].sort((a, b) => b.fechaInicio.localeCompare(a.fechaInicio));

  // Solo vehículos marcados como alquiler
  const vehiculosAlquiler = vehiculos.filter(v => v.esFlotaAlquiler);
  const empresaCfg = getEmpresaConfig();

  // ── Calendar helpers ──────────────────────────────────────────────
  const MONTH_NAMES = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];
  const calYear = calendarDate.getFullYear();
  const calMonth = calendarDate.getMonth();

  // Build grid: 7 cols Mon–Dom (ISO week), padded to fill 6 rows
  const calDays: (Date | null)[] = [];
  const firstOfMonth = new Date(calYear, calMonth, 1);
  const lastOfMonth = new Date(calYear, calMonth + 1, 0);
  const startPad = (firstOfMonth.getDay() + 6) % 7; // Mon=0
  for (let i = 0; i < startPad; i++) calDays.push(null);
  for (let d = 1; d <= lastOfMonth.getDate(); d++) calDays.push(new Date(calYear, calMonth, d));
  while (calDays.length % 7 !== 0) calDays.push(null);

  const toIso = (d: Date) => `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
  const todayIso = toIso(new Date());

  // El calendario solo muestra reservas activas o futuras: las que ya terminaron
  // (fechaFin anterior a hoy) o están anuladas no se pintan.
  const reservasForDay = (iso: string) =>
    reservas.filter(r => r.estado !== 'cancelada' && r.fechaFin >= todayIso && r.fechaInicio <= iso && r.fechaFin >= iso);

  // Clasificación para las vistas de la tabla.
  // Histórica = anulada o ya finalizada (fechaFin anterior a hoy).
  const esHistorica = (r: Reserva) => r.estado === 'cancelada' || r.fechaFin < todayIso;
  const reservasActivas = sortedReservas.filter(r => !esHistorica(r));
  const reservasHistorial = sortedReservas.filter(esHistorica);
  const reservasVista = reservaView === 'historial' ? reservasHistorial : reservasActivas;
  const pagedReservas = reservasVista.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  // Etiqueta de estado de una reserva según fechas y anulación.
  const estadoReserva = (r: Reserva): { label: string; cls: string } => {
    if (r.estado === 'cancelada') return { label: 'Anulada', cls: 'bg-rose-50 text-rose-600' };
    if (r.fechaFin < todayIso) return { label: 'Finalizada', cls: 'bg-slate-100 text-slate-500' };
    if (r.fechaInicio > todayIso) return { label: 'Próxima', cls: 'bg-blue-50 text-blue-600' };
    return { label: 'Activa', cls: 'bg-emerald-50 text-emerald-600' };
  };

  const vehicleColors: Record<string, string> = {};
  const PALETTE = [
    'bg-blue-100 text-blue-800 border-blue-200',
    'bg-violet-100 text-violet-800 border-violet-200',
    'bg-emerald-100 text-emerald-800 border-emerald-200',
    'bg-amber-100 text-amber-800 border-amber-200',
    'bg-rose-100 text-rose-800 border-rose-200',
    'bg-cyan-100 text-cyan-800 border-cyan-200',
    'bg-orange-100 text-orange-800 border-orange-200',
  ];
  let colorIdx = 0;
  vehiculosAlquiler.forEach(v => {
    vehicleColors[v.id] = PALETTE[colorIdx++ % PALETTE.length];
  });
  // ─────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6 text-slate-700" id="rentals-tab-root">
      
      {/* Visual Calendar Block & List split */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Reservation Visual Timeline calendar */}
        <div className="lg:col-span-8 bg-white p-6 rounded-2xl border border-slate-100 shadow-sm space-y-5">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
            <div>
              <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2 font-display">
                <Calendar className="w-5 h-5 text-blue-600" />
                Planificador y Calendario de Disponibilidad
              </h2>
              <p className="text-xs text-slate-400">Ver reservas cruzadas en tiempo real para control de flota</p>
            </div>
            
            <div className="flex gap-2">
            <button
              onClick={handleExportCsv}
              className="px-3 py-2 border border-slate-200 text-slate-600 hover:bg-slate-50 font-medium text-sm rounded-xl transition flex items-center gap-1.5 cursor-pointer"
              title="Exportar reservas a CSV"
            >
              <Download className="w-4 h-4" /> CSV
            </button>
            <button
              onClick={handleOpenAdd}
              id="btn-add-reserva"
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium text-sm rounded-xl transition flex items-center gap-1.5 focus:outline-none cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              Nueva Reserva
            </button>
            </div>
          </div>

          {/* ── Monthly Calendar ── */}
          <div className="border border-slate-100 rounded-xl overflow-hidden">
            {/* Nav header */}
            <div className="flex items-center justify-between px-4 py-3 bg-slate-50 border-b border-slate-100">
              <button
                onClick={() => setCalendarDate(new Date(calYear, calMonth - 1, 1))}
                title="Mes anterior"
                className="p-1.5 hover:bg-slate-200 rounded-lg transition text-slate-500"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="text-sm font-bold text-slate-700">
                {MONTH_NAMES[calMonth]} {calYear}
              </span>
              <button
                onClick={() => setCalendarDate(new Date(calYear, calMonth + 1, 1))}
                title="Mes siguiente"
                className="p-1.5 hover:bg-slate-200 rounded-lg transition text-slate-500"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>

            {/* Day-of-week headers */}
            <div className="grid grid-cols-7 border-b border-slate-100">
              {['Lun','Mar','Mié','Jue','Vie','Sáb','Dom'].map(d => (
                <div key={d} className="py-2 text-center text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  {d}
                </div>
              ))}
            </div>

            {/* Day cells */}
            <div className="grid grid-cols-7">
              {calDays.map((day, idx) => {
                if (!day) {
                  return <div key={`pad-${idx}`} className="min-h-[72px] bg-slate-50/40 border-b border-r border-slate-50" />;
                }
                const iso = toIso(day);
                const isToday = iso === todayIso;
                const isPast = iso < todayIso;
                const dayReservations = reservasForDay(iso);
                const visible = dayReservations.slice(0, 2);
                const overflow = dayReservations.length - 2;

                return (
                  <div
                    key={iso}
                    className={`min-h-[72px] p-1.5 border-b border-r border-slate-100 transition ${isPast ? 'bg-slate-50/60' : 'bg-white'}`}
                  >
                    <span className={`text-[11px] font-bold mb-1 block w-5 h-5 flex items-center justify-center rounded-full ${
                      isToday ? 'bg-blue-600 text-white' : isPast ? 'text-slate-300' : 'text-slate-600'
                    }`}>
                      {day.getDate()}
                    </span>
                    <div className="space-y-0.5">
                      {visible.map(res => {
                        const cli = clientes.find(c => c.id === res.clienteId);
                        const colorClass = vehicleColors[res.vehiculoId] ?? PALETTE[0];
                        const isStart = res.fechaInicio === iso;
                        return (
                          <div
                            key={res.id}
                            onClick={() => setSelectedReserva(res)}
                            title={`${cli?.nombre ?? 'Cliente'} · ${formatDate(res.fechaInicio)} → ${formatDate(res.fechaFin)}`}
                            className={`text-[9px] font-bold px-1 py-0.5 rounded border cursor-pointer hover:opacity-80 transition truncate ${colorClass}`}
                          >
                            {isStart ? '▶ ' : ''}{cli?.nombre ?? '···'}
                          </div>
                        );
                      })}
                      {overflow > 0 && (
                        <button
                          onClick={(e) => { e.stopPropagation(); setDayModal({ iso, reservations: dayReservations }); }}
                          className="text-[9px] text-blue-500 font-semibold pl-1 hover:text-blue-700 hover:underline cursor-pointer"
                        >+{overflow} más</button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Legend */}
            <div className="px-4 py-2.5 bg-slate-50 border-t border-slate-100 flex flex-wrap gap-3 items-center">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mr-1">Vehículos:</span>
              {vehiculosAlquiler.map(v => (
                <span key={v.id} className={`flex items-center gap-1 text-[10px] font-semibold px-1.5 py-0.5 rounded border ${vehicleColors[v.id] ?? PALETTE[0]}`}>
                  {v.marca} {v.modelo}
                  <span className="font-mono opacity-70">({v.matricula})</span>
                </span>
              ))}
              {vehiculosAlquiler.length === 0 && <span className="text-[10px] text-slate-400">Sin vehículos de alquiler registrados.</span>}
            </div>
          </div>

          {/* Day detail modal */}
          <AnimatePresence>
            {dayModal && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
                onClick={() => setDayModal(null)}
              >
                <motion.div
                  initial={{ scale: 0.95, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0.95, opacity: 0 }}
                  onClick={e => e.stopPropagation()}
                  className="bg-white rounded-xl shadow-2xl w-full max-w-sm mx-4 overflow-hidden"
                >
                  <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 bg-slate-50">
                    <span className="text-sm font-bold text-slate-700">Reservas del {formatDate(dayModal.iso)}</span>
                    <button onClick={() => setDayModal(null)} className="text-slate-400 hover:text-slate-700 transition"><X size={16} /></button>
                  </div>
                  <div className="divide-y divide-slate-50 max-h-80 overflow-y-auto">
                    {dayModal.reservations.map(res => {
                      const veh = vehiculosAlquiler.find(v => v.id === res.vehiculoId);
                      const cli = clientes.find(c => c.id === res.clienteId);
                      const colorClass = vehicleColors[res.vehiculoId] ?? PALETTE[0];
                      return (
                        <div
                          key={res.id}
                          onClick={() => { setSelectedReserva(res); setDayModal(null); }}
                          className="px-4 py-3 flex items-center gap-3 cursor-pointer hover:bg-slate-50 transition"
                        >
                          <span className={`text-[10px] font-bold px-2 py-1 rounded border ${colorClass}`}>
                            {veh?.matricula ?? '···'}
                          </span>
                          <div className="flex-1 min-w-0">
                            <div className="text-xs font-semibold text-slate-700 truncate">{cli?.nombre} {cli?.apellidos}</div>
                            <div className="text-[10px] text-slate-400">{veh?.marca} {veh?.modelo} · {formatDate(res.fechaInicio)} → {formatDate(res.fechaFin)}</div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Grid list of reservations */}
          <div className="space-y-2">
            <div className="flex items-center justify-between gap-2 border-b border-slate-50 pb-2 flex-wrap">
              <h3 className="text-xs font-bold text-slate-700 uppercase tracking-widest">
                {reservaView === 'historial' ? 'Historial de Reservas' : 'Reservas Activas y Próximas'}
              </h3>
              <div className="inline-flex rounded-lg border border-slate-200 overflow-hidden text-[11px] font-bold">
                <button
                  type="button"
                  onClick={() => { setReservaView('activas'); setCurrentPage(1); }}
                  className={`px-3 py-1.5 transition cursor-pointer ${reservaView === 'activas' ? 'bg-blue-600 text-white' : 'bg-white text-slate-500 hover:bg-slate-50'}`}
                >
                  Activas y próximas ({reservasActivas.length})
                </button>
                <button
                  type="button"
                  onClick={() => { setReservaView('historial'); setCurrentPage(1); }}
                  className={`px-3 py-1.5 transition cursor-pointer border-l border-slate-200 ${reservaView === 'historial' ? 'bg-blue-600 text-white' : 'bg-white text-slate-500 hover:bg-slate-50'}`}
                >
                  Historial ({reservasHistorial.length})
                </button>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs table-auto border-collapse">
                <thead>
                  <tr className="border-b border-slate-100 text-slate-400 font-semibold uppercase tracking-wider">
                    <th className="py-2.5 px-2">ID</th>
                    <th className="py-2.5 px-2">Vehículo</th>
                    <th className="py-2.5 px-2">Cliente</th>
                    <th className="py-2.5 px-2">Fechas Alquiler</th>
                    <th className="py-2.5 px-2 text-right font-medium">Finanzas</th>
                    <th className="py-2.5 px-2 text-right">Estado / Contratos</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {reservasVista.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-10 text-center">
                        <Calendar className="w-8 h-8 text-slate-200 mx-auto mb-2" />
                        <p className="text-xs font-semibold text-slate-400">
                          {reservaView === 'historial'
                            ? 'No hay reservas finalizadas ni anuladas todavía.'
                            : 'No hay reservas activas ni próximas. Pulse «Nueva Reserva» para crear una.'}
                        </p>
                      </td>
                    </tr>
                  ) : (
                    pagedReservas.map(res => {
                      const veh = vehiculos.find(v => v.id === res.vehiculoId);
                      const cli = clientes.find(c => c.id === res.clienteId);
                      return (
                        <tr 
                          key={res.id} 
                          id={`res-row-${res.id}`}
                          className={`hover:bg-slate-50 transition cursor-pointer ${selectedReserva?.id === res.id ? 'bg-indigo-50/20 font-medium' : ''}`}
                          onClick={() => setSelectedReserva(res)}
                        >
                          <td className="py-3 px-2 font-mono text-slate-400">
                            {res.id.slice(-6)}
                          </td>
                          <td className="py-3 px-2">
                            {veh ? (
                              <div>
                                <span className="font-bold text-slate-800">{veh.marca} {veh.modelo}</span>
                                <span className="block text-[10px] font-mono text-slate-500">{veh.matricula}</span>
                              </div>
                            ) : (
                              <span className="text-rose-500 italic">Vehículo no disponible</span>
                            )}
                          </td>
                          <td className="py-3 px-2">
                            {cli ? (
                              <div>
                                <span className="font-semibold text-slate-700">{cli.nombre} {cli.apellidos}</span>
                                <span className="block text-[10px] font-mono text-slate-500">{cli.nifNiePasaporte}</span>
                              </div>
                            ) : (
                              <span className="text-slate-400 italic">Eliminado</span>
                            )}
                          </td>
                          <td className="py-3 px-2 whitespace-nowrap">
                            <span className="font-bold text-slate-600 block">{formatDate(res.fechaInicio)} al {formatDate(res.fechaFin)}</span>
                            <span className="text-[10px] text-slate-400 font-medium">{calculateDays(res.fechaInicio, res.fechaFin)} días de contrato</span>
                          </td>
                          <td className="py-3 px-2 text-right">
                            <span className="font-mono font-extrabold text-slate-800 block text-xs">{res.totalCobrado.toFixed(2)} €</span>
                            <span className="text-[9px] text-slate-400">{res.tarifaDiaria}€/día {res.incluyeSeguroTodoRiesgo && '+ todo riesgo'}</span>
                          </td>
                          <td className="py-3 px-2 text-right space-x-1" onClick={e => e.stopPropagation()}>
                            {(() => {
                              const e = estadoReserva(res);
                              return <span className={`px-2 py-1 rounded text-[10px] font-bold inline-flex ${e.cls}`}>{e.label}</span>;
                            })()}
                            <button
                              onClick={() => setViewingContract(res)}
                              title="Ver contrato"
                              className="px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded text-[10px] font-bold transition flex items-center gap-0.5 inline-flex"
                            >
                              <FileText className="w-3 h-3 text-blue-600" /> Contrato
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
            <Pagination
              currentPage={currentPage}
              totalItems={reservasVista.length}
              pageSize={PAGE_SIZE}
              onPageChange={setCurrentPage}
            />
          </div>
        </div>

        {/* Selected Rental Detailed interactive action block */}
        <div className="lg:col-span-4 text-slate-700">
          {selectedReserva ? (
            <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm space-y-5" id={`res-detail-${selectedReserva.id}`}>
              <div className="flex justify-between items-start border-b border-slate-50 pb-3">
                <div>
                  <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Gestión de Reserva</span>
                  <h3 className="text-md font-extrabold text-slate-800">Contrato #{selectedReserva.id.slice(-6)}</h3>
                </div>
                <button
                  onClick={() => setSelectedReserva(null)}
                  title="Cerrar panel"
                  className="p-1 hover:bg-slate-100 text-slate-400 rounded-lg"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Data checklist */}
              <div className="space-y-3.5 text-xs">
                {/* Vehicle */}
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 flex gap-2.5 items-center">
                  <Car className="w-5 h-5 text-blue-600" />
                  <div>
                    <span className="text-[9px] text-slate-400 font-bold block uppercase">Vehículo Alquilado</span>
                    {(() => {
                      const v = vehiculos.find(veh => veh.id === selectedReserva.vehiculoId);
                      return v ? (
                        <span className="font-bold text-slate-800">{v.marca} {v.modelo} ({v.matricula})</span>
                      ) : (
                        <span className="text-rose-600 italic">No disponible</span>
                      );
                    })()}
                  </div>
                </div>

                {/* Cliente */}
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 flex gap-2.5 items-center">
                  <User className="w-5 h-5 text-blue-600" />
                  <div>
                    <span className="text-[9px] text-slate-400 font-bold block uppercase">Cliente Signatario</span>
                    {(() => {
                      const c = clientes.find(cli => cli.id === selectedReserva.clienteId);
                      return c ? (
                        <span className="font-bold text-slate-800">{c.nombre} {c.apellidos} ({c.nifNiePasaporte})</span>
                      ) : (
                        <span className="text-rose-600 italic">Desasociado</span>
                      );
                    })()}
                  </div>
                </div>

                {/* Dates & Times */}
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 space-y-1.5">
                  <div className="flex justify-between">
                    <span className="text-slate-400">Fecha de Entrega:</span>
                    <strong className="font-bold text-slate-700">{formatDate(selectedReserva.fechaInicio)}</strong>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Fecha de Devolución:</span>
                    <strong className="font-bold text-slate-700">{formatDate(selectedReserva.fechaFin)}</strong>
                  </div>
                  <div className="flex justify-between border-t border-slate-100/50 pt-1.5 text-[11px] font-semibold text-slate-600">
                    <span>Días de devengo:</span>
                    <span>{calculateDays(selectedReserva.fechaInicio, selectedReserva.fechaFin)} días</span>
                  </div>
                </div>

                {/* Financial overview */}
                <div className="p-3 bg-blue-50 text-blue-900 rounded-xl border border-blue-100/30 space-y-1.5">
                  <div className="flex justify-between text-xs font-semibold">
                    <span>Base Alquiler:</span>
                    <span>{selectedReserva.tarifaDiaria.toFixed(2)} € / día</span>
                  </div>
                  <div className="flex justify-between text-xs font-semibold">
                    <span>Seguro Todo Riesgo:</span>
                    <span>{selectedReserva.incluyeSeguroTodoRiesgo ? '15.00 € / día' : 'No incluido'}</span>
                  </div>
                  <div className="flex justify-between border-t border-blue-200 pt-1.5 text-xs font-bold text-blue-800">
                    <span>LIQUIDACIÓN TOTAL:</span>
                    <span>{selectedReserva.totalCobrado.toFixed(2)} €</span>
                  </div>
                </div>
              </div>

              {/* State Management actions */}
              <div className="space-y-2 border-t border-slate-50 pt-3">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">Estado del contrato</span>
                <div className="flex items-center justify-between gap-2">
                  {(() => {
                    const e = estadoReserva(selectedReserva);
                    return <span className={`px-2.5 py-1.5 rounded-lg text-xs font-bold inline-flex ${e.cls}`}>{e.label}</span>;
                  })()}
                  {selectedReserva.estado === 'cancelada' ? (
                    <button
                      onClick={() => handleStatusChange(selectedReserva.id, 'confirmada')}
                      className="py-1.5 px-3 rounded-lg text-xs font-bold transition cursor-pointer bg-slate-100 text-slate-600 hover:bg-slate-200 flex items-center gap-1"
                    >
                      <Check className="w-3.5 h-3.5" /> Reactivar
                    </button>
                  ) : (
                    <button
                      onClick={() => setConfirmAnular({ isOpen: true, resId: selectedReserva.id })}
                      className="py-1.5 px-3 rounded-lg text-xs font-bold transition cursor-pointer bg-rose-50 text-rose-600 hover:bg-rose-100 flex items-center gap-1"
                    >
                      <X className="w-3.5 h-3.5" /> Anular reserva
                    </button>
                  )}
                </div>
              </div>

              <div className="pt-2">
                <button
                  onClick={() => setViewingContract(selectedReserva)}
                  className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-extrabold rounded-xl transition flex items-center justify-center gap-1.5 cursor-pointer shadow-sm"
                >
                  <FileText className="w-4 h-4" /> Generar e Imprimir Contrato
                </button>
              </div>
            </div>
          ) : (
            <div className="bg-white p-10 rounded-2xl border border-slate-100 shadow-sm text-center flex flex-col items-center justify-center space-y-3 text-slate-400 h-full min-h-[400px]">
              <div className="p-4 bg-slate-50 rounded-full border border-slate-100">
                <FileText className="w-9 h-9 text-slate-300" />
              </div>
              <h4 className="text-sm font-bold text-slate-700">Gestor Operativo de Contratos</h4>
              <p className="text-xs max-w-xs leading-relaxed">
                Haga clic sobre cualquier reserva de la planilla o del calendario ocupacional para administrar su estado, liquidar el seguro todo riesgo o generar la copia física legal firmada para el cliente.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* MODAL: CREATE RESERVATION */}
      <AnimatePresence>
        {isAddingOpen && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 overflow-y-auto">
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-lg w-full overflow-hidden"
              id="create-reservation-modal"
            >
              <div className="px-6 py-4 bg-slate-50 border-b border-slate-100 flex justify-between items-center">
                <h3 className="font-extrabold text-slate-800 flex items-center gap-2 font-display">
                  <Calendar className="w-5 h-5 text-blue-600" />
                  Alta de Reserva de Alquiler
                </h3>
                <button 
                  onClick={() => setIsAddingOpen(false)}
                  className="p-1 hover:bg-slate-200 rounded-md transition text-slate-400"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {vehiculos.length === 0 || clientes.length === 0 ? (
                <div className="p-6 text-center text-slate-500 text-xs space-y-3">
                  <p>⚠️ Se necesitan vehículos y clientes registrados en el CRM para poder formalizar reservas.</p>
                  <button
                    onClick={() => setIsAddingOpen(false)}
                    className="px-4 py-2 bg-slate-800 text-white rounded-lg text-xs font-semibold"
                  >
                    Cerrar
                  </button>
                </div>
              ) : (
                <form onSubmit={handleAddSubmit} className="p-6 space-y-4 font-sans">
                  {/* Vehiculo selector */}
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase">Vehículo de Flota *</label>
                    <SearchableSelect
                      options={vehiculosAlquiler.map(v => ({
                        value: v.id,
                        label: `${v.marca} ${v.modelo}`,
                        sublabel: `Matrícula: ${v.matricula}`,
                      }))}
                      value={formVehiculoId}
                      onChange={(val) => {
                        setFormVehiculoId(val);
                        const veh = vehiculos.find(v => v.id === val);
                        const precio = veh?.tarifasAlquiler?.[`temporada${formTemporada.charAt(0).toUpperCase() + formTemporada.slice(1)}` as 'temporadaAlta' | 'temporadaMedia' | 'temporadaBaja'];
                        if (precio !== undefined) setFormTarifa(precio);
                      }}
                      placeholder="Seleccionar vehículo..."
                      emptyMessage="No hay vehículos de alquiler disponibles"
                      required
                    />
                  </div>

                  {/* Cliente CRM selector */}
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase">Cliente Beneficiario (CRM) *</label>
                    <SearchableSelect
                      options={clientes.map(c => ({
                        value: c.id,
                        label: `${c.nombre} ${c.apellidos}`,
                        sublabel: c.nifNiePasaporte,
                      }))}
                      value={formClienteId}
                      onChange={setFormClienteId}
                      placeholder="Buscar cliente..."
                      emptyMessage="Sin clientes registrados"
                      required
                    />
                  </div>

                  {/* Dates range */}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-500 uppercase">Fecha de Inicio *</label>
                      <input
                        type="date"
                        className="w-full mt-1 px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                        value={formFechaInicio}
                        onChange={e => setFormFechaInicio(e.target.value)}
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-500 uppercase">Fecha de Finalización *</label>
                      <input
                        type="date"
                        className="w-full mt-1 px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                        value={formFechaFin}
                        onChange={e => setFormFechaFin(e.target.value)}
                        required
                      />
                    </div>
                  </div>

                  {/* Temporada + tarifa */}
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Temporada *</label>
                    {(() => {
                      const veh = vehiculos.find(v => v.id === formVehiculoId);
                      const tarifas = veh?.tarifasAlquiler;
                      const TEMPORADAS: { key: 'alta' | 'media' | 'baja'; label: string }[] = [
                        { key: 'alta', label: 'Temporada Alta' },
                        { key: 'media', label: 'Temporada Media' },
                        { key: 'baja', label: 'Temporada Baja' },
                      ];
                      return (
                        <div className="grid grid-cols-3 gap-2">
                          {TEMPORADAS.map(({ key, label }) => {
                            const precio = tarifas?.[`temporada${key.charAt(0).toUpperCase() + key.slice(1)}` as keyof typeof tarifas] ?? null;
                            const active = formTemporada === key;
                            return (
                              <button
                                key={key}
                                type="button"
                                onClick={() => {
                                  setFormTemporada(key);
                                  if (precio !== null) setFormTarifa(precio);
                                }}
                                className={`flex flex-col items-center py-2 px-1 rounded-lg border text-xs transition ${active ? 'border-blue-500 bg-blue-50 text-blue-700 font-bold' : 'border-slate-200 text-slate-600 hover:border-slate-300'}`}
                              >
                                <span>{label}</span>
                                {precio !== null && <span className="font-mono mt-0.5 text-[11px]">{precio}€/día</span>}
                              </button>
                            );
                          })}
                        </div>
                      );
                    })()}
                    <div className="relative mt-2">
                      <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-400 font-semibold text-xs">€/Día</span>
                      <input
                        type="number"
                        min="1"
                        className="w-full pl-14 pr-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 font-mono"
                        value={formTarifa}
                        onChange={e => setFormTarifa(Number(e.target.value))}
                        required
                      />
                    </div>
                    <p className="text-[10px] text-slate-400 mt-1">La tarifa se autocompleta según la temporada. Puedes editarla manualmente si aplica un precio especial.</p>
                  </div>

                  {/* Extra Todo Riesgo Insurance checkbox */}
                  <div className="p-3 bg-slate-50 rounded-lg border border-slate-100 flex items-start gap-2">
                    <input
                      type="checkbox"
                      id="opt-seguro"
                      checked={formSeguro}
                      onChange={e => setFormSeguro(e.target.checked)}
                      className="mt-0.5 rounded cursor-pointer"
                    />
                    <label htmlFor="opt-seguro" className="text-xs text-slate-600 block cursor-pointer select-none">
                      <strong className="font-bold text-slate-700">Incluir Cobertura de Seguro a Todo Riesgo</strong>
                      <span className="block text-[10px] text-slate-400">Surcharge de +15.00 €/día. Protege el vehículo contra accidentes, fuegos o colisiones en via pública.</span>
                    </label>
                  </div>

                  {/* Temporary total preview */}
                  <div className="p-3.5 bg-blue-50 font-sans text-blue-800 rounded-xl border border-blue-100 flex justify-between items-center text-xs">
                    <div>
                      <span className="font-bold uppercase tracking-wider block text-[9px] text-blue-600">PRESUPUESTO ESTIMADO</span>
                      <span>Alquiler: {currentDuration} días a {formTarifa}€ / día</span>
                    </div>
                    <div className="text-right font-mono text-base font-extrabold text-blue-900">
                      {calculatedTotal.toFixed(2)} €
                    </div>
                  </div>

                  {formError && (
                    <p className="text-xs text-rose-600 bg-rose-50 border border-rose-200 rounded-lg px-3 py-2 font-medium">{formError}</p>
                  )}
                  {/* Save */}
                  <div className="border-t border-slate-100 pt-4 flex justify-end gap-2 text-sm font-medium">
                    <button
                      type="button"
                      onClick={() => { setIsAddingOpen(false); setFormError(''); }}
                      className="px-4 py-2 border border-slate-200 rounded-xl hover:bg-slate-50 transition text-slate-500"
                    >
                      Cancelar
                    </button>
                    <button
                      type="submit"
                      className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl transition flex items-center gap-1 cursor-pointer"
                    >
                      <Check className="w-4 h-4" /> Registrar Alquiler
                    </button>
                  </div>
                </form>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <ConfirmDialog
        isOpen={confirmOverlap.isOpen}
        title="Conflicto de disponibilidad"
        message="Este vehículo ya tiene una reserva activa para parte del rango de fechas seleccionado. ¿Desea forzar la reserva de todas formas?"
        confirmLabel="Sí, forzar reserva"
        variant="warning"
        onConfirm={handleOverlapConfirm}
        onCancel={() => setConfirmOverlap({ isOpen: false, pendingReserva: null })}
      />

      <ConfirmDialog
        isOpen={confirmAnular.isOpen}
        title="Anular reserva"
        message="¿Seguro que deseas anular esta reserva? El vehículo volverá a quedar disponible para esas fechas y la reserva pasará al historial como anulada."
        confirmLabel="Sí, anular reserva"
        cancelLabel="No, mantener"
        variant="danger"
        onConfirm={() => {
          handleStatusChange(confirmAnular.resId, 'cancelada');
          setConfirmAnular({ isOpen: false, resId: '' });
        }}
        onCancel={() => setConfirmAnular({ isOpen: false, resId: '' })}
      />

      {/* MODAL / OVERLAY: PROFESSIONAL RENTAL LEGAL CONTRACT PDF VIEW */}
      <AnimatePresence>
        {viewingContract && (
          <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-xs flex items-start justify-center p-4 z-50 overflow-y-auto pt-10">
            <motion.div 
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 20, opacity: 0 }}
              className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full border border-slate-200 overflow-hidden print:shadow-none print:border-none print:max-w-full my-6"
              id="legal-contract-pdf-modal"
            >
              {/* Header inside overlay (Hidden on print) */}
              <div className="px-6 py-4 bg-slate-800 text-white flex justify-between items-center print:hidden">
                <div className="flex items-center gap-2">
                  <FileText className="w-5 h-5 text-blue-400" />
                  <span className="font-bold text-sm font-display">Visor de Contrato de Alquiler</span>
                </div>
                <div className="flex gap-2 flex-wrap">
                  <button
                    onClick={handlePrintContract}
                    className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-lg transition flex items-center gap-1 cursor-pointer font-sans"
                  >
                    <Printer className="w-3.5 h-3.5" /> Descargar / Imprimir
                  </button>
                  {(() => {
                    const empresa = getEmpresaConfig();
                    const cli = clientes.find(c => c.id === viewingContract.clienteId);
                    const veh = vehiculos.find(v => v.id === viewingContract.vehiculoId);
                    const dias = calculateDays(viewingContract.fechaInicio, viewingContract.fechaFin);
                    const texto = `Hola ${cli?.nombre ?? ''},\n\nAdjuntamos el contrato de alquiler del vehículo ${veh?.marca ?? ''} ${veh?.modelo ?? ''} (${veh?.matricula ?? ''}) desde el ${formatDate(viewingContract.fechaInicio)} hasta el ${formatDate(viewingContract.fechaFin)} (${dias} días). Total: ${viewingContract.totalCobrado.toFixed(2)} €.\n\nUn saludo,\n${empresa.nombre}`;
                    const tel = cli?.telefono?.replace(/\D/g, '') ?? '';
                    return (
                      <>
                        {cli?.telefono && (
                          <a href={`https://wa.me/${tel}?text=${encodeURIComponent(texto)}`} target="_blank" rel="noreferrer"
                            className="px-3 py-1.5 bg-green-600 hover:bg-green-500 text-white text-xs font-bold rounded-lg transition flex items-center gap-1">
                            <MessageCircle className="w-3.5 h-3.5" /> WhatsApp
                          </a>
                        )}
                        {cli?.correo && (
                          <a href={`mailto:${cli.correo}?subject=${encodeURIComponent(`Contrato de Alquiler - ${empresa.nombre}`)}&body=${encodeURIComponent(texto)}`}
                            className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-lg transition flex items-center gap-1">
                            <MailIcon className="w-3.5 h-3.5" /> Email
                          </a>
                        )}
                      </>
                    );
                  })()}
                  <button
                    onClick={() => setViewingContract(null)}
                    className="px-3 py-1.5 bg-slate-700 hover:bg-slate-600 text-slate-200 text-xs font-bold rounded-lg transition cursor-pointer font-sans"
                  >
                    Cerrar
                  </button>
                </div>
              </div>

              {/* Printable Area represents Professional Contract */}
              <div className="p-8 md:p-12 space-y-6 text-slate-800 font-sans print:p-0" id="contract-printable-area">
                
                {/* Legal Header */}
                <div className="flex justify-between items-start border-b-2 border-slate-950 pb-5">
                  <div>
                    <h1 className="text-xl font-extrabold tracking-tight text-slate-900 uppercase font-display">Contrato de Alquiler de Vehículo</h1>
                    <p className="text-xs font-semibold text-slate-500 mt-1">Sin conductor • Serie de Flotas &amp; CRM {empresaCfg.nombre}</p>
                  </div>
                  <div className="text-right">
                    <span className="text-xs font-mono font-bold block text-slate-500">CONTRATO NÚMERO</span>
                    <strong className="text-lg font-mono font-black text-blue-600">{viewingContract.id.slice(-8).toUpperCase()}</strong>
                  </div>
                </div>

                {/* Date and Place */}
                <div className="text-xs text-slate-500 border-b border-rose-100 pb-2 flex justify-between font-semibold">
                  <span>Ciudad de expedición: {empresaCfg.ciudad}</span>
                  <span>Fecha de firma: {formatDate(viewingContract.fechaInicio)}</span>
                </div>

                {/* Declarations / Client vs Vehicle */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
                  
                  {/* First Party: Landlord (The workshop backoffice) */}
                  <div className="space-y-1.5 text-xs text-slate-700">
                    <h5 className="font-bold text-slate-900 uppercase border-b border-slate-200 pb-1 text-[10px]">1. DATOS DEL ARRENDADOR</h5>
                    <p className="font-bold">{empresaCfg.razonSocial}</p>
                    <p className="text-slate-500">NIF: {empresaCfg.nif} • CIF de Operaciones</p>
                    <p className="text-slate-500">Sede Fiscal: {empresaCfg.direccionFiscal}</p>
                    {(empresaCfg.ciudad || empresaCfg.pais) && (
                      <p className="text-slate-500">{[empresaCfg.ciudad, empresaCfg.pais].filter(Boolean).join(' · ')}</p>
                    )}
                    <p className="text-slate-500">Teléfono central: {empresaCfg.telefono}</p>
                  </div>

                  {/* Second Party: Tenant */}
                  <div className="space-y-1.5 text-xs text-slate-700" id="contract-client-specs">
                    <h5 className="font-bold text-slate-900 uppercase border-b border-slate-200 pb-1 text-[10px]">2. DATOS DEL ARRENDATARIO (CLIENTE)</h5>
                    {(() => {
                      const c = clientes.find(cli => cli.id === viewingContract.clienteId);
                      return c ? (
                        <>
                          <p className="font-bold">{c.nombre} {c.apellidos}</p>
                          <p className="text-slate-500 font-mono">DNI/NIF/NIE: {c.nifNiePasaporte}</p>
                          <p className="text-slate-500">Email: {c.correo || 'No informado'}</p>
                          <p className="text-slate-500">Teléfono: {c.telefono}</p>
                          <p className="text-slate-500">Domicilio: {c.direccion || 'No informado'}</p>
                          {(c.ciudad || c.pais) && <p className="text-slate-500">{[c.ciudad, c.pais].filter(Boolean).join(' · ')}</p>}
                        </>
                      ) : (
                        <p className="text-rose-600 italic font-semibold">Ficha del cliente no disponible en el CRM.</p>
                      );
                    })()}
                  </div>
                </div>

                {/* Vehicle specifications */}
                <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-1.5 text-xs text-slate-700" id="contract-vehicle-specs">
                  <h5 className="font-bold text-slate-900 uppercase text-[10px] pb-1 border-b border-slate-200">3. DESCRIPCIÓN DEL VEHÍCULO DE FLOTA</h5>
                  {(() => {
                    const v = vehiculos.find(veh => veh.id === viewingContract.vehiculoId);
                    return v ? (
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div>
                          <span className="text-slate-400 block text-[9px] uppercase font-semibold">Marca y Modelo</span>
                          <strong className="font-bold text-slate-800">{v.marca} {v.modelo}</strong>
                        </div>
                        <div>
                          <span className="text-slate-400 block text-[9px] uppercase font-semibold">Matrícula Nacional</span>
                          <strong className="font-mono font-bold text-slate-800">{v.matricula}</strong>
                        </div>
                        <div>
                          <span className="text-slate-400 block text-[9px] uppercase font-semibold">Nº de Bastidor</span>
                          <strong className="font-mono text-slate-500 text-[10px]">{v.bastidor}</strong>
                        </div>
                        <div>
                          <span className="text-slate-400 block text-[9px] uppercase font-semibold">Kilometraje Entrada</span>
                          <strong className="font-mono font-bold text-slate-800">{v.kilometraje.toLocaleString()} km</strong>
                        </div>
                      </div>
                    ) : (
                      <p className="text-rose-600 italic font-semibold">Vehículo desasociado de la flota.</p>
                    );
                  })()}
                </div>

                {/* Contract duration and financial liquidations */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs text-slate-700">
                  <div className="space-y-1.5">
                    <h5 className="font-bold text-slate-900 uppercase text-[10px] pb-1 border-b border-slate-200">4. VIGENCIA Y PLAZOS</h5>
                    <p><strong>Fecha inicial de entrega:</strong> {formatDate(viewingContract.fechaInicio)}</p>
                    <p><strong>Fecha acordada retorno:</strong> {formatDate(viewingContract.fechaFin)}</p>
                    <p><strong>Número total de jornadas:</strong> {calculateDays(viewingContract.fechaInicio, viewingContract.fechaFin)} días naturales</p>
                    <p className="text-slate-500 italic text-[10px]">El retraso superior a 59 minutos en la devolución facultará el cobro de un día adicional con penalización.</p>
                  </div>

                  <div className="p-4 bg-blue-50/50 border border-blue-200 rounded-xl space-y-1.5" id="contract-financial-specs">
                    <h5 className="font-bold text-blue-950 uppercase text-[10px] pb-1 border-b border-blue-200">5. LIQUIDACIÓN DE TARIFAS (I.V.A. INCLUIDO)</h5>
                    <div className="flex justify-between font-sans">
                      <span>Precio unitario base:</span>
                      <strong className="font-mono">{viewingContract.tarifaDiaria.toFixed(2)} € / día</strong>
                    </div>
                    <div className="flex justify-between font-sans">
                      <span>Seguro Técnico Completo:</span>
                      <strong className="font-mono">{viewingContract.incluyeSeguroTodoRiesgo ? '15.00 € / día' : 'Póliza Terceros Básica'}</strong>
                    </div>
                    <div className="flex justify-between border-t border-blue-300 pt-1 text-blue-900 font-extrabold font-sans">
                      <span>IMPORTE FACTURADO NETO:</span>
                      <strong className="font-mono text-blue-950">{viewingContract.totalCobrado.toFixed(2)} €</strong>
                    </div>
                  </div>
                </div>

                {/* Terms conditions text in Spanish */}
                <div className="space-y-2 border-t border-slate-100 pt-4 text-[9px] text-slate-400 leading-normal text-justify" id="contract-terms-spanish">
                  <h5 className="font-bold text-slate-700 uppercase text-[10px]">CLÁUSULAS ADICIONALES DEL ACUERDO</h5>
                  <p>
                    <strong>PRIMERA. Objeto del Contrato.</strong> El Arrendador cede en arrendamiento al Arrendatario el vehículo descrito en la cláusula 3, en perfectas condiciones de funcionamiento, conservación y carrocería, comprometiéndose el Arrendatario a conservarlo y conducirlo cumpliendo estrictamente con el Código de Circulación Vigente de España.
                  </p>
                  <p>
                    <strong>SEGUNDA. Combustible e Infracciones.</strong> El vehículo se entrega con el tanque de combustible completo, debiendo retornarse en iguales circunstancias. Corresponden en exclusiva al arrendatario todas las sanciones administrativas derivadas de la conducción del vehículo durante el periodo de vigencia del presente contrato.
                  </p>
                  <p>
                    {viewingContract.incluyeSeguroTodoRiesgo ? (
                      <span><strong>TERCERA. Cobertura del Seguro.</strong> Al haber contratado la póliza de SEGURO A TODO RIESGO, se exime al cliente de cualquier responsabilidad por siniestros fortuitos, colisiones, daños superficiales de pintura, ralladuras o robo del coche en vía pública, sujeto a fianza de depósito de 150.00 €.</span>
                    ) : (
                      <span><strong>TERCERA. Cobertura Restringida.</strong> Se suscribe únicamente el SEGURO OBLIGATORIO DE RESPONSABILIDAD CIVIL a terceros. Cualquier avería por negligencia, daño en chapa, lunas o interior será responsabilidad íntegra del cliente arrendatario y liquidada en base al baremo de taller oficial.</span>
                    )}
                  </p>
                </div>

                {/* Signatures visualizer */}
                <div className="grid grid-cols-2 gap-12 pt-6 pb-2" id="contract-signatures-visualizer">
                  <div className="text-center">
                    <div className="border-b border-dashed border-slate-300 pb-12 mb-3"></div>
                    <span className="block text-[10px] text-slate-700 font-bold">Por el Arrendador ({empresaCfg.nombre})</span>
                  </div>
                  <div className="text-center">
                    <div className="border-b border-dashed border-slate-300 pb-12 mb-3"></div>
                    <span className="block text-[10px] text-slate-700 font-bold">Por el Arrendatario (Cliente)</span>
                  </div>
                </div>

                {/* Print footnotes */}
                <div className="text-center text-[10px] text-slate-300 italic pt-6 mt-12 border-t border-slate-100 hidden print:block">
                  Copia legal autenticada por {empresaCfg.razonSocial} CRM &amp; Flotas. Emitido cronológicamente.
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
