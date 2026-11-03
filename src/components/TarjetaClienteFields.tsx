import { CreditCard } from 'lucide-react';
import { DatosTarjeta, MARCAS_TARJETA, normalizarCaducidad, normalizarUltimos4 } from '../utils/tarjeta';

interface Props {
  value: DatosTarjeta;
  onChange: (cambio: DatosTarjeta) => void;
}

const INPUT = 'w-full mt-1 px-3 h-[38px] border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-blue-500';
const LABEL = 'block text-xs font-bold text-slate-500 uppercase whitespace-nowrap';

/** Tarjeta con la que el cliente deja la fianza: titular, marca, últimos 4 dígitos y caducidad. Nunca el número completo ni el CVV. */
export default function TarjetaClienteFields({ value, onChange }: Props) {
  return (
    <div data-testid="campos-tarjeta" className="border-t border-slate-100 pt-4 space-y-3">
      <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest font-display flex items-center gap-1.5">
        <CreditCard className="w-3.5 h-3.5" /> Tarjeta
      </h4>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 items-start">
        <div className="sm:col-span-2">
          <label className={LABEL} htmlFor="tarjeta-titular">Titular</label>
          <input id="tarjeta-titular" type="text" className={INPUT} value={value.tarjetaTitular ?? ''} autoComplete="off"
            onChange={e => onChange({ tarjetaTitular: e.target.value })} placeholder="Nombre como figura en la tarjeta" />
        </div>
        <div>
          <label className={LABEL} htmlFor="tarjeta-marca">Marca</label>
          <select id="tarjeta-marca" className={INPUT} value={value.tarjetaMarca ?? ''} onChange={e => onChange({ tarjetaMarca: e.target.value })}>
            <option value="">Sin indicar</option>
            {MARCAS_TARJETA.map(m => <option key={m} value={m}>{m}</option>)}
          </select>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={LABEL} htmlFor="tarjeta-ultimos4">Últimos 4</label>
            <input id="tarjeta-ultimos4" type="text" inputMode="numeric" className={`${INPUT} font-mono`} value={value.tarjetaUltimos4 ?? ''} autoComplete="off"
              onChange={e => onChange({ tarjetaUltimos4: normalizarUltimos4(e.target.value) })} placeholder="1234" />
          </div>
          <div>
            <label className={LABEL} htmlFor="tarjeta-caducidad">Caduca</label>
            <input id="tarjeta-caducidad" type="text" inputMode="numeric" className={`${INPUT} font-mono`} value={value.tarjetaCaducidad ?? ''} autoComplete="off"
              onChange={e => onChange({ tarjetaCaducidad: normalizarCaducidad(e.target.value) })} placeholder="MM/AA" />
          </div>
        </div>
      </div>
      <p className="text-[10px] text-slate-400">Solo se guardan los 4 últimos dígitos y la caducidad, como referencia. Nunca anotes aquí el número completo ni el CVV.</p>
    </div>
  );
}
