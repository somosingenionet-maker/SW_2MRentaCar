import { describe, it, expect } from 'vitest';
import { renderToString } from 'react-dom/server';
import TarjetaClienteFields from './components/TarjetaClienteFields';

describe('campos de la tarjeta del cliente', () => {
  const h = renderToString(<TarjetaClienteFields value={{ tarjetaNumero: '4242424242424242', tarjetaCaducidad: '08/28' }} onChange={() => undefined} />);

  it('solo tiene número y caducidad, el número en grupos de 4', () => {
    expect(h.match(/<input/g)).toHaveLength(2);
    expect(h).toContain('Número de tarjeta');
    expect(h).toContain('value="4242 4242 4242 4242"');
    expect(h).toContain('value="08/28"');
    expect(h).not.toContain('Titular');
    expect(h).not.toContain('<select');
  });

  it('no pide el CVV y lo dice', () => {
    expect(h).toContain('no se guarda: no lo anotes');
    expect(h.toLowerCase()).not.toMatch(/id="[^"]*cvv/);
  });
});
