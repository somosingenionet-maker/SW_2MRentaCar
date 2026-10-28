/** Horas del reloj de 24 h: «00» a «23». */
export const HORAS_24 = Array.from({ length: 24 }, (_, i) => String(i).padStart(2, '0'));

/** Minutos de 5 en 5: «00», «05»… «55». */
const MINUTOS_PASO_5 = Array.from({ length: 12 }, (_, i) => String(i * 5).padStart(2, '0'));

/** Separa «HH:mm» en hora y minutos. Un valor vacío o mal formado da dos cadenas vacías. */
export function partesHora(valor: string): { h: string; m: string } {
  const r = /^([01]\d|2[0-3]):([0-5]\d)$/.exec(valor || '');
  return r ? { h: r[1], m: r[2] } : { h: '', m: '' };
}

/** Une hora y minutos en «HH:mm». Sin hora no hay valor; sin minutos se toma «00». */
export function unirHora(h: string, m: string): string {
  return h ? `${h}:${m || '00'}` : '';
}

/** Minutos que se ofrecen: de 5 en 5, más el minuto actual si no es múltiplo de 5 (p. ej. 23:11 de un pedido web). */
export function opcionesMinutos(actual: string): string[] {
  return actual && !MINUTOS_PASO_5.includes(actual) ? [...MINUTOS_PASO_5, actual].sort() : MINUTOS_PASO_5;
}
