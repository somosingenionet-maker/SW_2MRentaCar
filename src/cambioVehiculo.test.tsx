import { describe, it, expect } from 'vitest';
import { renderToString } from 'react-dom/server';
import { CambioVehiculo } from './components/CambioVehiculo';

const opciones = [{ value: 'v2', label: 'Seat Ibiza', sublabel: 'Matrícula: 1234ABC' }];
const pinta = (o: Partial<Parameters<typeof CambioVehiculo>[0]> = {}) => renderToString(
  <CambioVehiculo opciones={opciones} valor="" avisos={[]} error="" firmada={false} onCambiar={() => undefined} onGuardar={() => undefined} onCancelar={() => undefined} {...o} />,
);

describe('cambio de vehículo en la ficha', () => {
  it('pide el vehículo nuevo y no deja confirmar hasta elegirlo', () => {
    const h = pinta();
    expect(h).toContain('Nuevo vehículo');
    expect(h).toMatch(/<button[^>]*disabled=""[^>]*>Cambiar vehículo<\/button>/);
    expect(pinta({ valor: 'v2' })).not.toMatch(/disabled=""[^>]*>Cambiar vehículo/);
  });

  it('enseña los avisos, el error y la advertencia de firma', () => {
    const h = pinta({ valor: 'v2', avisos: ['La reserva mantiene su precio acordado'], error: 'Ese coche ya tiene otra reserva', firmada: true });
    expect(h).toContain('La reserva mantiene su precio acordado');
    expect(h).toContain('Ese coche ya tiene otra reserva');
    expect(h).toContain('anula la firma y vuelve a firmar');
  });
});
