import type { Cliente, Reserva, SolicitudReserva, Vehiculo } from '../types';
import { diaCorto, movimientoDelDia, numeroDia, ordenarDelDia, type MovimientoDelDia } from '../utils/calendarioVistas';

interface Props {
  vista: 'semana' | 'dia';
  dias: string[];
  hoy: string;
  reservasDelDia: (iso: string) => Reserva[];
  webPasadasDelDia: (iso: string) => SolicitudReserva[];
  clientes: Cliente[];
  vehiculos: Vehiculo[];
  colorDe: (vehiculoId: string) => string;
  onSeleccionar: (r: Reserva) => void;
  onWeb: (iso: string, pedidos: SolicitudReserva[]) => void;
}

const ETIQUETA: Record<MovimientoDelDia, string> = {
  entrega: 'Entrega', devolucion: 'Devolución', entrega_y_devolucion: 'Entrega y devolución', en_curso: 'En curso',
};

const horaDe = (r: Reserva, m: MovimientoDelDia): string => {
  if (m === 'entrega') return r.horaInicio ?? '';
  if (m === 'devolucion') return r.horaFin ?? '';
  if (m === 'entrega_y_devolucion') return [r.horaInicio, r.horaFin].filter(Boolean).join(' → ');
  return '';
};

/** Calendario de una semana (siete columnas) o de un día (lista): todas las reservas, sin recortar con «+N más». */
export function VistaSemanaDia({ vista, dias, hoy, reservasDelDia, webPasadasDelDia, clientes, vehiculos, colorDe, onSeleccionar, onWeb }: Props) {
  const nombreCliente = (id: string) => { const c = clientes.find(x => x.id === id); return c ? `${c.nombre} ${c.apellidos}`.trim() : 'Cliente'; };
  const grande = vista === 'dia';

  return (
    <div data-testid={`vista-${vista}`} className={grande ? 'divide-y divide-slate-100' : 'grid grid-cols-1 sm:grid-cols-7'}>
      {dias.map(iso => {
        const reservas = ordenarDelDia(reservasDelDia(iso), iso);
        const web = webPasadasDelDia(iso);
        const esHoy = iso === hoy;
        const pasado = iso < hoy;
        return (
          <div key={iso} data-testid="dia-calendario" data-fecha={iso}
            className={`min-w-0 p-2 ${grande ? 'min-h-[120px]' : 'min-h-[140px] border-b border-r border-slate-100'} ${pasado ? 'bg-slate-50/60' : 'bg-white'}`}>
            {!grande && (
              <div className="mb-1.5 flex items-center gap-1.5">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">{diaCorto(iso)}</span>
                <span className={`flex h-5 w-5 items-center justify-center rounded-full text-[11px] font-bold ${esHoy ? 'bg-blue-600 text-white' : pasado ? 'text-slate-300' : 'text-slate-600'}`}>{numeroDia(iso)}</span>
              </div>
            )}
            <div className="space-y-1">
              {reservas.map(r => {
                const veh = vehiculos.find(v => v.id === r.vehiculoId);
                const m = movimientoDelDia(r, iso);
                const hora = horaDe(r, m);
                return (
                  <button key={r.id} type="button" data-testid="reserva-calendario" data-movimiento={m} onClick={() => onSeleccionar(r)}
                    title={`${veh ? `${veh.marca} ${veh.modelo} (${veh.matricula})` : 'Vehículo'} · ${nombreCliente(r.clienteId)}`}
                    className={`block w-full cursor-pointer rounded border text-left transition hover:opacity-80 ${grande ? 'px-3 py-2 text-xs' : 'px-1.5 py-1 text-[10px]'} ${colorDe(r.vehiculoId)}`}>
                    <span className={grande ? 'flex items-center justify-between gap-1' : 'block'}>
                      <span className={`font-mono font-bold ${grande ? 'truncate' : 'block truncate'}`}>{veh?.matricula ?? '···'}</span>
                      <span className={`font-semibold ${grande ? 'shrink-0' : 'block leading-tight'}`}>{m === 'en_curso' ? 'En curso' : `${ETIQUETA[m]}${hora ? ` ${hora}` : ''}`}</span>
                    </span>
                    <span className="block truncate font-semibold">{nombreCliente(r.clienteId)}</span>
                    {grande && veh && <span className="block truncate opacity-80">{veh.marca} {veh.modelo}</span>}
                  </button>
                );
              })}
              {web.length > 0 && (
                <button type="button" data-testid="web-pasada" onClick={() => onWeb(iso, web)}
                  className="block w-full cursor-pointer truncate rounded border border-slate-200 bg-slate-100 px-1.5 py-0.5 text-left text-[9px] font-semibold text-slate-500 transition hover:bg-slate-200">
                  Web · {web.length === 1 ? (web[0].clienteNombre || 'pedido') : `${web.length} pedidos`}
                </button>
              )}
              {reservas.length === 0 && web.length === 0 && grande && <p className="text-xs text-slate-400">Sin reservas este día.</p>}
            </div>
          </div>
        );
      })}
    </div>
  );
}
