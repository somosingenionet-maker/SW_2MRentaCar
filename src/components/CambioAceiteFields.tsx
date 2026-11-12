import { Droplets } from 'lucide-react';
import { type DatosAceite } from '../utils/cambioAceite';

interface Props {
  valor: DatosAceite;
  onChange: (cambios: DatosAceite) => void;
  /** Prefijo de los id de los campos (hay un formulario de alta y otro de edición). */
  idBase: string;
}

const CAMPO = 'w-full mt-1 px-2.5 py-1.5 border border-slate-200 rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-blue-500';

/** Último cambio de aceite (fecha y km) y fecha del próximo. Opcional: se puede dejar todo vacío. */
export default function CambioAceiteFields({ valor, onChange, idBase }: Props) {
  return (
    <div data-testid="campos-cambio-aceite" className="space-y-1.5">
      <p className="text-[10px] font-bold text-slate-500 uppercase flex items-center gap-1"><Droplets className="w-3 h-3 text-amber-500" /> Cambio de aceite</p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label htmlFor={`${idBase}-aceite-fecha`} className="block text-[10px] font-bold text-slate-500 uppercase">Fecha del último cambio</label>
          <input id={`${idBase}-aceite-fecha`} type="date" className={CAMPO} value={valor.aceiteFecha ?? ''}
            onChange={e => onChange({ ...valor, aceiteFecha: e.target.value })} />
        </div>
        <div>
          <label htmlFor={`${idBase}-aceite-km`} className="block text-[10px] font-bold text-slate-500 uppercase">Km del cambio</label>
          <input id={`${idBase}-aceite-km`} type="number" min="0" step="1" inputMode="numeric" placeholder="Ej.: 85000" className={CAMPO}
            value={valor.aceiteKm ?? ''}
            onChange={e => onChange({ ...valor, aceiteKm: e.target.value === '' ? null : Number(e.target.value) })} />
        </div>
        <div>
          <label htmlFor={`${idBase}-aceite-proxima`} className="block text-[10px] font-bold text-slate-500 uppercase">Fecha del próximo cambio</label>
          <input id={`${idBase}-aceite-proxima`} type="date" className={CAMPO} value={valor.aceiteProximaFecha ?? ''}
            onChange={e => onChange({ ...valor, aceiteProximaFecha: e.target.value })} />
        </div>
        <div>
          <label htmlFor={`${idBase}-aceite-proximo-km`} className="block text-[10px] font-bold text-slate-500 uppercase">Km del próximo cambio</label>
          <input id={`${idBase}-aceite-proximo-km`} type="number" min="0" step="1" inputMode="numeric" placeholder="Ej.: 100000" className={CAMPO}
            value={valor.aceiteProximoKm ?? ''}
            onChange={e => onChange({ ...valor, aceiteProximoKm: e.target.value === '' ? null : Number(e.target.value) })} />
        </div>
      </div>
    </div>
  );
}
