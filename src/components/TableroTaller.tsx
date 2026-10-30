import { Wrench, UserX } from 'lucide-react';
import type { OrdenTrabajo, Vehiculo } from '../types';
import { fichasTaller, haceCuanto, type EstadoTaller } from '../utils/tallerMecanico';

const ESTADO: Record<EstadoTaller, { etiqueta: string; cls: string }> = {
  recibido: { etiqueta: 'Recibido', cls: 'bg-slate-100 text-slate-700' },
  en_reparacion: { etiqueta: 'En reparación', cls: 'bg-amber-100 text-amber-800' },
  listo: { etiqueta: 'Listo', cls: 'bg-emerald-100 text-emerald-800' },
};

interface Props {
  ordenes: OrdenTrabajo[];
  vehiculos: Vehiculo[];
  /** Tareas que los mecánicos han marcado como hechas: { otId: [lineaId, ...] }. */
  tareasHechas: Record<string, string[]>;
  onSeleccionar?: (ot: OrdenTrabajo) => void;
  /** Hora de referencia para «hace X min» (se puede fijar en los tests). */
  ahora?: number;
}

/** Cada coche que hay ahora en el taller: estado, mecánico, avance de tareas y última novedad. */
export default function TableroTaller({ ordenes, vehiculos, tareasHechas, onSeleccionar, ahora }: Props) {
  const fichas = fichasTaller(ordenes, tareasHechas);
  if (fichas.length === 0) {
    return (
      <section data-testid="tablero-taller" className="bg-white border border-slate-100 rounded-2xl p-4 text-xs text-slate-400 text-center">
        No hay coches en el taller ahora.
      </section>
    );
  }

  return (
    <section data-testid="tablero-taller" className="bg-white border border-slate-100 rounded-2xl p-4 space-y-3">
      <h3 className="text-xs font-bold text-slate-600 uppercase tracking-wider flex items-center gap-1.5">
        <Wrench className="w-3.5 h-3.5 text-orange-500" /> Estado de cada coche en el taller
        <span className="text-slate-400 normal-case font-semibold">({fichas.length})</span>
      </h3>
      <div className="grid gap-2.5 sm:grid-cols-2 xl:grid-cols-3">
        {fichas.map(({ ot, estado, hechas, total }) => {
          const v = vehiculos.find(x => x.id === ot.vehiculoId);
          const pct = total > 0 ? Math.round((hechas / total) * 100) : 0;
          const Tag = onSeleccionar ? 'button' : 'div';
          return (
            <Tag
              key={ot.id}
              {...(onSeleccionar ? { type: 'button' as const, onClick: () => onSeleccionar(ot) } : {})}
              data-testid="ficha-taller"
              className={`text-left p-3 rounded-xl border border-slate-100 bg-slate-50/60 space-y-2 ${onSeleccionar ? 'hover:bg-slate-100 cursor-pointer transition' : ''}`}
            >
              <div className="flex items-center justify-between gap-2">
                <span className="font-black font-mono text-slate-900">{v?.matricula ?? '—'}</span>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${ESTADO[estado].cls}`}>{ESTADO[estado].etiqueta}</span>
              </div>
              <p className="text-xs font-semibold text-slate-600 truncate">{v ? `${v.marca} ${v.modelo}` : 'Vehículo no disponible'} · {ot.numero}</p>
              {ot.tecnicoAsignado ? (
                <p className="text-xs text-slate-500">Mecánico: <strong className="text-slate-700">{ot.tecnicoAsignado}</strong></p>
              ) : (
                <p className="text-xs font-semibold text-amber-600 flex items-center gap-1"><UserX className="w-3 h-3" /> Sin mecánico asignado</p>
              )}
              {total > 0 ? (
                <div aria-label={`${hechas} de ${total} tareas hechas`}>
                  <div className="h-1.5 rounded-full bg-slate-200 overflow-hidden"><div className="h-full rounded-full bg-emerald-500" style={{ width: `${pct}%` }} /></div>
                  <p className="text-[11px] font-semibold text-slate-500 mt-1">{hechas} de {total} tareas</p>
                </div>
              ) : (
                <p className="text-[11px] text-slate-400">Sin tareas detalladas</p>
              )}
              <p className="text-[10px] text-slate-400">Actualizado {haceCuanto(ot.fechaActualizacion, ahora) || '—'}</p>
            </Tag>
          );
        })}
      </div>
    </section>
  );
}
