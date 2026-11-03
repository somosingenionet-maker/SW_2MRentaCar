import { hoyISO } from './fechas';

export interface DatosTarjeta {
  tarjetaTitular?: string;
  tarjetaMarca?: string;
  tarjetaUltimos4?: string;
  tarjetaCaducidad?: string;
}

export const MARCAS_TARJETA = ['Visa', 'Mastercard', 'American Express', 'Otra'] as const;

/** Solo dígitos y, si se pega un número largo, se quedan los 4 últimos: el número completo nunca llega a guardarse. */
export const normalizarUltimos4 = (texto: string): string => texto.replace(/\D/g, '').slice(-4);

/** «0828», «8/28» o «08/2028» → «08/28» mientras se escribe (solo dígitos, barra tras el mes). */
export function normalizarCaducidad(texto: string): string {
  const d = texto.replace(/\D/g, '').slice(0, 4);
  return d.length > 2 ? `${d.slice(0, 2)}/${d.slice(2)}` : d;
}

/** Valida lo que se guarda de la tarjeta. Devuelve el mensaje de error o null si todo es correcto. */
export function validarTarjeta(d: DatosTarjeta): string | null {
  const u = d.tarjetaUltimos4 ?? '';
  if (u && !/^\d{4}$/.test(u)) return 'De la tarjeta se guardan solo los 4 últimos dígitos.';
  const c = d.tarjetaCaducidad ?? '';
  if (c) {
    const m = /^(\d{2})\/(\d{2})$/.exec(c);
    if (!m || Number(m[1]) < 1 || Number(m[1]) > 12) return 'La caducidad de la tarjeta se escribe MM/AA (por ejemplo 08/28).';
  }
  return null;
}

export type EstadoTarjeta = 'sin_dato' | 'caducada' | 'caduca_pronto' | 'vigente';

/** La tarjeta vale hasta el último día del mes de caducidad. «Caduca pronto» = este mes o el siguiente. */
export function estadoTarjeta(caducidad: string | undefined, hoy: string = hoyISO()): EstadoTarjeta {
  const m = caducidad ? /^(\d{2})\/(\d{2})$/.exec(caducidad) : null;
  if (!m) return 'sin_dato';
  const mesCaduca = (2000 + Number(m[2])) * 12 + Number(m[1]);
  const [a, mes] = hoy.split('-').map(Number);
  const mesHoy = a * 12 + mes;
  if (mesCaduca < mesHoy) return 'caducada';
  return mesCaduca <= mesHoy + 1 ? 'caduca_pronto' : 'vigente';
}

/** «Visa •••• 4242 · caduca 08/28 · Ana Pérez» (solo lo que haya). */
export function resumenTarjeta(d: DatosTarjeta): string {
  return [
    [d.tarjetaMarca, d.tarjetaUltimos4 ? `•••• ${d.tarjetaUltimos4}` : ''].filter(Boolean).join(' '),
    d.tarjetaCaducidad ? `caduca ${d.tarjetaCaducidad}` : '',
    d.tarjetaTitular?.trim() || '',
  ].filter(Boolean).join(' · ');
}
