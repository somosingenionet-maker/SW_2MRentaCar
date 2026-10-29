import type { Cliente, Reserva, SolicitudReserva, Vehiculo } from '../types';

/** Minúsculas y sin acentos, para que «perez» encuentre «Pérez». */
const normalizar = (t: string) => t.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

interface Datos {
  clientes: Cliente[];
  vehiculos: Vehiculo[];
  solicitudes: SolicitudReserva[];
}

/**
 * Reservas que coinciden con lo escrito en el buscador. Cada palabra escrita debe aparecer en
 * alguno de estos datos: nombre, apellidos o documento del cliente; matrícula, marca o modelo
 * del coche; número de reserva (el de la tabla, el del contrato o el id completo) y número
 * de pedido de la web. Sin texto devuelve todas.
 */
export function buscarReservas(reservas: Reserva[], { clientes, vehiculos, solicitudes }: Datos, texto: string): Reserva[] {
  const palabras = normalizar(texto).replace(/[#,]/g, ' ').split(/\s+/).filter(Boolean);
  if (palabras.length === 0) return reservas;

  return reservas.filter(r => {
    const c = clientes.find(x => x.id === r.clienteId);
    const v = vehiculos.find(x => x.id === r.vehiculoId);
    const web = solicitudes.find(s => s.reservaId === r.id);
    const ficha = normalizar([
      c ? `${c.nombre} ${c.apellidos} ${c.nifNiePasaporte}` : '',
      v ? `${v.marca} ${v.modelo} ${v.matricula} ${v.matricula.replace(/[^a-z0-9]/gi, '')}` : '',
      r.id,
      web?.referenciaExterna ?? '',
    ].join(' '));
    // En el contrato el número se lee con letra O que parece un cero: se acepta cualquiera de los dos.
    const idCeros = r.id.toLowerCase().replace(/o/g, '0');
    return palabras.every(p => ficha.includes(p) || (p.length >= 4 && idCeros.includes(p.replace(/o/g, '0'))));
  });
}
