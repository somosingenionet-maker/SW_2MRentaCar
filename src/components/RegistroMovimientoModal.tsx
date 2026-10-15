import { useState } from 'react';
import { AlertTriangle, Check, KeyRound, LogIn } from 'lucide-react';
import ModalShell from './ModalShell';
import { MovimientoVehiculo, NivelCombustible } from '../types';
import { COMBUSTIBLES, combustibleFaltante, kmRecorridos } from '../utils/entregaDevolucion';
import { avisoKilometraje } from '../utils/kilometraje';

interface Props {
  tipo: 'entrega' | 'devolucion';
  vehiculoNombre: string;
  /** Kilometraje que tiene ahora la ficha del vehículo. */
  kmFicha: number;
  /** Para la devolución: cómo se entregó. */
  entrega?: MovimientoVehiculo | null;
  /** Si se está corrigiendo un registro ya guardado. */
  inicial?: MovimientoVehiculo | null;
  responsableDefecto: string;
  onSave: (m: MovimientoVehiculo) => void;
  onClose: () => void;
}

// Valor para <input type="datetime-local">: fecha y hora LOCALES (no UTC).
const aLocal = (d: Date) => {
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`;
};

const campo = 'w-full mt-1 px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-blue-500';
const etiqueta = 'block text-xs font-bold text-slate-500 uppercase';

/** Registro de la entrega del coche al cliente o de su devolución. */
export default function RegistroMovimientoModal({ tipo, vehiculoNombre, kmFicha, entrega, inicial, responsableDefecto, onSave, onClose }: Props) {
  const esEntrega = tipo === 'entrega';
  const [fechaHora, setFechaHora] = useState(aLocal(inicial ? new Date(inicial.fechaHora) : new Date()));
  const [km, setKm] = useState<number | ''>(inicial?.km ?? (esEntrega && kmFicha > 0 ? kmFicha : ''));
  const [combustible, setCombustible] = useState<NivelCombustible | ''>(inicial?.combustible ?? (esEntrega ? 'lleno' : ''));
  const [danos, setDanos] = useState(inicial?.danos ?? '');
  const [responsable, setResponsable] = useState(inicial?.responsable ?? responsableDefecto);
  const [error, setError] = useState('');

  const actual: MovimientoVehiculo | null = km !== '' && combustible
    ? { fechaHora: new Date(fechaHora).toISOString(), km: Number(km), combustible, danos, responsable }
    : null;
  const recorridos = esEntrega ? null : kmRecorridos(entrega, actual);
  const faltan = esEntrega ? 0 : combustibleFaltante(entrega, actual);
  const avisoKm = esEntrega ? avisoKilometraje(kmFicha, km) : null;

  const guardar = () => {
    if (!fechaHora || isNaN(new Date(fechaHora).getTime())) { setError('Indica la fecha y la hora.'); return; }
    if (km === '' || Number(km) < 0) { setError('Indica el kilometraje.'); return; }
    if (!combustible) { setError('Indica el nivel de combustible.'); return; }
    if (!esEntrega && entrega) {
      if (Number(km) < entrega.km) { setError(`El kilometraje no puede ser menor que el de la entrega (${entrega.km.toLocaleString('es-ES')} km).`); return; }
      if (new Date(fechaHora) < new Date(entrega.fechaHora)) { setError('La devolución no puede ser anterior a la entrega.'); return; }
    }
    onSave({ fechaHora: new Date(fechaHora).toISOString(), km: Number(km), combustible, danos: danos.trim(), responsable: responsable.trim() });
  };

  return (
    <ModalShell
      titulo={esEntrega ? 'Entrega del vehículo' : 'Devolución del vehículo'}
      icono={esEntrega ? <KeyRound className="w-5 h-5 text-blue-600" /> : <LogIn className="w-5 h-5 text-blue-600" />}
      onClose={onClose}
      ancho="max-w-md"
      pie={
        <div className="px-6 py-4 space-y-3 bg-slate-50">
          {recorridos != null && (
            <p className="text-xs font-semibold text-blue-700 bg-blue-50 border border-blue-100 rounded-lg px-3 py-2">
              Kilómetros recorridos en el alquiler: {recorridos.toLocaleString('es-ES')} km
            </p>
          )}
          {faltan > 0 && (
            <p className="text-xs font-medium text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 flex items-start gap-2">
              <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
              Se devuelve con {faltan}/4 de depósito menos que a la entrega.
            </p>
          )}
          {avisoKm && (
            <p className="text-xs font-medium text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 flex items-start gap-2">
              <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
              {avisoKm}
            </p>
          )}
          {error && <p className="text-xs font-medium text-rose-700 bg-rose-50 border border-rose-200 rounded-lg px-3 py-2">{error}</p>}
          <div className="flex justify-end gap-2 text-sm font-medium">
            <button type="button" onClick={onClose} className="px-4 py-2 border border-slate-200 rounded-xl hover:bg-white transition text-slate-500 cursor-pointer">Cancelar</button>
            <button type="button" onClick={guardar} className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl transition flex items-center gap-1 cursor-pointer">
              <Check className="w-4 h-4" /> {inicial ? 'Guardar cambios' : esEntrega ? 'Registrar entrega' : 'Registrar devolución'}
            </button>
          </div>
        </div>
      }
    >
      <div className="px-6 py-5 space-y-4">
        <p className="text-xs text-slate-500">{vehiculoNombre}</p>
        <div>
          <label className={etiqueta}>Fecha y hora *</label>
          <input type="datetime-local" value={fechaHora} onChange={e => setFechaHora(e.target.value)} className={campo} />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className={etiqueta}>Kilometraje *</label>
            <input type="number" min="0" value={km} onChange={e => setKm(e.target.value === '' ? '' : Number(e.target.value))} placeholder="0" className={campo} />
          </div>
          <div>
            <label className={etiqueta}>Combustible *</label>
            <select value={combustible} onChange={e => setCombustible(e.target.value as NivelCombustible | '')} className={campo}>
              {!esEntrega && <option value="">Seleccionar…</option>}
              {COMBUSTIBLES.map(c => <option key={c.valor} value={c.valor}>{c.etiqueta}</option>)}
            </select>
          </div>
        </div>
        <div>
          <label className={etiqueta}>{esEntrega ? 'Daños o desperfectos que ya tiene' : 'Daños nuevos o incidencias'}</label>
          <textarea rows={3} value={danos} onChange={e => setDanos(e.target.value)} placeholder="Ninguno" className={`${campo} resize-none`} />
          <p className="text-[11px] text-slate-400 mt-1">Describe dónde y cómo (p. ej. «rozadura en el paragolpes trasero»). Si no hay, déjalo vacío.</p>
        </div>
        <div>
          <label className={etiqueta}>Registrado por</label>
          <input type="text" value={responsable} onChange={e => setResponsable(e.target.value)} className={campo} />
        </div>
      </div>
    </ModalShell>
  );
}

interface TarjetaProps {
  titulo: string;
  mov?: MovimientoVehiculo | null;
  /** Texto cuando no se puede registrar todavía (p. ej. devolver sin haber entregado). */
  bloqueada?: string;
  onRegistrar: () => void;
  onEditar: () => void;
}

const cuando = (iso: string) =>
  new Date(iso).toLocaleString('es-ES', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });

/** Resumen de una entrega o devolución en el panel de la reserva, con el botón para registrarla o corregirla. */
export function TarjetaMovimiento({ titulo, mov, bloqueada, onRegistrar, onEditar }: TarjetaProps) {
  const etiquetaComb = COMBUSTIBLES.find(c => c.valor === mov?.combustible)?.etiqueta ?? '—';
  return (
    <div className={`rounded-xl border p-3 text-xs ${mov ? 'bg-emerald-50/40 border-emerald-100' : 'bg-slate-50 border-slate-100'}`}>
      <div className="flex items-center justify-between gap-2">
        <span className="font-bold text-slate-700">{titulo}</span>
        {mov ? (
          <button type="button" onClick={onEditar} className="text-[11px] font-bold text-blue-600 hover:text-blue-800 cursor-pointer">Corregir</button>
        ) : (
          <button
            type="button"
            onClick={onRegistrar}
            disabled={!!bloqueada}
            className="px-2.5 py-1 rounded-lg text-[11px] font-bold bg-blue-600 hover:bg-blue-700 text-white disabled:bg-slate-200 disabled:text-slate-400 disabled:cursor-not-allowed cursor-pointer transition"
          >
            Registrar
          </button>
        )}
      </div>
      {mov ? (
        <dl className="mt-2 grid grid-cols-[auto_1fr] gap-x-3 gap-y-0.5 text-slate-600">
          <dt className="text-slate-400">Fecha</dt><dd className="font-semibold">{cuando(mov.fechaHora)}</dd>
          <dt className="text-slate-400">Kilometraje</dt><dd className="font-semibold font-mono">{mov.km.toLocaleString('es-ES')} km</dd>
          <dt className="text-slate-400">Combustible</dt><dd className="font-semibold">{etiquetaComb}</dd>
          <dt className="text-slate-400">Daños</dt><dd className="font-semibold">{mov.danos || 'Ninguno'}</dd>
          {mov.responsable && <><dt className="text-slate-400">Registró</dt><dd className="font-semibold">{mov.responsable}</dd></>}
        </dl>
      ) : (
        <p className="mt-1 text-[11px] text-slate-400">{bloqueada ?? 'Todavía sin registrar.'}</p>
      )}
    </div>
  );
}
