import { UserPlus } from 'lucide-react';
import type { SegundoConductor } from '../types';
import { SEGUNDO_CONDUCTOR_VACIO, tieneSegundoConductor, type DatosSegundoConductor } from '../utils/segundoConductor';

interface Props {
  value: DatosSegundoConductor;
  onChange: (cambio: DatosSegundoConductor) => void;
}

const INPUT = 'w-full mt-1 px-3 h-[38px] border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-blue-500';
const LABEL = 'block text-xs font-bold text-slate-500 uppercase whitespace-nowrap';

/** Casilla «Añadir segundo conductor»: al marcarla pide su nombre, su documento y el número de su permiso de conducir. */
export default function SegundoConductorFields({ value, onChange }: Props) {
  const activo = tieneSegundoConductor(value);
  const c = value.segundoConductor ?? SEGUNDO_CONDUCTOR_VACIO;
  const cambiar = (campo: keyof SegundoConductor, texto: string) => onChange({ segundoConductor: { ...c, [campo]: texto } });
  return (
    <div data-testid="campos-segundo-conductor" className="border-t border-slate-100 pt-4 space-y-3">
      <label className="flex items-center gap-2 cursor-pointer select-none">
        <input type="checkbox" checked={activo} className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
          onChange={e => onChange({ segundoConductor: e.target.checked ? { ...SEGUNDO_CONDUCTOR_VACIO } : null })} />
        <span className="text-xs font-bold text-slate-400 uppercase tracking-widest font-display flex items-center gap-1.5">
          <UserPlus className="w-3.5 h-3.5" /> Añadir segundo conductor
        </span>
      </label>
      {activo && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-start">
          <div>
            <label className={LABEL} htmlFor="segundo-conductor-nombre">Nombre *</label>
            <input id="segundo-conductor-nombre" type="text" className={INPUT} value={c.nombre} autoComplete="off" placeholder="Nombre y apellidos"
              onChange={e => cambiar('nombre', e.target.value)} />
          </div>
          <div>
            <label className={LABEL} htmlFor="segundo-conductor-dni">DNI / NIE / Pasaporte *</label>
            <input id="segundo-conductor-dni" type="text" className={`${INPUT} font-mono`} value={c.dni} autoComplete="off" placeholder="Documento"
              onChange={e => cambiar('dni', e.target.value.toUpperCase())} />
          </div>
          <div>
            <label className={LABEL} htmlFor="segundo-conductor-permiso">Permiso de conducir *</label>
            <input id="segundo-conductor-permiso" type="text" className={`${INPUT} font-mono`} value={c.permiso} autoComplete="off" placeholder="Nº del permiso"
              onChange={e => cambiar('permiso', e.target.value.toUpperCase())} />
          </div>
        </div>
      )}
    </div>
  );
}
