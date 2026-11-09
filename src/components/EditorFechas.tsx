import { CalendarClock } from 'lucide-react';
import Hora24Field from './Hora24Field';
import { InputPrecio } from './InputPrecio';
import { fmt2 } from '../utils/moneda';
import { formatDate } from '../utils/dateFormat';
import { propuestaCambioFechas, valorMostrado, type BorradorFechas } from '../utils/cambioFechas';
import { importePositivo } from '../utils/precioAlquiler';

type DatosReserva = Parameters<typeof propuestaCambioFechas>[0];

interface Props {
  reserva: DatosReserva;
  borrador: BorradorFechas;
  /** El coche ya se entregó: la fecha y la hora de entrega no se tocan (se amplía o se acorta la devolución). */
  inicioBloqueado: boolean;
  /** El contrato ya está firmado con las fechas anteriores. */
  firmada: boolean;
  error: string;
  onCambiar: (cambio: Partial<BorradorFechas>) => void;
  onGuardar: () => void;
  onCancelar: () => void;
}

const FECHA = 'h-[34px] w-full rounded-lg border border-slate-200 bg-white px-2 text-xs focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:bg-slate-50 disabled:text-slate-400';
const ETIQUETA = 'block text-[10px] font-bold uppercase text-slate-500 whitespace-nowrap';

/** Cambio de las fechas y horas de una reserva (ampliar o acortar el alquiler), con el precio nuevo a la vista antes de guardar. */
export function EditorFechas({ reserva, borrador, inicioBloqueado, firmada, error, onCambiar, onGuardar, onCancelar }: Props) {
  const p = propuestaCambioFechas(reserva, borrador);
  const valor = valorMostrado(reserva, borrador);
  const importe = importePositivo(valor);
  const diferencia = p.diasDespues - p.diasAntes;
  const totalActual = (reserva as { totalCobrado: number }).totalCobrado;
  return (
    <div data-testid="editor-fechas" className="space-y-2.5 rounded-lg border border-blue-200 bg-white p-2.5 text-slate-800">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div className="space-y-1.5">
          <span className={ETIQUETA}>Entrega al cliente</span>
          <input type="date" aria-label="Fecha de entrega" className={FECHA} value={inicioBloqueado ? reserva.fechaInicio : borrador.fechaInicio}
            disabled={inicioBloqueado} onChange={e => onCambiar({ fechaInicio: e.target.value })} />
          <Hora24Field etiqueta="Hora de entrega" value={borrador.horaInicio} onChange={v => onCambiar({ horaInicio: v })} />
          {inicioBloqueado && <p data-testid="inicio-bloqueado" className="text-[10px] text-slate-400">El coche ya se entregó: la entrega no se cambia.</p>}
        </div>
        <div className="space-y-1.5">
          <span className={ETIQUETA}>Devolución del vehículo</span>
          <input type="date" aria-label="Fecha de devolución" className={FECHA} min={inicioBloqueado ? reserva.fechaInicio : borrador.fechaInicio} value={borrador.fechaFin}
            onChange={e => onCambiar({ fechaFin: e.target.value })} />
          <Hora24Field etiqueta="Hora de devolución" value={borrador.horaFin} onChange={v => onCambiar({ horaFin: v })} />
        </div>
      </div>

      <p data-testid="resumen-dias" className="flex items-center gap-1.5 rounded-md bg-slate-50 px-2 py-1 text-[11px] font-semibold text-slate-600">
        <CalendarClock className="h-3.5 w-3.5 shrink-0 text-blue-600" />
        {p.diasDespues} {p.diasDespues === 1 ? 'día' : 'días'}
        {diferencia !== 0 && <span className={diferencia > 0 ? 'text-emerald-700' : 'text-amber-700'}>({diferencia > 0 ? `+${diferencia}` : `−${Math.abs(diferencia)}`} respecto a los {p.diasAntes} actuales)</span>}
        <span className="ml-auto font-normal text-slate-400">{formatDate(inicioBloqueado ? reserva.fechaInicio : borrador.fechaInicio)} → {formatDate(borrador.fechaFin)}</span>
      </p>

      <div>
        <label htmlFor="editor-fechas-importe" className={ETIQUETA}>{p.modo === 'fijo' ? 'Precio cerrado del alquiler (€)' : 'Total de la reserva (€)'}</label>
        <InputPrecio id="editor-fechas-importe" value={valor} onChange={e => onCambiar({ valor: e.target.value })}
          className="mt-1 h-[34px] w-full rounded-lg border border-slate-200 bg-white px-3 font-mono text-sm focus:outline-none focus:ring-1 focus:ring-blue-500" />
        <p data-testid="nota-importe" className="mt-1 text-[10px] text-slate-500">
          {p.modo === 'fijo'
            ? 'El precio cerrado no cambia solo al cambiar los días: súbelo o bájalo si la ampliación se cobra. El seguro y los complementos por día sí se recalculan.'
            : p.recalculado
              ? 'Calculado con los días nuevos (tarifa, seguro y complementos por día). Puedes corregirlo.'
              : diferencia === 0
                ? 'Los días no cambian: el total se mantiene.'
                : 'Esta reserva no se recalcula sola (viene de la web o tiene un precio pactado): se propone sumar o restar los días de diferencia a la tarifa. Corrígelo si el precio es otro.'}
        </p>
      </div>

      {firmada && (
        <p data-testid="editor-fechas-firmada" role="alert" className="rounded-md border border-amber-200 bg-amber-50 px-2 py-1 text-[11px] font-semibold text-amber-800">
          El cliente ya firmó el contrato con las fechas anteriores. Al guardar, ábrelo, anula la firma y vuelve a firmar con las nuevas.
        </p>
      )}
      {error && <p role="alert" data-testid="error-editor-fechas" className="text-[11px] font-semibold text-rose-600">{error}</p>}

      <div className="flex items-center justify-between gap-2 border-t border-slate-100 pt-2 text-xs">
        <span data-testid="editor-fechas-total" className="font-bold">
          {importe == null ? `Total: ${fmt2(totalActual)} €` : p.modo === 'fijo' ? `Precio cerrado: ${fmt2(importe)} €` : `Total: ${fmt2(importe)} €`}
          {p.modo === 'total' && importe != null && Math.abs(importe - totalActual) >= 0.005 && (
            <span className="ml-1 font-semibold text-slate-500">({importe > totalActual ? '+' : '−'}{fmt2(Math.abs(importe - totalActual))} €)</span>
          )}
        </span>
        <span className="flex gap-2 text-[11px] font-bold">
          <button type="button" onClick={onCancelar} className="cursor-pointer rounded-lg border border-slate-200 px-3 py-1.5 text-slate-500 hover:bg-slate-50">Cancelar</button>
          <button type="button" onClick={onGuardar} className="cursor-pointer rounded-lg bg-blue-600 px-3 py-1.5 text-white hover:bg-blue-700">Guardar fechas</button>
        </span>
      </div>
    </div>
  );
}
