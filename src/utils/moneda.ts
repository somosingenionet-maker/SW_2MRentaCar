/**
 * Importe en euros para pantallas de resumen: sin decimales si es una cifra
 * exacta ("121 €") y con dos si tiene céntimos ("121,50 €"). Se redondea a
 * céntimos antes de decidir, para que un 120,9999999 de coma flotante cuente
 * como 121 y no enseñe "121,00 €".
 */
export function formatEuros(n: number): string {
  const centimos = Math.round(n * 100) / 100;
  const exacto = Number.isInteger(centimos);
  return centimos.toLocaleString('es-ES', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: exacto ? 0 : 2,
    maximumFractionDigits: 2,
  });
}
