import { describe, it, expect } from 'vitest';
import { renderToString } from 'react-dom/server';
import MetodoPagoCampo from './components/MetodoPagoCampo';

const pinta = (value: Parameters<typeof MetodoPagoCampo>[0]['value']) => renderToString(<MetodoPagoCampo value={value} onChange={() => undefined} />);

describe('campo «Método de pago» del alta de reserva', () => {
  it('ofrece Efectivo, Tarjeta y Transferencia, sin ninguno elegido por defecto', () => {
    const h = pinta('');
    for (const t of ['Método de pago', 'Efectivo', 'Tarjeta', 'Transferencia']) expect(h).toContain(t);
    expect(h.match(/aria-pressed="true"/g)).toBeNull();
    expect(h.match(/aria-pressed="false"/g)).toHaveLength(3);
  });

  it('marca el elegido', () => {
    const h = pinta('transferencia');
    expect(h.match(/aria-pressed="true"/g)).toHaveLength(1);
    expect(h).toMatch(/data-testid="metodo-pago-transferencia"[^>]*>|aria-pressed="true"[^>]*data-testid="metodo-pago-transferencia"/);
  });
});
