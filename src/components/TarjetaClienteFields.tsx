import { CreditCard } from 'lucide-react';
import { DatosTarjeta, formatearNumero, normalizarCaducidad, normalizarNumero } from '../utils/tarjeta';

interface Props {
  value: DatosTarjeta;
  onChange: (cambio: DatosTarjeta) => void;
}

const INPUT = 'w-full mt-1 px-3 h-[38px] border border-slate-200 rounded-lg text-sm font-mono focus:outline-none focus:ring-1 focus:ring-blue-500';
const LABEL = 'block text-xs font-bold text-slate-500 uppercase whitespace-nowrap';

/** Número de la tarjeta del cliente y su caducidad. El CVV no se pide ni se guarda. */
export default function TarjetaClienteFields({ value, onChange }: Props) {
  return (
    <div data-testid="campos-tarjeta" className="border-t border-slate-100 pt-4 space-y-3">
      <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest font-display flex items-center gap-1.5">
        <CreditCard className="w-3.5 h-3.5" /> Tarjeta
      </h4>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-start">
        <div className="sm:col-span-2">
          <label className={LABEL} htmlFor="tarjeta-numero">Número de tarjeta</label>
          <input id="tarjeta-numero" type="text" inputMode="numeric" className={INPUT} autoComplete="off" value={formatearNumero(value.tarjetaNumero ?? '')}
            onChange={e => onChange({ tarjetaNumero: normalizarNumero(e.target.value) })} placeholder="0000 0000 0000 0000" />
        </div>
        <div>
          <label className={LABEL} htmlFor="tarjeta-caducidad">Caducidad</label>
          <input id="tarjeta-caducidad" type="text" inputMode="numeric" className={INPUT} autoComplete="off" value={value.tarjetaCaducidad ?? ''}
            onChange={e => onChange({ tarjetaCaducidad: normalizarCaducidad(e.target.value) })} placeholder="MM/AA" />
        </div>
      </div>
      <p className="text-[10px] text-slate-400">El código de seguridad (CVV) no se guarda: no lo anotes.</p>
    </div>
  );
}
