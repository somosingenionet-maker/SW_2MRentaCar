interface LineaMinima { descripcion: string; cantidad: number }

// Estados en los que la factura ya "cuenta": consume número correlativo y no se puede borrar.
const ESTADOS_EN_FIRME = ['emitida', 'pagada', 'vencida'];

/** Devuelve el motivo por el que la factura no se puede guardar, o null si está bien. */
export function validarFactura(f: { clienteId: string; lineas: LineaMinima[]; estado: string; total: number }): string | null {
  if (!f.clienteId) return 'Selecciona un cliente.';
  if (f.lineas.length === 0) return 'Añade al menos una línea.';
  if (f.lineas.some(l => !l.descripcion.trim())) return 'Todas las líneas necesitan una descripción.';
  if (f.lineas.some(l => !(l.cantidad > 0))) return 'La cantidad de cada línea debe ser mayor que 0.';
  if (ESTADOS_EN_FIRME.includes(f.estado) && !(f.total > 0)) {
    return 'No se puede emitir una factura de 0 €: usaría un número de factura y no se puede borrar. Revisa los precios o guárdala como borrador.';
  }
  return null;
}
