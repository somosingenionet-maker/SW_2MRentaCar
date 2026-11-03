import { describe, it, expect } from 'vitest';
import { renderToString } from 'react-dom/server';
import TarjetaClienteFields from './components/TarjetaClienteFields';

describe('campos de la tarjeta del cliente', () => {
  const h = renderToString(<TarjetaClienteFields value={{ tarjetaMarca: 'Visa', tarjetaUltimos4: '4242', tarjetaCaducidad: '08/28', tarjetaTitular: 'Ana Pérez' }} onChange={() => undefined} />);

  it('muestra titular, marca, últimos 4 y caducidad con su valor', () => {
    expect(h).toContain('Tarjeta');
    expect(h).toContain('value="Ana Pérez"');
    expect(h).toContain('value="4242"');
    expect(h).toContain('value="08/28"');
    expect(h).toContain('<option value="Mastercard">');
  });

  it('deja claro que no se guarda el número completo ni el CVV y no pide ninguno de los dos', () => {
    expect(h).toContain('Nunca anotes aquí el número completo ni el CVV');
    expect(h.toLowerCase()).not.toContain('cvv"');
    expect(h).not.toContain('maxlength="16"');
  });
});
