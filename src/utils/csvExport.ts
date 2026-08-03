/** Convierte un texto en un fragmento apto para nombres de archivo (sin acentos ni espacios). */
export function slugify(text: string): string {
  return text
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-zA-Z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '') || 'empresa';
}

export function downloadCsv(filename: string, rows: string[][]): void {
  const bom = '﻿'; // UTF-8 BOM for Excel compatibility
  const content = bom + rows.map(row =>
    row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(';')
  ).join('\r\n');

  const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}
