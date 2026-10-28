// Contador de la sesión: dos llamadas nunca devuelven el mismo número, aunque caigan en el mismo milisegundo.
let contador = 0;

/**
 * Genera un identificador único con prefijo.
 *
 * Combina la marca de tiempo, un contador de la sesión y un sufijo aleatorio. El contador
 * garantiza que no se repita ni siquiera creando miles de ids dentro del mismo milisegundo
 * (con solo la parte aleatoria habría una pequeña probabilidad de colisión). El sufijo
 * aleatorio, de longitud fija, sigue siendo el final del id (el contrato se identifica
 * por sus 6 últimos caracteres) y evita choques entre pestañas o usuarios distintos.
 */
export function genId(prefix: string): string {
  contador += 1;
  const rand = Math.random().toString(36).slice(2, 8).padEnd(6, '0');
  return `${prefix}-${Date.now().toString(36)}${contador.toString(36)}${rand}`;
}
