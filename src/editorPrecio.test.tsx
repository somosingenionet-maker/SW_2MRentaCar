import { describe, it, expect } from 'vitest';
import { renderToString } from 'react-dom/server';
import { EditorPrecio } from './components/EditorPrecio';

const texto = (h: string) => h.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ');
const pinta = (o: Partial<Parameters<typeof EditorPrecio>[0]> = {}) => renderToString(
  <EditorPrecio modo="fijo" valor="150" totalNuevo={150} totalActual={180} dias={4} error="" firmada={false}
    onModo={() => undefined} onValor={() => undefined} onGuardar={() => undefined} onCancelar={() => undefined} {...o} />,
);

describe('editor del precio del alquiler', () => {
  it('con precio cerrado explica que el seguro y los complementos van aparte y enseña el total nuevo con la diferencia', () => {
    const t = texto(pinta());
    expect(t).toContain('Precio cerrado');
    expect(t).toContain('Tarifa por día');
    expect(t).toContain('El seguro y los complementos se suman aparte');
    expect(t).toContain('no cambia');
    expect(t).toMatch(/Total: 150,00 € \( ?− ?30,00 €\)/);
  });

  it('con tarifa por día no habla del precio cerrado', () => {
    const t = texto(pinta({ modo: 'dia', valor: '45', totalNuevo: 180 }));
    expect(t).toContain('días × tarifa');
    expect(t).not.toContain('se suman aparte');
    expect(t).not.toMatch(/\( ?[+−]/);
  });

  it('si el importe no es válido enseña el total actual y el error; avisa de la firma', () => {
    const h = pinta({ totalNuevo: null, error: 'Indica el precio cerrado del alquiler (mayor que 0).', firmada: true });
    expect(texto(h)).toContain('Total: 180,00 €');
    expect(texto(h)).toContain('Indica el precio cerrado');
    expect(texto(h)).toContain('anula la firma y vuelve a firmar');
  });
});
