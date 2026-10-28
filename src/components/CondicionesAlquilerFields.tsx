import { Vehiculo } from '../types';
import { CONDICIONES_POR_DEFECTO } from '../utils/condicionesAlquiler';

type Condiciones = Pick<Vehiculo, 'transmision' | 'fianza' | 'seguroAmpliadoDia'>;

interface Props {
  value: Condiciones;
  onChange: (cambios: Partial<Condiciones>) => void;
}

/** Transmisión, fianza y seguro ampliado de un vehículo de alquiler (se usa en alta y en edición). */
export default function CondicionesAlquilerFields({ value, onChange }: Props) {
  const ofreceSeguro = value.seguroAmpliadoDia != null;
  const campo = 'w-full border border-blue-200 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 bg-white';
  return (
    <div className="mt-3 ml-6 space-y-2">
      <p className="text-[11px] font-bold text-blue-800">Condiciones del alquiler</p>
      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="block text-[10px] font-semibold text-blue-700 mb-0.5">Transmisión</label>
          <select
            value={value.transmision ?? ''}
            onChange={e => onChange({ transmision: (e.target.value || undefined) as Vehiculo['transmision'] })}
            className={campo}
          >
            <option value="">Sin indicar</option>
            <option value="manual">Manual</option>
            <option value="automatico">Automático</option>
          </select>
        </div>
        <div>
          <label className="block text-[10px] font-semibold text-blue-700 mb-0.5" title="Es el importe que se propone en cada reserva; el taller lo puede cambiar en cada una.">Fianza habitual (€)</label>
          <input
            type="number" min="0" step="0.01" placeholder="0"
            value={value.fianza ?? ''}
            onChange={e => onChange({ fianza: e.target.value === '' ? 0 : Number(e.target.value) })}
            className={campo}
          />
        </div>
      </div>
      <div>
        <label className="flex items-center gap-2 cursor-pointer select-none">
          <input
            type="checkbox"
            checked={ofreceSeguro}
            onChange={e => onChange({ seguroAmpliadoDia: e.target.checked ? CONDICIONES_POR_DEFECTO.seguroAmpliadoDia : null })}
            className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
          />
          <span className="text-[11px] font-semibold text-blue-800">Ofrece seguro a todo riesgo</span>
        </label>
        {ofreceSeguro && (
          <div className="mt-1.5 w-40">
            <label className="block text-[10px] font-semibold text-blue-700 mb-0.5">Precio por día (€)</label>
            <input
              type="number" min="0" step="0.01"
              value={value.seguroAmpliadoDia ?? ''}
              onChange={e => onChange({ seguroAmpliadoDia: e.target.value === '' ? 0 : Number(e.target.value) })}
              className={campo}
            />
          </div>
        )}
        {!ofreceSeguro && <p className="text-[10px] text-blue-500 mt-1">Este vehículo no ofrece seguro ampliado: no aparecerá la opción al reservarlo.</p>}
      </div>
    </div>
  );
}
