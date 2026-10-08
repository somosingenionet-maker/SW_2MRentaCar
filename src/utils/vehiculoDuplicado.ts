// Una matrícula o un bastidor solo puede pertenecer a un vehículo. Se comparan
// sin tener en cuenta mayúsculas, espacios ni guiones ("1234-ABC" = "1234 abc").
const normalizar = (valor: string | undefined): string => (valor ?? '').toUpperCase().replace(/[^A-Z0-9]/g, '');

interface ConIdentificacion {
  id: string;
  matricula: string;
  bastidor?: string;
}

/**
 * Devuelve qué dato ya está en uso por OTRO vehículo ('matrícula' o 'bastidor'),
 * o null si no hay conflicto. `candidato.id` se ignora al comparar, para poder
 * editar un vehículo sin que choque consigo mismo.
 */
export function datoDuplicado(vehiculos: ConIdentificacion[], candidato: ConIdentificacion): 'matrícula' | 'bastidor' | null {
  const mat = normalizar(candidato.matricula);
  const bas = normalizar(candidato.bastidor);
  for (const v of vehiculos) {
    if (v.id === candidato.id) continue;
    if (mat && normalizar(v.matricula) === mat) return 'matrícula';
    if (bas && normalizar(v.bastidor) === bas) return 'bastidor';
  }
  return null;
}
