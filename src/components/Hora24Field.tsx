import { HORAS_24, partesHora, unirHora, opcionesMinutos } from '../utils/hora24';

interface Props {
  /** «HH:mm» en reloj de 24 h, o cadena vacía si aún no hay hora. */
  value: string;
  onChange: (valor: string) => void;
  id?: string;
  /** Texto para lectores de pantalla, p. ej. «Hora de entrega». */
  etiqueta: string;
}

const SELECT = 'flex-1 min-w-0 px-2 h-[38px] border border-slate-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:bg-slate-50 disabled:text-slate-300';

/**
 * Hora en formato de 24 horas (00 a 23). El campo de hora del navegador sigue el formato del
 * sistema de cada ordenador (con AM/PM en algunos): este es siempre igual.
 */
export default function Hora24Field({ value, onChange, id, etiqueta }: Props) {
  const { h, m } = partesHora(value);
  return (
    <div className="flex items-center gap-1.5 mt-1" id={id}>
      <select aria-label={`${etiqueta}: hora`} value={h} className={SELECT}
        onChange={e => onChange(unirHora(e.target.value, m))}>
        <option value="">--</option>
        {HORAS_24.map(x => <option key={x} value={x}>{x}</option>)}
      </select>
      <span className="font-bold text-slate-400">:</span>
      <select aria-label={`${etiqueta}: minutos`} value={m} disabled={!h} className={SELECT}
        onChange={e => onChange(unirHora(h, e.target.value))}>
        {!h && <option value="">--</option>}
        {opcionesMinutos(m).map(x => <option key={x} value={x}>{x}</option>)}
      </select>
    </div>
  );
}
