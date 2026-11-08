import type { MetodoPago } from '../types';

export const METODOS_PAGO: { id: MetodoPago; etiqueta: string }[] = [
  { id: 'efectivo', etiqueta: 'Efectivo' },
  { id: 'tarjeta', etiqueta: 'Tarjeta' },
  { id: 'transferencia', etiqueta: 'Transferencia' },
];

/** Nombre del método de pago; vacío si no se indicó (o si el valor guardado no es uno de los tres). */
export const etiquetaMetodoPago = (m: string | null | undefined): string => METODOS_PAGO.find(x => x.id === m)?.etiqueta ?? '';

/** Lo que llega de la base de datos o de un formulario → un método válido o null. */
export const metodoPagoValido = (m: string | null | undefined): MetodoPago | null => METODOS_PAGO.find(x => x.id === m)?.id ?? null;

/** Colores de la etiqueta de cada método en el listado de reservas. */
export const ESTILO_METODO_PAGO: Record<MetodoPago, string> = {
  efectivo: 'bg-emerald-50 text-emerald-700 border border-emerald-100',
  tarjeta: 'bg-blue-50 text-blue-700 border border-blue-100',
  transferencia: 'bg-violet-50 text-violet-700 border border-violet-100',
};
