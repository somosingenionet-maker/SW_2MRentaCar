import type { TarifasAlquiler, Reserva } from '../types';

export type ClaveTarifa = keyof TarifasAlquiler;

/**
 * Tarifas del vehículo tras cambiar una. Las tres de temporada siempre existen (vacío = 0). El precio personalizado
 * (convenios con clientes) es opcional: si se vacía o es 0 desaparece, no se guarda un 0 que parecería un convenio.
 */
export function cambiarTarifa(actuales: TarifasAlquiler | undefined, clave: ClaveTarifa, valor: string): TarifasAlquiler {
  const num = valor.trim() === '' ? 0 : Number(valor);
  const siguiente: TarifasAlquiler = {
    temporadaAlta: actuales?.temporadaAlta ?? 0,
    temporadaMedia: actuales?.temporadaMedia ?? 0,
    temporadaBaja: actuales?.temporadaBaja ?? 0,
    ...(actuales?.precioPersonalizado ? { precioPersonalizado: actuales.precioPersonalizado } : {}),
  };
  if (clave === 'precioPersonalizado') {
    if (Number.isFinite(num) && num > 0) siguiente.precioPersonalizado = num;
    else delete siguiente.precioPersonalizado;
  } else {
    siguiente[clave] = Number.isFinite(num) ? num : 0;
  }
  return siguiente;
}

/** Precio por día pactado del vehículo, si lo tiene. */
export const precioConvenio = (t: TarifasAlquiler | undefined): number | null =>
  t?.precioPersonalizado != null && t.precioPersonalizado > 0 ? t.precioPersonalizado : null;

/** Precio por día del vehículo para una temporada, o para el convenio. null si no lo tiene. */
export function tarifaDeTemporada(t: TarifasAlquiler | undefined, temporada: Reserva['temporada']): number | null {
  if (temporada === 'convenio') return precioConvenio(t);
  const precio = t?.[temporada === 'alta' ? 'temporadaAlta' : temporada === 'media' ? 'temporadaMedia' : 'temporadaBaja'];
  return precio ?? null;
}
