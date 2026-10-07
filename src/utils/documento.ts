export type TipoDocumento = 'dni' | 'nie' | 'pasaporte';

const LETRAS_DNI = 'TRWAGMYFPDXBNJZSQVHLCKE';

/** Mayúsculas y sin espacios, puntos ni guiones: "12.345.678-z" → "12345678Z". */
export const normalizarDocumento = (doc: string): string =>
  doc.trim().toUpperCase().replace(/[\s.-]+/g, '');

/**
 * DNI: 8 cifras + letra de control. NIE: X/Y/Z + 7 cifras + letra de control.
 * Pasaporte u otro documento extranjero: 5-20 letras o cifras.
 * Debe coincidir con la validación de la función `registro-cliente`.
 */
export function documentoValido(tipo: TipoDocumento, doc: string): boolean {
  if (tipo === 'dni') {
    if (!/^\d{8}[A-Z]$/.test(doc)) return false;
    return LETRAS_DNI[parseInt(doc.slice(0, 8), 10) % 23] === doc[8];
  }
  if (tipo === 'nie') {
    if (!/^[XYZ]\d{7}[A-Z]$/.test(doc)) return false;
    return LETRAS_DNI[parseInt('XYZ'.indexOf(doc[0]) + doc.slice(1, 8), 10) % 23] === doc[8];
  }
  return /^[A-Z0-9]{5,20}$/.test(doc);
}
