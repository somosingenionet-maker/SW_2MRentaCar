const MONTHS = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];

const MONTHS_EN = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/** '2026-07-15' → '15 jul. 2026' (español, por defecto) o '15 Jul 2026' (inglés). */
export function formatDate(iso: string, idioma: 'es' | 'en' = 'es'): string {
  if (!iso) return '—';
  const parts = iso.split('-');
  if (parts.length !== 3) return iso;
  const [year, month, day] = parts;
  return idioma === 'en'
    ? `${parseInt(day)} ${MONTHS_EN[parseInt(month) - 1]} ${year}`
    : `${parseInt(day)} ${MONTHS[parseInt(month) - 1]}. ${year}`;
}

