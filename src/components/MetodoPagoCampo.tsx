import type { MetodoPago } from '../types';
import { METODOS_PAGO } from '../utils/metodoPago';

interface Props {
  value: MetodoPago | '';
  onChange: (m: MetodoPago | '') => void;
}

/** Cómo paga el cliente: Efectivo, Tarjeta o Transferencia (se puede dejar sin indicar y volver a pulsar para quitarlo). */
export default function MetodoPagoCampo({ value, onChange }: Props) {
  return (
    <div data-testid="campo-metodo-pago">
      <span id="etiqueta-metodo-pago" className="block text-xs font-bold text-slate-500 uppercase">Método de pago</span>
      <div role="group" aria-labelledby="etiqueta-metodo-pago" className="mt-1 grid grid-cols-3 gap-2">
        {METODOS_PAGO.map(m => {
          const activo = value === m.id;
          return (
            <button key={m.id} type="button" aria-pressed={activo} data-testid={`metodo-pago-${m.id}`} onClick={() => onChange(activo ? '' : m.id)}
              className={`py-2 rounded-lg border text-xs transition cursor-pointer ${activo ? 'border-blue-500 bg-blue-50 text-blue-700 font-bold' : 'border-slate-200 text-slate-600 hover:border-slate-300 hover:bg-slate-50'}`}>
              {m.etiqueta}
            </button>
          );
        })}
      </div>
    </div>
  );
}
