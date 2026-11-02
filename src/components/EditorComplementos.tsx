import type { ExtraReserva } from '../types';
import { aplicarFilasEditor, etiquetaPrecioComplemento, nombreComplemento, type FilaEditorExtras } from '../utils/complementos';
import { fmt2 } from '../utils/moneda';

const euros = (n: number) => `${n < 0 ? '−' : n > 0 ? '+' : ''}${fmt2(Math.abs(n))} €`;

interface Props {
  /** Reserva que se edita: solo importan sus complementos y su total. */
  reserva: { extras?: ExtraReserva[]; totalCobrado: number };
  filas: FilaEditorExtras[];
  dias: number;
  /** El contrato ya está firmado: cambiar los complementos cambia lo que firmó el cliente. */
  firmada: boolean;
  onCambiar: (clave: string, cantidad: number) => void;
  onGuardar: () => void;
  onCancelar: () => void;
}

/** Editor de los complementos de una reserva ya creada, con el total nuevo a la vista antes de guardar. */
export function EditorComplementos({ reserva, filas, dias, firmada, onCambiar, onGuardar, onCancelar }: Props) {
  const { total, cambio } = aplicarFilasEditor(reserva, filas, dias);
  const delPedidoWeb = (reserva.extras ?? []).filter(e => e.precio == null || e.porDia == null);
  return (
    <div data-testid="editor-complementos" className="space-y-2 rounded-lg border border-blue-200 bg-white p-2.5 text-slate-800">
      {filas.length === 0 && <p className="text-[11px] text-slate-500">No hay complementos disponibles en el catálogo (Empresa → Complementos de alquiler).</p>}
      {filas.map(f => (
        <div key={f.clave} className="flex items-center justify-between gap-3">
          <label htmlFor={`edit-comp-${f.clave}`} className="min-w-0 text-xs">
            <strong className="block truncate font-bold">{nombreComplemento(f.nombre)}</strong>
            <span className="text-[10px] text-slate-400">
              {etiquetaPrecioComplemento(f)}{f.fueraDeCatalogo ? ' · ya no está en el catálogo' : ''}
            </span>
          </label>
          <select
            id={`edit-comp-${f.clave}`}
            value={f.cantidad}
            onChange={e => onCambiar(f.clave, Number(e.target.value))}
            className="h-[32px] w-16 rounded-lg border border-slate-200 bg-white text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
          >
            {Array.from(new Set([0, 1, 2, 3, 4, 5, f.cantidad])).sort((a, b) => a - b).map(n => <option key={n} value={n}>{n}</option>)}
          </select>
        </div>
      ))}
      {delPedidoWeb.length > 0 && (
        <p data-testid="editor-complementos-web" className="text-[10px] text-slate-500">
          Los complementos que vinieron con el pedido de la web ({delPedidoWeb.map(e => nombreComplemento(e.nombre)).join(', ')}) no se editan aquí: se conservan tal como los cobró la web.
        </p>
      )}
      {firmada && (
        <p data-testid="editor-complementos-firmada" role="alert" className="rounded-md border border-amber-200 bg-amber-50 px-2 py-1 text-[11px] font-semibold text-amber-800">
          El cliente ya firmó el contrato con los complementos anteriores. Si los cambias, anula la firma y vuelve a firmar.
        </p>
      )}
      <div className="flex items-center justify-between gap-2 border-t border-slate-100 pt-2 text-xs">
        <span data-testid="editor-complementos-total" className="font-bold">
          Total: {fmt2(total)} €{cambio !== 0 && <span className="ml-1 font-semibold text-slate-500">({euros(cambio)})</span>}
        </span>
        <span className="flex gap-2 text-[11px] font-bold">
          <button type="button" onClick={onCancelar} className="cursor-pointer rounded-lg border border-slate-200 px-3 py-1.5 text-slate-500 hover:bg-slate-50">Cancelar</button>
          <button type="button" onClick={onGuardar} className="cursor-pointer rounded-lg bg-blue-600 px-3 py-1.5 text-white hover:bg-blue-700">Guardar complementos</button>
        </span>
      </div>
    </div>
  );
}
