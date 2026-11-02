/**
 * Importe en euros para pantallas de resumen: siempre con dos decimales ("121,00 €", "121,50 €"), igual que el resto
 * de la aplicación. Se redondea a céntimos antes de formatear, para que un 120,9999999 de coma flotante salga como
 * "121,00 €" y no "120,9999999".
 */
export function formatEuros(n: number): string {
  const centimos = Math.round(n * 100) / 100;
  return centimos.toLocaleString('es-ES', { style: 'currency', currency: 'EUR', minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

/**
 * Número con exactamente dos decimales y coma decimal ("45,75"): el formato de todos los importes de la aplicación.
 * Se le añade el símbolo donde haga falta ("45,75 €"). El contrato en inglés lo pide con punto ("45.75") y usa su
 * propio idioma en `locale`.
 */
export function fmt2(n: number, locale = 'es-ES'): string {
  return (Math.round(n * 100) / 100).toLocaleString(locale, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}
