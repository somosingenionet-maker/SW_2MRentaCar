import { CalendarClock, User, Car, Wrench, Phone, StickyNote, FileText, MessageCircle, Pencil, ArrowRightCircle, ClipboardCheck, Ban } from 'lucide-react';
import ModalShell from './ModalShell';
import type { Cita } from '../types';
import { horaFinCita } from '../utils/citas';

interface Props {
  cita: Cita;
  estado: { label: string; color: string; bg: string };
  cliente?: string | null;
  /** Teléfono de contacto: el de la cita o, si no hay, el de la ficha del cliente. */
  telefono?: string;
  vehiculo?: string | null;
  mecanico?: string;
  /** Orden en la que se convirtió la cita, si la hay. */
  orden?: { numero: string };
  /** Enlace de WhatsApp con el recordatorio ya escrito (solo si hay teléfono). */
  whatsappHref?: string;
  /** Presente si el usuario puede abrir Taller: lleva a la orden de la cita. */
  onVerOrden?: () => void;
  onEditar: () => void;
  onConfirmar: () => void;
  onCancelar: () => void;
  onConvertir: () => void;
  onClose: () => void;
}

function Dato({ icono, etiqueta, children }: { icono: React.ReactNode; etiqueta: string; children: React.ReactNode }) {
  return (
    <div className="flex items-start gap-3">
      <span className="mt-0.5 text-slate-400 shrink-0">{icono}</span>
      <div className="min-w-0">
        <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">{etiqueta}</p>
        <div className="text-sm font-semibold text-slate-800 break-words">{children}</div>
      </div>
    </div>
  );
}

/** Ficha de solo lectura de una cita, con las acciones habituales. */
export default function CitaDetalle({ cita, estado, cliente, telefono, vehiculo, mecanico, orden, whatsappHref, onVerOrden, onEditar, onConfirmar, onCancelar, onConvertir, onClose }: Props) {
  const inicio = new Date(cita.fechaHora);
  const abierta = cita.estado === 'pendiente' || cita.estado === 'confirmada';
  // «sábado, 31 de octubre de 2026» con solo la primera letra en mayúscula.
  const fechaLarga = inicio.toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }).replace(/^./, l => l.toUpperCase());

  return (
    <ModalShell
      id="cita-detalle"
      titulo="Cita"
      icono={<CalendarClock className="w-5 h-5 text-teal-600" />}
      onClose={onClose}
      ancho="max-w-md"
      pie={
        <div className="p-4 flex flex-wrap gap-2 justify-end">
          {onVerOrden && orden && (
            <button type="button" onClick={onVerOrden} className="px-3 py-2 rounded-lg bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer">
              <Wrench className="w-3.5 h-3.5" /> Ver orden {orden.numero} en Taller
            </button>
          )}
          {abierta && (
            <button type="button" onClick={onConvertir} className="px-3 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer">
              <ArrowRightCircle className="w-3.5 h-3.5" /> Convertir en OT
            </button>
          )}
          {cita.estado === 'pendiente' && (
            <button type="button" onClick={onConfirmar} className="px-3 py-2 rounded-lg border border-teal-300 text-teal-700 hover:bg-teal-50 text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer">
              <ClipboardCheck className="w-3.5 h-3.5" /> Confirmar
            </button>
          )}
          {whatsappHref && (
            <a href={whatsappHref} target="_blank" rel="noreferrer" className="px-3 py-2 rounded-lg bg-green-600 hover:bg-green-500 text-white text-xs font-bold inline-flex items-center gap-1.5">
              <MessageCircle className="w-3.5 h-3.5" /> Recordar por WhatsApp
            </a>
          )}
          <button type="button" onClick={onEditar} className="px-3 py-2 rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-50 text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer">
            <Pencil className="w-3.5 h-3.5" /> Editar
          </button>
          {abierta && (
            <button type="button" onClick={onCancelar} className="px-3 py-2 rounded-lg border border-amber-300 text-amber-700 hover:bg-amber-50 text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer">
              <Ban className="w-3.5 h-3.5" /> Cancelar cita
            </button>
          )}
        </div>
      }
    >
      <div className="p-6 space-y-4">
        <div className="flex items-center gap-2 flex-wrap">
          <p className="text-base font-extrabold text-slate-900">{cita.motivo}</p>
          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${estado.bg} ${estado.color}`}>{estado.label}</span>
        </div>

        <Dato icono={<CalendarClock className="w-4 h-4" />} etiqueta="Fecha y hora">
          <span>{fechaLarga}</span>
          <span className="block font-bold">
            {inicio.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })} – {horaFinCita(cita.fechaHora, cita.duracionMinutos)}
            <span className="font-medium text-slate-500"> · {cita.duracionMinutos} min</span>
          </span>
        </Dato>
        {(cliente || telefono) && (
          <Dato icono={<User className="w-4 h-4" />} etiqueta="Cliente">
            {cliente}{!cita.clienteId && cliente ? <span className="font-medium text-slate-400"> (sin registrar)</span> : null}
            {telefono && (
              <a href={`tel:${telefono.replace(/[^\d+]/g, '')}`} className="flex items-center gap-1 text-blue-600 font-semibold mt-0.5"><Phone className="w-3 h-3" /> {telefono}</a>
            )}
          </Dato>
        )}
        {vehiculo && <Dato icono={<Car className="w-4 h-4" />} etiqueta="Vehículo">{vehiculo}</Dato>}
        {mecanico && <Dato icono={<Wrench className="w-4 h-4" />} etiqueta="Mecánico">{mecanico}</Dato>}
        {cita.notas && <Dato icono={<StickyNote className="w-4 h-4" />} etiqueta="Notas"><span className="whitespace-pre-line font-medium">{cita.notas}</span></Dato>}
        {orden && <Dato icono={<FileText className="w-4 h-4" />} etiqueta="Orden de trabajo">Convertida en la orden {orden.numero}</Dato>}
      </div>
    </ModalShell>
  );
}
