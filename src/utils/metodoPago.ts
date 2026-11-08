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
