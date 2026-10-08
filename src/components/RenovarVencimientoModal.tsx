import { useState } from 'react';
import { CalendarCheck, X } from 'lucide-react';
import { motion } from 'motion/react';
import { formatDate } from '../utils/dateFormat';
import { hoyISO, sumarAnios } from '../utils/fechas';

interface Props {
  titulo: string;
  /** Qué se hizo: "ITV", "renovación del seguro"... para las etiquetas. */
  etiquetaRealizado: string;
  /** Vencimiento que tenía hasta ahora, solo informativo. */
  vencimientoAnterior?: string;
  onConfirm: (nuevoVencimiento: string) => void;
  onCancel: () => void;
}

/**
 * Cierra una alerta de ITV, seguro o impuesto. Se elige cuándo se hizo (puede
 * haber sido ayer) y el nuevo vencimiento se calcula con +1 año, pero se puede
 * ajustar a mano (p. ej. un seguro semestral).
 */
export default function RenovarVencimientoModal({ titulo, etiquetaRealizado, vencimientoAnterior, onConfirm, onCancel }: Props) {
  const [realizado, setRealizado] = useState(hoyISO());
  const [vencimiento, setVencimiento] = useState(sumarAnios(hoyISO(), 1));
  const [vencimientoAjustado, setVencimientoAjustado] = useState(false);

  const cambiarRealizado = (valor: string) => {
    setRealizado(valor);
    // Mientras nadie toque el vencimiento, sigue a la fecha de realización (+1 año).
    if (!vencimientoAjustado && valor) setVencimiento(sumarAnios(valor, 1));
  };

  const valido = Boolean(realizado) && Boolean(vencimiento) && vencimiento > realizado;

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-[60]">
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-sm w-full overflow-hidden"
      >
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg shrink-0 bg-blue-100 text-blue-600"><CalendarCheck className="w-5 h-5" /></div>
            <h3 className="font-extrabold text-slate-800 text-sm">{titulo}</h3>
          </div>
          <button onClick={onCancel} aria-label="Cerrar" className="p-1 hover:bg-slate-100 rounded-md transition text-slate-400 shrink-0 cursor-pointer">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="px-6 py-4 space-y-4">
          {vencimientoAnterior && (
            <p className="text-xs text-slate-500">Vencimiento anterior: <strong className="text-slate-700">{formatDate(vencimientoAnterior)}</strong></p>
          )}
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase">Fecha de {etiquetaRealizado}</label>
            <input
              type="date"
              value={realizado}
              max={hoyISO()}
              onChange={e => cambiarRealizado(e.target.value)}
              className="w-full mt-1 px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase">Nuevo vencimiento</label>
            <input
              type="date"
              value={vencimiento}
              min={realizado}
              onChange={e => { setVencimiento(e.target.value); setVencimientoAjustado(true); }}
              className="w-full mt-1 px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
            <p className="text-[11px] text-slate-400 mt-1">Se calcula con un año desde la fecha de realización; puedes cambiarlo.</p>
          </div>
          {!valido && <p className="text-xs text-rose-600 font-medium">El nuevo vencimiento debe ser posterior a la fecha de realización.</p>}
        </div>

        <div className="px-6 pb-5 flex justify-end gap-2">
          <button onClick={onCancel} className="px-4 py-2 border border-slate-200 rounded-xl hover:bg-slate-50 transition text-sm text-slate-600 font-medium cursor-pointer">
            Cancelar
          </button>
          <button
            onClick={() => onConfirm(vencimiento)}
            disabled={!valido}
            className="px-4 py-2 rounded-xl text-sm font-bold text-white transition bg-blue-600 hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
          >
            Confirmar
          </button>
        </div>
      </motion.div>
    </div>
  );
}
