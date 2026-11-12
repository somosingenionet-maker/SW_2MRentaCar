import type { Alerta, Vehiculo } from '../types';
import { estadoAlerta, textoPlazo, DIAS_VENCE_PRONTO } from './alertasEstado';
import { formatDate } from './dateFormat';

const NOMBRE_TIPO: Record<Alerta['tipo'], string> = { itv: 'ITV', seguro: 'Seguro', impuesto: 'Impuesto', aceite: 'Cambio de aceite' };
const MAX_LINEAS = 25;

/** 1 = lunes … 7 = domingo, para una fecha AAAA-MM-DD. */
export function diaSemanaISO(fecha: string): number {
  const d = new Date(`${fecha}T12:00:00Z`).getUTCDay();
  return d === 0 ? 7 : d;
}
export const esLunes = (fecha: string): boolean => diaSemanaISO(fecha) === 1;

export interface ResumenSemanal {
  asunto: string;
  texto: string;
  vencidas: number;
  pronto: number;
  avisosPendientes: number;
  /** Nada que atender: ni vencimientos urgentes ni avisos. */
  vacio: boolean;
}

/**
 * Texto del resumen de los lunes: lo vencido, lo que vence en los próximos 14 días y los avisos a clientes que faltan.
 * Pensado para leerse en un mensaje: una línea por vencimiento, lo más urgente arriba y con tope de líneas.
 */
export function resumenSemanal(entrada: { alertas: Alerta[]; vehiculos: Vehiculo[]; avisosPendientes: number; hoy: string; empresa: string }): ResumenSemanal {
  const { alertas, vehiculos, hoy } = entrada;
  const veh = (id: string) => vehiculos.find(v => v.id === id);
  const linea = (a: Alerta) => {
    const v = veh(a.vehiculoId);
    return `• ${NOMBRE_TIPO[a.tipo]} · ${v ? `${v.matricula} ${v.marca} ${v.modelo}`.trim() : 'vehículo desconocido'} — ${textoPlazo(a, hoy).replace(/^Programada · /, '')}${a.fechaLimite ? ` (${formatDate(a.fechaLimite)})` : ''}`;
  };
  const porFecha = (x: Alerta, y: Alerta) => (x.fechaLimite ?? '').localeCompare(y.fechaLimite ?? '');
  const vencidas = alertas.filter(a => estadoAlerta(a, hoy) === 'vencida').sort(porFecha);
  const pronto = alertas.filter(a => estadoAlerta(a, hoy) === 'pronto').sort(porFecha);

  const bloque = (titulo: string, lista: Alerta[]) => {
    if (lista.length === 0) return '';
    const visibles = lista.slice(0, MAX_LINEAS).map(linea);
    if (lista.length > MAX_LINEAS) visibles.push(`…y ${lista.length - MAX_LINEAS} más (míralos en Alertas).`);
    return `${titulo} (${lista.length})\n${visibles.join('\n')}`;
  };

  const partes = [
    `Resumen semanal · ${entrada.empresa}\nSituación a ${formatDate(hoy)}`,
    bloque('VENCIDAS', vencidas),
    bloque(`VENCEN EN LOS PRÓXIMOS ${DIAS_VENCE_PRONTO} DÍAS`, pronto),
    entrada.avisosPendientes > 0
      ? `AVISOS A CLIENTES PENDIENTES: ${entrada.avisosPendientes}\nMíralos en Alertas → «Toca avisar a clientes».`
      : '',
  ].filter(Boolean);
  const vacio = vencidas.length === 0 && pronto.length === 0 && entrada.avisosPendientes === 0;
  if (vacio) partes.push('Todo al día: no hay vencimientos urgentes ni avisos pendientes.');
  return {
    asunto: `Resumen semanal de vencimientos · ${formatDate(hoy)}`,
    texto: partes.join('\n\n'),
    vencidas: vencidas.length, pronto: pronto.length, avisosPendientes: entrada.avisosPendientes, vacio,
  };
}
