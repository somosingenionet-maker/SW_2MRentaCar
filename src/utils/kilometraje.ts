/** Kilometraje que debe quedar en la ficha tras un ingreso: nunca baja, solo sube. */
export const kilometrajeTrasIngreso = (actual: number, entrada: number): number => Math.max(actual, entrada);

/**
 * Aviso (no bloqueante) si el kilometraje introducido es menor que el registrado en la ficha:
 * suele ser un despiste al teclear. La ficha mantiene el mayor.
 */
export function avisoKilometraje(actual: number | undefined, introducido: number | ''): string | null {
  if (actual == null || introducido === '' || Number.isNaN(Number(introducido))) return null;
  if (Number(introducido) >= actual) return null;
  return `El vehículo tiene ${actual.toLocaleString('es-ES')} km registrados y este valor es menor. Revisa que no sea un error: la ficha conservará el kilometraje mayor.`;
}
