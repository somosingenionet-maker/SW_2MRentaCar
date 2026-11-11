import { Check, Droplets, X } from 'lucide-react';
import { FILTROS_ACEITE, filtrosSinRevisar, resumenFiltros, siguienteEstadoFiltro, type EstadoFiltros, type FiltroId } from '../utils/filtrosAceite';

interface Props {
  estado: EstadoFiltros;
  /** true = «Cambiado», false = «No se cambió», null = quitar la marca. */
  onCambiar: (filtro: FiltroId, cambiado: boolean | null) => void;
  /** Botones grandes para el móvil del mecánico. */
  grande?: boolean;
  deshabilitado?: boolean;
}

/** Check list del cambio de aceite: por cada filtro, «Cambiado» o «No se cambió» (un coche de gasolina no lleva filtro de diésel). */
export function ChecklistFiltros({ estado, onCambiar, grande = false, deshabilitado = false }: Props) {
  const pendientes = filtrosSinRevisar(estado);
  const boton = (activo: boolean, color: string) =>
    `${grande ? 'min-h-[46px] px-3 text-sm' : 'min-h-[28px] px-2.5 text-[11px]'} flex-1 rounded-lg border-2 font-bold inline-flex items-center justify-center gap-1 cursor-pointer disabled:opacity-60 ${activo ? color : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50 active:bg-slate-100'}`;
  return (
    <div data-testid="checklist-filtros" className="space-y-2">
      <ul className="space-y-2">
        {FILTROS_ACEITE.map(f => {
          const v = estado[f.id];
          return (
            <li key={f.id} data-testid={`filtro-${f.id}`} className={`rounded-xl border ${v === undefined ? 'border-slate-200 bg-white' : v ? 'border-emerald-200 bg-emerald-50/60' : 'border-slate-200 bg-slate-50'} ${grande ? 'p-3 space-y-2' : 'p-2 space-y-1.5'}`}>
              <p className={`${grande ? 'text-sm' : 'text-xs'} font-bold text-slate-800`}>{f.nombre}</p>
              <div role="group" aria-label={f.nombre} className="flex gap-2">
                <button type="button" disabled={deshabilitado} aria-pressed={v === true}
                  onClick={() => onCambiar(f.id, siguienteEstadoFiltro(v, true))}
                  className={boton(v === true, 'bg-emerald-600 border-emerald-600 text-white')}>
                  <Check className={grande ? 'w-4 h-4' : 'w-3 h-3'} /> Cambiado
                </button>
                <button type="button" disabled={deshabilitado} aria-pressed={v === false}
                  onClick={() => onCambiar(f.id, siguienteEstadoFiltro(v, false))}
                  className={boton(v === false, 'bg-slate-600 border-slate-600 text-white')}>
                  <X className={grande ? 'w-4 h-4' : 'w-3 h-3'} /> No se cambió
                </button>
              </div>
            </li>
          );
        })}
      </ul>
      <p data-testid="filtros-pendientes" className={`${grande ? 'text-xs' : 'text-[11px]'} font-semibold ${pendientes > 0 ? 'text-amber-700' : 'text-emerald-700'}`}>
        {pendientes > 0 ? `Faltan ${pendientes} ${pendientes === 1 ? 'filtro' : 'filtros'} por marcar.` : 'Los cuatro filtros están marcados.'}
      </p>
    </div>
  );
}

/** Solo lectura: «Cambio de aceite · ✔ Aire · ✔ Aceite · ✘ Diésel (no se cambió) · Habitáculo sin revisar», para el historial del vehículo. */
export function ResumenFiltros({ estado }: { estado: EstadoFiltros | undefined }) {
  return (
    <div data-testid="resumen-filtros" className="rounded-lg border border-amber-100 bg-amber-50/60 px-2.5 py-2">
      <p className="text-[10px] font-bold uppercase text-amber-800 flex items-center gap-1 mb-1"><Droplets className="w-3 h-3" /> Cambio de aceite · filtros</p>
      <ul className="flex flex-wrap gap-x-3 gap-y-0.5 text-xs">
        {resumenFiltros(estado).map(f => (
          <li key={f.id} data-testid={`resumen-${f.id}`} className={f.estado === 'cambiado' ? 'text-emerald-700 font-semibold' : f.estado === 'no_cambiado' ? 'text-slate-500' : 'text-slate-400 italic'}>
            {f.estado === 'cambiado' ? '✔' : f.estado === 'no_cambiado' ? '✘' : '·'} {f.nombre.replace('Filtro de ', '')}
            {f.estado === 'no_cambiado' && ' (no se cambió)'}{f.estado === 'sin_revisar' && ' (sin revisar)'}
          </li>
        ))}
      </ul>
    </div>
  );
}
