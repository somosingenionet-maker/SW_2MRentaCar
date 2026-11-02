/**
 * Importe en euros para pantallas de resumen: siempre con dos decimales ("121,00 €", "121,50 €"), igual que el resto
 * de la aplicación. Se redondea a céntimos antes de formatear, para que un 120,9999999 de coma flotante salga como
 * "121,00 €" y no "120,9999999".
 */
export function formatEuros(n: number): string {
  const centimos = Math.round(n * 100) / 100;
  return centimos.toLocaleString('es-ES', { style: 'currency', currency: 'EUR', minimumFractionDigits: 2, maximumFractionDigits: 2 });
}
