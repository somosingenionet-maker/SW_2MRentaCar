import { IdCard } from 'lucide-react';
import { DatosCarnet } from '../utils/carnet';
import { hoyISO } from '../utils/fechas';

interface Props {
  value: DatosCarnet;
  onChange: (cambio: DatosCarnet) => void;
}

// Misma altura fija en los tres (un campo de fecha es más alto que uno de texto en algunos navegadores).
const INPUT = 'w-full mt-1 px-3 h-[38px] border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-blue-500';
const LABEL = 'block text-xs font-bold text-slate-500 uppercase whitespace-nowrap';

/** Número, fecha de expedición y fecha de vencimiento del carnet de conducir del cliente. */
export default function CarnetConducirFields({ value, onChange }: Props) {
  return (
    <div className="border-t border-slate-100 pt-4 space-y-3">
      <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest font-display flex items-center gap-1.5">
        <IdCard className="w-3.5 h-3.5" /> Carnet de conducir
      </h4>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-start">
        <div>
          <label className={LABEL}>Número</label>
          <input
            type="text"
            className={`${INPUT} font-mono`}
            value={value.carnetNumero ?? ''}
            onChange={e => onChange({ carnetNumero: e.target.value.toUpperCase() })}
            placeholder="Nº del permiso"
            autoComplete="off"
          />
        </div>
        <div>
          <label className={LABEL}>Expedición</label>
          <input
            type="date"
            className={INPUT}
            max={hoyISO()}
            value={value.carnetExpedicion ?? ''}
            onChange={e => onChange({ carnetExpedicion: e.target.value })}
          />
        </div>
        <div>
          <label className={LABEL}>Vencimiento</label>
          <input
            type="date"
            className={INPUT}
            min={value.carnetExpedicion || undefined}
            value={value.carnetVencimiento ?? ''}
            onChange={e => onChange({ carnetVencimiento: e.target.value })}
          />
        </div>
      </div>
    </div>
  );
}
