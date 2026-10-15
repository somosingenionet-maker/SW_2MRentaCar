import { ReactNode } from 'react';
import { motion } from 'motion/react';
import { X } from 'lucide-react';

interface Props {
  titulo: ReactNode;
  icono: ReactNode;
  onClose: () => void;
  /** Ancho máximo (clase de Tailwind). Por defecto max-w-lg. */
  ancho?: string;
  id?: string;
  /** Contenido fijo al pie (botones de guardar), fuera de la zona con scroll. */
  pie?: ReactNode;
  children: ReactNode;
}

/**
 * Cuadro emergente estándar de la app: tarjeta blanca centrada con cabecera gris clara,
 * sobre un fondo difuminado. Si el contenido es más alto que la pantalla, solo se desplaza
 * el cuerpo (la cabecera y el pie quedan a la vista). El contenedor exterior deja que la
 * página también se desplace en pantallas muy bajas, así la parte de arriba nunca se recorta.
 */
export default function ModalShell({ titulo, icono, onClose, ancho = 'max-w-lg', id, pie, children }: Props) {
  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 overflow-y-auto">
      <div className="flex min-h-full items-center justify-center p-4">
        <motion.div
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.95, opacity: 0 }}
          className={`bg-white rounded-2xl border border-slate-200 shadow-2xl ${ancho} w-full flex flex-col overflow-hidden max-h-[90vh]`}
          id={id}
        >
          <div className="px-6 py-4 bg-slate-50 border-b border-slate-100 flex justify-between items-center shrink-0">
            <h3 className="font-extrabold text-slate-800 flex items-center gap-2 font-display">
              {icono}
              {titulo}
            </h3>
            <button onClick={onClose} aria-label="Cerrar" className="p-1 hover:bg-slate-200 rounded-md transition text-slate-400 cursor-pointer">
              <X className="w-5 h-5" />
            </button>
          </div>
          <div className="flex-1 min-h-0 overflow-y-auto">{children}</div>
          {pie && <div className="shrink-0 border-t border-slate-100">{pie}</div>}
        </motion.div>
      </div>
    </div>
  );
}
