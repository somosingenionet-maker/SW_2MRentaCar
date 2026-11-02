import type { Reserva } from '../types';
import { diasAlquiler, duracionExacta } from '../utils/solicitudes';
import { totalDeReserva } from '../utils/condicionesAlquiler';
import { nombreComplemento, totalExtras } from '../utils/complementos';

type Fechas = Pick<Reserva, 'fechaInicio' | 'fechaFin' | 'horaInicio' | 'horaFin'>;

const dias = (n: number) => `${n} ${n === 1 ? 'día' : 'días'}`;
const euros = (n: number) => `${n.toFixed(2)} €`;

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

/** Complementos que lleva la reserva (sillitas, baca...), con lo que se cobra por cada uno. Sin complementos no sale nada. */
export function FilaComplementos({ extras }: { extras?: Reserva['extras'] }) {
  if (!extras || extras.length === 0) return null;
  return (
    <div data-testid="complementos-reserva" className="space-y-0.5 pt-1">
      <p className="text-[10px] font-bold uppercase tracking-wider text-blue-700/70">Complementos</p>
      {extras.map((e, i) => (
        <div key={i} className="flex justify-between gap-2 text-xs font-semibold">
          <span className="min-w-0">
            {nombreComplemento(e.nombre)}{e.cantidad > 1 ? ` × ${e.cantidad}` : ''}
            {e.precio != null && e.porDia != null && <span className="text-[10px] font-medium text-blue-700/60"> ({e.precio.toFixed(2)} €{e.porDia ? ' / día' : ' fijo'})</span>}
          </span>
          <span className="shrink-0">{euros(e.total)}</span>
        </div>
      ))}
    </div>
  );
}

/**
 * Cómo sale el total: días facturados y, en reservas manuales, días × tarifa. Si el total guardado no cuadra
 * con esa cuenta lo avisa, para que un error como contar un día de menos no pase desapercibido.
 */
export function FilaCalculo({ reserva }: { reserva: Fechas & Pick<Reserva, 'tarifaDiaria' | 'seguroDia' | 'incluyeSeguroTodoRiesgo' | 'totalCobrado' | 'origen' | 'extras'> }) {
  const n = diasAlquiler(reserva.fechaInicio, reserva.fechaFin, reserva.horaInicio, reserva.horaFin);
  const conSeguro = reserva.incluyeSeguroTodoRiesgo && reserva.seguroDia != null;
  const precioDia = reserva.tarifaDiaria + (conSeguro ? reserva.seguroDia! : 0);
  const esperado = totalDeReserva(reserva, n);
  const importeExtras = totalExtras(reserva.extras, n);
  // Las de la web llevan el precio de la web (extras, descuentos); y con seguro sin precio guardado no se puede comprobar.
  const comprobable = reserva.origen !== 'web' && (!reserva.incluyeSeguroTodoRiesgo || reserva.seguroDia != null);
  const cuadra = Math.round(esperado * 100) === Math.round(reserva.totalCobrado * 100);

  return (
    <div data-testid="calculo-reserva" className="space-y-0.5">
      <div className="flex justify-between text-xs font-semibold">
        <span>Días facturados:</span>
        <span>{dias(n)}</span>
      </div>
      {comprobable && cuadra && (
        <p className="text-[10px] text-blue-700/70 text-right">
          {n} × {euros(precioDia)}{importeExtras > 0 ? ` + complementos ${euros(importeExtras)}` : ''} = {euros(esperado)}
        </p>
      )}
      {comprobable && !cuadra && (
        <p role="alert" data-testid="total-no-cuadra" className="text-[11px] font-bold text-amber-700 bg-amber-50 border border-amber-200 rounded-md px-2 py-1">
          Ojo: con {dias(n)} × {euros(precioDia)}{importeExtras > 0 ? ` + complementos ${euros(importeExtras)}` : ''} el total sería {euros(esperado)}, y aquí figura {euros(reserva.totalCobrado)}.
        </p>
      )}
    </div>
  );
}
