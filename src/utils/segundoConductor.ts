import type { SegundoConductor } from '../types';

export interface DatosSegundoConductor {
  segundoConductor?: SegundoConductor | null;
}

export const SEGUNDO_CONDUCTOR_VACIO: SegundoConductor = { nombre: '', dni: '', permiso: '' };

/** ¿El cliente tiene un segundo conductor (casilla marcada)? */
export const tieneSegundoConductor = (d: DatosSegundoConductor): boolean => d.segundoConductor != null;

/** Si hay segundo conductor, hacen falta los tres datos. Devuelve el mensaje de error o null si todo es correcto. */
export function validarSegundoConductor(d: DatosSegundoConductor): string | null {
  const c = d.segundoConductor;
  if (!c) return null;
  if (!c.nombre.trim() || !c.dni.trim() || !c.permiso.trim()) {
    return 'Para añadir un segundo conductor indica su nombre, su documento (DNI/NIE/pasaporte) y el número de su permiso de conducir, o desmarca la casilla.';
  }
  return null;
}

/** El segundo conductor tal como se guarda: sin espacios sobrantes y con documento y permiso en mayúsculas; null si no hay. */
export function segundoConductorParaGuardar(d: DatosSegundoConductor): SegundoConductor | null {
  const c = d.segundoConductor;
  if (!c) return null;
  return { nombre: c.nombre.trim(), dni: c.dni.trim().toUpperCase(), permiso: c.permiso.trim().toUpperCase() };
}
