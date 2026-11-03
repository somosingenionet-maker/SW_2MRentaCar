import { hoyISO } from './fechas';

export interface DatosTarjeta {
  tarjetaNumero?: string;
  tarjetaCaducidad?: string;
}

/** Solo dígitos, como máximo 19 (el largo máximo de una tarjeta). */
export const normalizarNumero = (texto: string): string => texto.replace(/\D/g, '').slice(0, 19);

/** «4111111111111111» → «4111 1111 1111 1111» (para escribirlo y leerlo; se guarda sin espacios). */
export const formatearNumero = (digitos: string): string => (digitos.match(/.{1,4}/g) ?? []).join(' ');

/** Número oculto salvo los 4 últimos dígitos, con los mismos grupos: «•••• •••• •••• 1111». */
export function enmascararNumero(digitos: string): string {
  const d = digitos.replace(/\D/g, '');
  if (d.length <= 4) return d;
  let vistos = 0;
  return formatearNumero(d).split('').reverse().map(c => (/\d/.test(c) && ++vistos > 4 ? '•' : c)).reverse().join('');
}

/** Comprobación de Luhn: detecta casi cualquier error al teclear el número. */
export function luhnValido(digitos: string): boolean {
  let suma = 0;
  let doble = false;
  for (let i = digitos.length - 1; i >= 0; i--) {
    let n = digitos.charCodeAt(i) - 48;
    if (doble) { n *= 2; if (n > 9) n -= 9; }
    suma += n;
    doble = !doble;
  }
  return digitos.length > 0 && suma % 10 === 0;
}

/** «0828», «8/28» o «08/2028» → «08/28» mientras se escribe (solo dígitos, barra tras el mes). */
export function normalizarCaducidad(texto: string): string {
  const d = texto.replace(/\D/g, '').slice(0, 4);
  return d.length > 2 ? `${d.slice(0, 2)}/${d.slice(2)}` : d;
}

/** Valida lo que se guarda de la tarjeta. Devuelve el mensaje de error o null si todo es correcto. */
export function validarTarjeta(d: DatosTarjeta): string | null {
  const n = d.tarjetaNumero ?? '';
  if (n && (!/^\d{13,19}$/.test(n) || !luhnValido(n))) return 'El número de la tarjeta no es válido: revisa los dígitos.';
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
