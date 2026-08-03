/**
 * Genera un identificador único con prefijo.
 *
 * Combina la marca de tiempo con un sufijo aleatorio para evitar colisiones
 * cuando se crean varios elementos dentro del mismo milisegundo (cosa que
 * `Date.now()` a secas no garantiza).
 */
export function genId(prefix: string): string {
  const rand = Math.random().toString(36).slice(2, 8);
  return `${prefix}-${Date.now().toString(36)}${rand}`;
}
