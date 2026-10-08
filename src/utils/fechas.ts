const dosDigitos = (n: number) => String(n).padStart(2, '0');

/** Fecha de hoy en formato AAAA-MM-DD, con la hora local (no UTC: cerca de medianoche UTC daría otro día). */
export function hoyISO(): string {
  const d = new Date();
  return `${d.getFullYear()}-${dosDigitos(d.getMonth() + 1)}-${dosDigitos(d.getDate())}`;
}

/** Suma años a una fecha AAAA-MM-DD. El 29 de febrero pasa al 28 en años no bisiestos. */
export function sumarAnios(iso: string, anios: number): string {
  const [a, m, d] = iso.split('-').map(Number);
  if (!a || !m || !d) return iso;
  const anio = a + anios;
  const diasDelMes = new Date(anio, m, 0).getDate();
  return `${anio}-${dosDigitos(m)}-${dosDigitos(Math.min(d, diasDelMes))}`;
}
