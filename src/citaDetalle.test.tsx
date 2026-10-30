import { describe, it, expect } from 'vitest';
import { renderToString } from 'react-dom/server';
import CitaDetalle from './components/CitaDetalle';
import type { Cita } from './types';

const cita = (extra: Partial<Cita> = {}): Cita => ({
  id: 'c1', fechaHora: new Date(2026, 9, 31, 9, 30).toISOString(), duracionMinutos: 90, clienteId: 'cli1', vehiculoId: 'v1',
  motivo: 'Revisión completa', tecnicoId: 't1', estado: 'pendiente', notas: 'Trae las llaves de repuesto', ...extra,
});
const estado = { label: 'Pendiente', color: 'text-amber-700', bg: 'bg-amber-50' };
const pinta = (c: Cita, p: Partial<Parameters<typeof CitaDetalle>[0]> = {}) =>
  renderToString(
    <CitaDetalle cita={c} estado={estado} cliente="Ana Pérez" telefono="+34 600 111 222" vehiculo="Seat Ibiza · 5612HDR" mecanico="Pedro"
      onEditar={() => undefined} onConfirmar={() => undefined} onCancelar={() => undefined} onConvertir={() => undefined} onClose={() => undefined} {...p} />,
  );
const texto = (h: string) => h.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ');

describe('ficha de la cita', () => {
  it('enseña todos los datos: motivo, estado, fecha y hora con su fin, cliente, teléfono, coche, mecánico y notas', () => {
    const t = texto(pinta(cita()));
    for (const x of ['Revisión completa', 'Pendiente', 'Sábado, 31 de octubre de 2026', '09:30 – 11:00', '90 min', 'Ana Pérez', '+34 600 111 222', 'Seat Ibiza · 5612HDR', 'Pedro', 'Trae las llaves de repuesto']) expect(t).toContain(x);
  });

  it('el teléfono es un enlace para llamar', () => {
    expect(pinta(cita())).toContain('href="tel:+34600111222"');
  });

  it('pendiente: ofrece Convertir, Confirmar, Editar y Cancelar', () => {
    const t = texto(pinta(cita({ estado: 'pendiente' })));
    for (const x of ['Convertir en OT', 'Confirmar', 'Editar', 'Cancelar cita']) expect(t).toContain(x);
  });

  it('confirmada: no ofrece Confirmar otra vez', () => {
    const t = texto(pinta(cita({ estado: 'confirmada' })));
    expect(t).toContain('Convertir en OT');
    expect(t).not.toContain('Confirmar');
  });

  it('cancelada o convertida: solo se puede editar (no convertir, confirmar ni cancelar)', () => {
    for (const e of ['cancelada', 'convertida'] as const) {
      const t = texto(pinta(cita({ estado: e })));
      expect(t).toContain('Editar');
      for (const x of ['Convertir en OT', 'Confirmar', 'Cancelar cita']) expect(t, e).not.toContain(x);
    }
  });

  it('convertida en una orden: la nombra y, si puede abrir Taller, ofrece ir a ella', () => {
    const sin = texto(pinta(cita({ estado: 'convertida', otId: 'ot1' }), { orden: { numero: 'OT-2026-001' } }));
    expect(sin).toContain('Convertida en la orden OT-2026-001');
    expect(sin).not.toContain('Ver orden');
    const con = texto(pinta(cita({ estado: 'convertida', otId: 'ot1' }), { orden: { numero: 'OT-2026-001' }, onVerOrden: () => undefined }));
    expect(con).toContain('Ver orden OT-2026-001 en Taller');
  });

  it('WhatsApp solo si se le da el enlace', () => {
    expect(texto(pinta(cita()))).not.toContain('WhatsApp');
    const h = pinta(cita(), { whatsappHref: 'https://wa.me/34600111222?text=hola' });
    expect(texto(h)).toContain('Recordar por WhatsApp');
    expect(h).toContain('https://wa.me/34600111222');
  });

  it('un cliente sin registrar se marca, y sin notas ni mecánico no salen esas líneas', () => {
    const t = texto(pinta(cita({ clienteId: undefined, notas: undefined }), { mecanico: undefined }));
    expect(t).toContain('(sin registrar)');
    expect(t).not.toContain('Notas');
    expect(t).not.toContain('Mecánico');
  });
});
