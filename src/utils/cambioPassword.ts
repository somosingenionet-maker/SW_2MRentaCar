/** Longitud mínima de contraseña: la misma que exige el panel de administración y el servidor. */
export const PASSWORD_MIN = 8;

/** Valida el formulario de cambio de contraseña. Devuelve el mensaje de error o null si es válido. */
export function validarCambioPassword(f: { actual: string; nueva: string; repetir: string }): string | null {
  if (!f.actual) return 'Escribe tu contraseña actual.';
  if (f.nueva.length < PASSWORD_MIN) return `La nueva contraseña debe tener al menos ${PASSWORD_MIN} caracteres.`;
  if (f.nueva === f.actual) return 'La nueva contraseña debe ser distinta de la actual.';
  if (f.nueva !== f.repetir) return 'Las contraseñas nuevas no coinciden.';
  return null;
}
