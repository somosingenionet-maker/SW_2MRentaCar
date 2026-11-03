import SearchableSelect from './SearchableSelect';

interface Props {
  opciones: { value: string; label: string; sublabel?: string }[];
  /** Coche elegido ('' = ninguno todavía). */
  valor: string;
  /** Qué se mantiene o conviene revisar al pasar a ese coche. */
  avisos: string[];
  error: string;
  /** El contrato ya está firmado con el coche anterior. */
  firmada: boolean;
  onCambiar: (vehiculoId: string) => void;
  onGuardar: () => void;
  onCancelar: () => void;
}

/** Cambio del coche de una reserva ya creada (avería u otro imprevisto antes de la entrega). */
export function CambioVehiculo({ opciones, valor, avisos, error, firmada, onCambiar, onGuardar, onCancelar }: Props) {
  return (
    <div data-testid="cambio-vehiculo" className="space-y-2 rounded-lg border border-blue-200 bg-white p-2.5 text-slate-800">
      <label className="block text-[10px] font-bold uppercase text-slate-500">Nuevo vehículo</label>
      <SearchableSelect options={opciones} value={valor} onChange={onCambiar} placeholder="Buscar vehículo..." emptyMessage="No hay otros vehículos de alquiler" />
      {avisos.map(a => (
        <p key={a} data-testid="aviso-cambio-vehiculo" className="rounded-md border border-amber-200 bg-amber-50 px-2 py-1 text-[11px] font-semibold text-amber-800">{a}</p>
      ))}
      {firmada && (
        <p data-testid="cambio-vehiculo-firmada" role="alert" className="rounded-md border border-amber-200 bg-amber-50 px-2 py-1 text-[11px] font-semibold text-amber-800">
          El cliente ya firmó el contrato con el coche anterior. Si lo cambias, anula la firma y vuelve a firmar.
        </p>
      )}
      {error && <p role="alert" data-testid="error-cambio-vehiculo" className="text-[11px] font-semibold text-rose-600">{error}</p>}
      <div className="flex justify-end gap-2 text-[11px] font-bold">
        <button type="button" onClick={onCancelar} className="cursor-pointer rounded-lg border border-slate-200 px-3 py-1.5 text-slate-500 hover:bg-slate-50">Cancelar</button>
        <button type="button" onClick={onGuardar} disabled={!valor} className="cursor-pointer rounded-lg bg-blue-600 px-3 py-1.5 text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50">Cambiar vehículo</button>
      </div>
    </div>
  );
}
