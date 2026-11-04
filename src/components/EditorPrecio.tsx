import { InputPrecio } from './InputPrecio';
import { fmt2 } from '../utils/moneda';
import type { ModoPrecio } from '../utils/precioAlquiler';

interface Props {
  modo: ModoPrecio;
  valor: string;
  /** Total que quedaría con el precio escrito (null si todavía no es válido). */
  totalNuevo: number | null;
  totalActual: number;
  dias: number;
  error: string;
  /** El contrato ya está firmado con el precio anterior. */
  firmada: boolean;
  onModo: (modo: ModoPrecio) => void;
  onValor: (valor: string) => void;
  onGuardar: () => void;
  onCancelar: () => void;
}

/** Cambio del precio del alquiler de una reserva ya creada: precio cerrado o tarifa por día. */
export function EditorPrecio({ modo, valor, totalNuevo, totalActual, dias, error, firmada, onModo, onValor, onGuardar, onCancelar }: Props) {
  const opcion = (m: ModoPrecio, texto: string) => (
    <label className={`flex flex-1 cursor-pointer items-center gap-1.5 rounded-lg border px-2 py-1.5 text-[11px] font-bold ${modo === m ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-slate-200 text-slate-500'}`}>
      <input type="radio" name="modo-precio" checked={modo === m} onChange={() => onModo(m)} className="accent-blue-600" />
      {texto}
    </label>
  );
  return (
    <div data-testid="editor-precio" className="space-y-2 rounded-lg border border-blue-200 bg-white p-2.5 text-slate-800">
      <div className="flex gap-2">{opcion('fijo', 'Precio cerrado')}{opcion('dia', 'Tarifa por día')}</div>
      <div className="relative">
        <span className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-xs font-semibold text-slate-400">{modo === 'fijo' ? '€' : '€/día'}</span>
        <InputPrecio aria-label={modo === 'fijo' ? 'Precio cerrado del alquiler' : 'Tarifa por día'} value={valor} onChange={e => onValor(e.target.value)}
          className="h-[34px] w-full rounded-lg border border-slate-200 bg-white pl-12 pr-3 font-mono text-sm focus:outline-none focus:ring-1 focus:ring-blue-500" />
      </div>
      <p className="text-[10px] text-slate-500">
        {modo === 'fijo'
          ? `Precio total pactado del alquiler (${dias} ${dias === 1 ? 'día' : 'días'}). El seguro y los complementos se suman aparte. Si cambian las horas o los días, este precio no cambia.`
          : 'El alquiler se calcula como días × tarifa.'}
      </p>
      {firmada && (
        <p data-testid="editor-precio-firmada" role="alert" className="rounded-md border border-amber-200 bg-amber-50 px-2 py-1 text-[11px] font-semibold text-amber-800">
          El cliente ya firmó el contrato con el precio anterior. Si lo cambias, anula la firma y vuelve a firmar.
        </p>
      )}
      {error && <p role="alert" data-testid="error-editor-precio" className="text-[11px] font-semibold text-rose-600">{error}</p>}
      <div className="flex items-center justify-between gap-2 border-t border-slate-100 pt-2 text-xs">
        <span data-testid="editor-precio-total" className="font-bold">
          {totalNuevo == null ? `Total: ${fmt2(totalActual)} €` : `Total: ${fmt2(totalNuevo)} €`}
          {totalNuevo != null && Math.abs(totalNuevo - totalActual) >= 0.005 && (
            <span className="ml-1 font-semibold text-slate-500">({totalNuevo > totalActual ? '+' : '−'}{fmt2(Math.abs(totalNuevo - totalActual))} €)</span>
          )}
        </span>
        <span className="flex gap-2 text-[11px] font-bold">
          <button type="button" onClick={onCancelar} className="cursor-pointer rounded-lg border border-slate-200 px-3 py-1.5 text-slate-500 hover:bg-slate-50">Cancelar</button>
          <button type="button" onClick={onGuardar} className="cursor-pointer rounded-lg bg-blue-600 px-3 py-1.5 text-white hover:bg-blue-700">Guardar precio</button>
        </span>
      </div>
    </div>
  );
}
