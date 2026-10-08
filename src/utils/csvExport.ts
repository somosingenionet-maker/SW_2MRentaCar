/** Convierte un texto en un fragmento apto para nombres de archivo (sin acentos ni espacios). */
export function slugify(text: string): string {
  return text
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-zA-Z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '') || 'empresa';
}

/**
 * Evita la inyección de fórmulas en Excel/Calc: nombres, direcciones, etc. vienen
 * de formularios públicos, y una celda que empiece por = + - @ (o tabulador /
 * retorno de carro) se ejecutaría como fórmula al abrir el CSV. Se antepone un
 * apóstrofo, salvo en números y teléfonos (solo cifras, espacios, puntos,
 * paréntesis y un signo inicial), que no son fórmulas y no deben alterarse.
 */
export function escaparCeldaCsv(texto: string): string {
  if (!/^[=+\-@\t\r]/.test(texto)) return texto;
  if (/^[+-]?[\d\s().,-]+$/.test(texto)) return texto;
  return `'${texto}`;
}

export function downloadCsv(filename: string, rows: string[][]): void {
  const bom = '﻿'; // UTF-8 BOM for Excel compatibility
  const content = bom + rows.map(row =>
    row.map(cell => `"${escaparCeldaCsv(String(cell)).replace(/"/g, '""')}"`).join(';')
  ).join('\r\n');

  const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}
