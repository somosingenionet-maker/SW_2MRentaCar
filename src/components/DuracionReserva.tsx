import type { Reserva } from '../types';
import { diasAlquiler, duracionExacta } from '../utils/solicitudes';
import { nombreComplemento } from '../utils/complementos';
import { desgloseReserva, hayAjusteImportante, type LineaDesglose } from '../utils/desgloseReserva';

type Fechas = Pick<Reserva, 'fechaInicio' | 'fechaFin' | 'horaInicio' | 'horaFin'>;
type ReservaEconomica = Fechas & Pick<Reserva, 'tarifaDiaria' | 'seguroDia' | 'incluyeSeguroTodoRiesgo' | 'totalCobrado' | 'fianza' | 'extras' | 'descuento' | 'cupon'>;

const dias = (n: number) => `${n} ${n === 1 ? 'día' : 'días'}`;
const euros = (n: number) => `${n < 0 ? '−' : ''}${Math.abs(n).toFixed(2)} €`;

/** Fila destacada de la ficha: cuántos días dura el alquiler y, si las horas añaden una fracción, de dónde sale ese número. */
export function FilaDuracion({ reserva }: { reserva: Fechas }) {
  const n = diasAlquiler(reserva.fechaInicio, reserva.fechaFin, reserva.horaInicio, reserva.horaFin);
  const exacto = duracionExacta(reserva.fechaInicio, reserva.fechaFin, reserva.horaInicio, reserva.horaFin);
  return (
    <div data-testid="duracion-reserva" className="border-t border-slate-100/50 pt-1.5">
      <div className="flex justify-between items-center gap-2 text-xs font-extrabold text-slate-800">
        <span>Duración del alquiler:</span>
        <span>{dias(n)}</span>
      </div>
      {exacto && <p className="text-[10px] text-slate-400 text-right mt-0.5">{exacto} exactos · cada fracción de 24 h cuenta como un día más</p>}
    </div>
  );
}

/** Texto de una línea del desglose para la ficha (en español): concepto, y entre paréntesis cómo se calcula. */
function textoLinea(l: LineaDesglose): { concepto: string; importe: string; tono?: 'descuento' | 'aviso' } {
  switch (l.tipo) {
    case 'alquiler': return { concepto: `Alquiler (${dias(l.dias)} × ${euros(l.precio)})`, importe: euros(l.importe) };
    case 'seguro': return { concepto: `Seguro todo riesgo (${dias(l.dias)} × ${euros(l.precio)})`, importe: euros(l.importe) };
    case 'seguro-incluido': return { concepto: 'Seguro todo riesgo', importe: 'Incluido' };
    case 'terceros': return { concepto: 'Seguro: póliza de terceros básica', importe: 'Incluida' };
    case 'extra': {
      const cuenta = l.precio != null && l.porDia != null ? ` (${euros(l.precio)}${l.porDia ? ' / día' : ', precio fijo'})` : '';
      return { concepto: `${nombreComplemento(l.nombre)}${l.cantidad > 1 ? ` × ${l.cantidad}` : ''}${cuenta}`, importe: euros(l.importe) };
    }
    case 'descuento': return { concepto: `Descuento${l.cupon ? ` (cupón ${l.cupon})` : ''}`, importe: euros(l.importe), tono: 'descuento' };
    case 'ajuste': return { concepto: Math.abs(l.importe) > 0.05 ? 'Otros ajustes' : 'Redondeo', importe: euros(l.importe), tono: 'aviso' };
  }
}

/**
 * Desglose económico de la ficha: cada concepto a su precio y el descuento aparte, de modo que lo que se ve
 * suma exactamente el total. La fianza no va aquí: es un depósito aparte y no forma parte del total.
 */
export function DesgloseFicha({ reserva }: { reserva: ReservaEconomica }) {
  const n = diasAlquiler(reserva.fechaInicio, reserva.fechaFin, reserva.horaInicio, reserva.horaFin);
  const { lineas, total } = desgloseReserva(reserva, n);
  return (
    <div data-testid="desglose-reserva" className="space-y-1">
      {lineas.map((l, i) => {
        const t = textoLinea(l);
        return (
          <div key={i} data-testid="linea-desglose" className="flex justify-between items-baseline gap-3 text-xs font-semibold">
            <span className="min-w-0">{t.concepto}</span>
            <span className={`shrink-0 font-mono ${t.tono === 'descuento' ? 'text-emerald-700' : t.tono === 'aviso' ? 'text-amber-700' : ''}`}>{t.importe}</span>
          </div>
        );
      })}
      <div data-testid="total-reserva" className="flex justify-between border-t border-blue-200 pt-1.5 text-sm font-extrabold text-blue-900">
        <span>LIQUIDACIÓN TOTAL</span>
        <span className="font-mono">{euros(total)}</span>
      </div>
      {hayAjusteImportante(lineas) && (
        <p role="alert" data-testid="total-no-cuadra" className="text-[11px] font-bold text-amber-700 bg-amber-50 border border-amber-200 rounded-md px-2 py-1">
          Ojo: los conceptos no suman el total guardado. Revisa el importe de esta reserva.
        </p>
      )}
    </div>
  );
}
