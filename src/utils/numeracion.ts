/**
 * Siguiente número libre de una serie ("FAC-0003", "OT-2026-012"): el mayor
 * existente + 1. No se usa "cantidad + 1" porque al borrar un registro se
 * repetiría un número ya emitido (en facturas es un problema legal).
 * `prefijo` incluye el guion final: "FAC-" o "OT-2026-".
 */
export function siguienteNumero(existentes: string[], prefijo: string, digitos: number): string {
  let max = 0;
  for (const n of existentes) {
    if (!n.startsWith(prefijo)) continue;
    const valor = parseInt(n.slice(prefijo.length), 10);
    if (!isNaN(valor) && valor > max) max = valor;
  }
  return prefijo + String(max + 1).padStart(digitos, '0');
}
