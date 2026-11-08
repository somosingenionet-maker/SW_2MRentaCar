import type { IdiomaContrato } from './contratoTextos';

const sinAcentos = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim().replace(/\s+/g, ' ');

// ── Países ────────────────────────────────────────────────────────────────────
// Los clientes guardan el país en español («Reino Unido»). Se traduce con la lista de países del propio navegador,
// buscando cada nombre español de la lista ISO (así no hay que mantener una tabla a mano).
let paisesEs: Map<string, string> | null = null;

function construirPaises(): Map<string, string> {
  const m = new Map<string, string>();
  try {
    const es = new Intl.DisplayNames(['es'], { type: 'region' });
    const en = new Intl.DisplayNames(['en'], { type: 'region' });
    for (let a = 65; a <= 90; a++) for (let b = 65; b <= 90; b++) {
      const codigo = String.fromCharCode(a, b);
      const nombreEs = es.of(codigo);
      const nombreEn = en.of(codigo);
      if (nombreEs && nombreEn && nombreEs !== codigo && nombreEn !== codigo) m.set(sinAcentos(nombreEs), nombreEn);
    }
  } catch { /* sin Intl.DisplayNames: los países se quedan como están */ }
  return m;
}

/** País en el idioma del contrato: «Reino Unido» → «United Kingdom». Si no se reconoce, se deja como está. */
export function traducirPais(pais: string | undefined | null, idioma: IdiomaContrato): string {
  const texto = (pais ?? '').trim();
  if (idioma !== 'en' || !texto) return texto;
  paisesEs ??= construirPaises();
  const conocido = paisesEs.get(sinAcentos(texto));
  if (conocido) return conocido;
  if (/^[A-Za-z]{2}$/.test(texto)) {
    try { return new Intl.DisplayNames(['en'], { type: 'region' }).of(texto.toUpperCase()) ?? texto; } catch { return texto; }
  }
  return texto;
}

// ── Lugares y direcciones ─────────────────────────────────────────────────────
/**
 * Palabras de un lugar o dirección que sí se traducen («Aeropuerto, Palma de Mallorca» → «Airport, Palma de Mallorca»,
 * «8 bajos» → «8 (ground floor)»). Los nombres propios y las calles se dejan como están.
 */
export function traducirLugar(texto: string | undefined | null, idioma: IdiomaContrato): string {
  const t = (texto ?? '').trim();
  if (idioma !== 'en' || !t) return t;
  return t
    .replace(/\bAeropuerto\b/gi, 'Airport')
    .replace(/\bOficina\b/gi, 'Office')
    .replace(/\bPuerto\b/gi, 'Port')
    .replace(/\bEstación\b/gi, 'Station')
    .replace(/\b(\d+\w?)\s+bajos?\b/gi, '$1 (ground floor)')
    .replace(/\bbajos?\b/gi, '(ground floor)');
}

// ── Complementos ──────────────────────────────────────────────────────────────
const COMPLEMENTOS_EN: Record<string, string> = {
  'asiento elevador': 'Booster seat',
  'asiento elevador de respaldo alto': 'High-back booster seat',
  'sillita infantil': 'Child seat',
  'maxi-cosi': 'Maxi-Cosi',
  'baca coche': 'Roof rack',
  'baca': 'Roof rack',
  'portabicicletas': 'Bike rack',
  'portaequipajes': 'Luggage rack',
  'gps': 'GPS',
  'cadenas de nieve': 'Snow chains',
};

/** Nombre de un complemento en el idioma del contrato. Los que no están en la lista se dejan con el nombre que tienen. */
export function traducirComplemento(nombre: string, idioma: IdiomaContrato): string {
  if (idioma !== 'en') return nombre;
  return COMPLEMENTOS_EN[sinAcentos(nombre)] ?? nombre;
}

// ── Aseguradora ───────────────────────────────────────────────────────────────
/** La aseguradora lleva a veces una nota en español («Mutua (actualmente de baja)»). */
export function traducirAseguradora(texto: string | undefined | null, idioma: IdiomaContrato): string {
  const t = (texto ?? '').trim();
  if (idioma !== 'en' || !t) return t;
  return t.replace(/\(\s*actualmente de baja\s*\)/gi, '(currently inactive)');
}
