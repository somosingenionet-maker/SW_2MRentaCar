import { useState } from 'react';
import { motion } from 'motion/react';
import { FileText, Printer, MessageCircle, Mail as MailIcon } from 'lucide-react';
import type { Reserva, Cliente, Vehiculo, SolicitudReserva } from '../types';
import type { EmpresaConfig } from '../data/empresaConfig';
import ContratoAlquiler from './ContratoAlquiler';
import { IDIOMAS_CONTRATO, TEXTOS_CONTRATO, type IdiomaContrato } from '../utils/contratoTextos';
import { formatDate } from '../utils/dateFormat';
import { fechaConHora } from '../utils/horaReserva';
import { diasAlquiler } from '../utils/solicitudes';

interface Props {
  reserva: Reserva;
  cliente?: Cliente;
  vehiculo?: Vehiculo;
  /** Pedido de la web del que viene la reserva, si lo hay. */
  solicitud?: SolicitudReserva;
  empresa: EmpresaConfig;
  onClose: () => void;
}

/** Ventana con el contrato de una reserva: idioma, imprimir y envío por WhatsApp o correo. */
export default function ContratoVisor({ reserva, cliente, vehiculo, solicitud, empresa, onClose }: Props) {
  const [idioma, setIdioma] = useState<IdiomaContrato>('es');
  const tx = TEXTOS_CONTRATO[idioma];
  const fecha = (iso: string) => formatDate(iso, idioma);
  const texto = tx.mensaje({
    nombre: cliente?.nombre ?? '',
    vehiculo: `${vehiculo?.marca ?? ''} ${vehiculo?.modelo ?? ''}`.trim(),
    matricula: vehiculo?.matricula ?? '',
    desde: fechaConHora(reserva.fechaInicio, reserva.horaInicio, fecha),
    hasta: fechaConHora(reserva.fechaFin, reserva.horaFin, fecha),
    dias: diasAlquiler(reserva.fechaInicio, reserva.fechaFin),
    total: reserva.totalCobrado.toFixed(2),
    empresa: empresa.nombre,
  });
  const tel = cliente?.telefono?.replace(/\D/g, '') ?? '';

  return (
    <div data-imprimible data-hoja="contrato" className="fixed inset-0 bg-slate-900/80 backdrop-blur-xs flex items-start justify-center p-4 z-50 overflow-y-auto pt-10">
      <motion.div
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 20, opacity: 0 }}
        className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full border border-slate-200 overflow-hidden print:shadow-none print:border-none print:max-w-full my-6"
        id="legal-contract-pdf-modal"
      >
        {/* Cabecera de la ventana (no se imprime) */}
        <div className="px-6 py-4 bg-slate-800 text-white flex justify-between items-center print:hidden">
          <div className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-blue-400" />
            <span className="font-bold text-sm font-display">Visor de Contrato de Alquiler</span>
          </div>
          <div className="flex gap-2 flex-wrap">
            <button
              onClick={() => window.print()}
              className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-lg transition flex items-center gap-1 cursor-pointer font-sans"
            >
              <Printer className="w-3.5 h-3.5" /> Descargar / Imprimir
            </button>
            {/* Selector de idioma del contrato (también cambia el mensaje de WhatsApp y de correo) */}
            <div className="inline-flex rounded-lg border border-slate-600 overflow-hidden text-xs font-bold" role="group" aria-label="Idioma del contrato">
              {IDIOMAS_CONTRATO.map(i => (
                <button
                  key={i.id}
                  type="button"
                  onClick={() => setIdioma(i.id)}
                  aria-pressed={idioma === i.id}
                  className={`px-3 py-1.5 transition cursor-pointer ${idioma === i.id ? 'bg-white text-slate-900' : 'bg-slate-700 text-slate-200 hover:bg-slate-600'}`}
                >
                  {i.etiqueta}
                </button>
              ))}
            </div>
            {cliente?.telefono && (
              <a href={`https://wa.me/${tel}?text=${encodeURIComponent(texto)}`} target="_blank" rel="noreferrer"
                className="px-3 py-1.5 bg-green-600 hover:bg-green-500 text-white text-xs font-bold rounded-lg transition flex items-center gap-1">
                <MessageCircle className="w-3.5 h-3.5" /> WhatsApp
              </a>
            )}
            {cliente?.correo && (
              <a href={`mailto:${cliente.correo}?subject=${encodeURIComponent(tx.asuntoCorreo(empresa.nombre))}&body=${encodeURIComponent(texto)}`}
                className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-lg transition flex items-center gap-1">
                <MailIcon className="w-3.5 h-3.5" /> Email
              </a>
            )}
            <button
              onClick={onClose}
              className="px-3 py-1.5 bg-slate-700 hover:bg-slate-600 text-slate-200 text-xs font-bold rounded-lg transition cursor-pointer font-sans"
            >
              Cerrar
            </button>
          </div>
        </div>

        {/* Cuerpo imprimible del contrato, en el idioma elegido */}
        <ContratoAlquiler reserva={reserva} cliente={cliente} vehiculo={vehiculo} empresa={empresa} idioma={idioma} solicitud={solicitud} />
      </motion.div>
    </div>
  );
}
