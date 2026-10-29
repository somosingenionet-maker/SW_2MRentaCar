import { describe, it, expect } from 'vitest';
import { renderToString } from 'react-dom/server';
import ContratoAlquiler from './components/ContratoAlquiler';
import ContratoVisor from './components/ContratoVisor';
import { TEXTOS_CONTRATO, DECLARACION_ES, DECLARACION_EN, IDIOMAS_CONTRATO, type IdiomaContrato } from './utils/contratoTextos';
import { DEFAULT_EMPRESA_CONFIG } from './data/empresaConfig';
import type { Cliente, Reserva, SolicitudReserva, Vehiculo } from './types';

const empresa = DEFAULT_EMPRESA_CONFIG;
const cliente = {
  id: 'c1', nombre: 'Ana', apellidos: 'Pérez', nifNiePasaporte: '12345678Z', correo: 'ana@example.com', telefono: '+34600111222', direccion: 'Calle 1',
  ciudad: 'Palma', pais: 'España', carnetNumero: 'ABC12345', carnetExpedicion: '2018-03-01', carnetVencimiento: '2028-03-01', interacciones: [], fechaRegistro: '2026-10-01',
} as Cliente;
const vehiculo = {
  id: 'v1', marca: 'Seat', modelo: 'Ibiza', matricula: '5612HDR', bastidor: 'VF3ABC', kilometraje: 120000, transmision: 'automatico', aseguradora: 'FIATC',
} as Vehiculo;
const reserva = {
  id: 'res-mvry2uo8eyu291', vehiculoId: 'v1', clienteId: 'c1', fechaInicio: '2026-10-31', fechaFin: '2026-11-02', horaInicio: '10:00', horaFin: '09:30', temporada: 'media',
  tarifaDiaria: 23, totalCobrado: 76, estado: 'confirmada', incluyeSeguroTodoRiesgo: true, fianza: 500, seguroDia: 15,
  entrega: { fechaHora: '2026-10-31T10:05:00', km: 120100, combustible: 'tres_cuartos', danos: '', responsable: 'Daniel' },
} as Reserva;

const texto = (idioma: IdiomaContrato, extra: { reserva?: Partial<Reserva>; cliente?: Cliente | undefined; vehiculo?: Vehiculo | undefined; solicitud?: SolicitudReserva } = {}) =>
  renderToString(
    <ContratoAlquiler reserva={{ ...reserva, ...extra.reserva }} cliente={'cliente' in extra ? extra.cliente : cliente}
      vehiculo={'vehiculo' in extra ? extra.vehiculo : vehiculo} empresa={empresa} idioma={idioma} solicitud={extra.solicitud} />,
  ).replace(/<[^>]*>/g, ' ').replace(/&amp;/g, '&').replace(/&#x27;/g, "'").replace(/\s+/g, ' ').replace(/ :/g, ':');

describe('declaración final del contrato', () => {
  it('el texto en español es exactamente el que pidió el cliente', () => {
    expect(DECLARACION_ES).toBe(
      'Declaro haber leído las condiciones descritas anteriormente, así como las Condiciones que recibo por separado y declaro que acepto los términos y condiciones de las mismas. ' +
      'Si el pago de este alquiler se realiza mediante tarjeta bancaria o efectivo, mi firma confirma y acepta los pagos realizados mediante la tarjeta anotada.',
    );
  });

  it('el texto en inglés es exactamente el que facilitó el cliente', () => {
    expect(DECLARACION_EN).toBe(
      'I declare that I have read the conditions described above, as well as the Conditions that I receive separately and declare that I accept their terms and conditions. ' +
      'If the payment of this rent is made by bank card or cash, my signature confirms and accepts payments made on the card added to the contract.',
    );
  });

  it('aparece en el contrato en español, justo debajo de las firmas, y ya no están las cláusulas antiguas', () => {
    const t = texto('es');
    expect(t).toContain(DECLARACION_ES);
    expect(t.indexOf('Firma conductor')).toBeLessThan(t.indexOf(DECLARACION_ES));
    for (const viejo of ['CLÁUSULAS ADICIONALES', 'PRIMERA. Objeto', 'SEGUNDA. Combustible', 'TERCERA. Cobertura']) expect(t).not.toContain(viejo);
  });

  it('aparece su traducción en el contrato en inglés', () => {
    const t = texto('en');
    expect(t).toContain(DECLARACION_EN);
    expect(t).not.toContain(DECLARACION_ES);
    expect(t.indexOf("Driver's signature")).toBeLessThan(t.indexOf(DECLARACION_EN));
  });
});

describe('contrato en los dos idiomas', () => {
  it('los dos idiomas tienen exactamente los mismos textos', () => {
    expect(Object.keys(TEXTOS_CONTRATO.en).sort()).toEqual(Object.keys(TEXTOS_CONTRATO.es).sort());
    expect(IDIOMAS_CONTRATO.map(i => i.id)).toEqual(['es', 'en']);
  });

  it('en español conserva los títulos y las horas', () => {
    const t = texto('es');
    expect(t).toContain('Contrato de Alquiler de Vehículo');
    expect(t).toContain('DATOS DEL ARRENDADOR');
    expect(t).toContain('Fecha y hora de entrega: 31 oct. 2026 · 10:00');
    expect(t).toContain('Fecha y hora acordadas de retorno: 2 nov. 2026 · 09:30');
    expect(t).toContain('Carnet de conducir: ABC12345 · expedido 1 mar. 2018 · vence 1 mar. 2028');
    expect(t).toContain('Automático');
    expect(t).toContain('Fianza (depósito reembolsable): 500.00 €');
  });

  it('en inglés traduce títulos, etiquetas y fechas, y conserva las horas', () => {
    const t = texto('en');
    expect(t).toContain('Vehicle Rental Agreement');
    expect(t).toContain('LESSOR DETAILS');
    expect(t).toContain('Pick-up date and time: 31 Oct 2026 · 10:00');
    expect(t).toContain('Agreed return date and time: 2 Nov 2026 · 09:30');
    expect(t).toContain('Driving licence: ABC12345 · issued 1 Mar 2018 · expires 1 Mar 2028');
    expect(t).toContain('Automatic');
    expect(t).toContain('Deposit (refundable): 500.00 €');
    for (const espanol of ['DATOS DEL', 'Contrato de', 'Fecha y hora', 'Kilometraje', 'Matrícula', 'oct.', 'Arrendador', 'Arrendatario', 'conductor']) expect(t).not.toContain(espanol);
  });

  it('sin fianza no aparece su línea, en ningún idioma', () => {
    expect(texto('es', { reserva: { fianza: 0 } })).not.toContain('Fianza');
    expect(texto('en', { reserva: { fianza: undefined } })).not.toContain('Deposit');
  });

  it('seguro: completo con precio, o terceros básico, traducido', () => {
    expect(texto('es')).toContain('15.00 € / día');
    expect(texto('en')).toContain('15.00 € / day');
    expect(texto('es', { reserva: { incluyeSeguroTodoRiesgo: false } })).toContain('Póliza Terceros Básica');
    expect(texto('en', { reserva: { incluyeSeguroTodoRiesgo: false } })).toContain('Basic third-party policy');
  });

  it('un cliente o un vehículo que ya no existen no rompen el contrato', () => {
    for (const idioma of ['es', 'en'] as const) {
      expect(texto(idioma, { cliente: undefined })).toContain(TEXTOS_CONTRATO[idioma].fichaNoDisponible);
      expect(texto(idioma, { vehiculo: undefined })).toContain(TEXTOS_CONTRATO[idioma].vehiculoDesasociado);
    }
  });

  it('una reserva antigua sin horas se imprime solo con la fecha', () => {
    const t = texto('es', { reserva: { horaInicio: undefined, horaFin: undefined } });
    expect(t).toContain('Fecha y hora de entrega: 31 oct. 2026 Lugar de entrega:');
    expect(t).toContain('Fecha y hora acordadas de retorno: 2 nov. 2026 Lugar de devolución:');
  });

  it('en ningún idioma aparece NaN, undefined ni [object Object]', () => {
    for (const idioma of ['es', 'en'] as const) for (const re of [/NaN/, /undefined/, /\[object Object\]/]) expect(texto(idioma)).not.toMatch(re);
  });

  it('el mensaje que acompaña al contrato sale en el idioma elegido', () => {
    const d = { nombre: 'Ana', vehiculo: 'Seat Ibiza', matricula: '5612HDR', desde: '31 Oct 2026 · 10:00', hasta: '2 Nov 2026 · 09:30', dias: 2, total: '76.00', empresa: '2M Rent a Car' };
    expect(TEXTOS_CONTRATO.es.mensaje(d)).toContain('Le enviamos los datos del contrato de alquiler');
    expect(TEXTOS_CONTRATO.en.mensaje(d)).toContain('Here are the details of the rental agreement');
    // Los enlaces de correo y WhatsApp no pueden adjuntar archivos: el texto no debe prometerlo.
    for (const idioma of ['es', 'en'] as const) expect(TEXTOS_CONTRATO[idioma].mensaje(d)).not.toMatch(/adjunt|attach/i);
    expect(TEXTOS_CONTRATO.en.asuntoCorreo('2M')).toBe('Rental Agreement - 2M');
  });
});

describe('cajas de firma', () => {
  const html = (idioma: IdiomaContrato) =>
    renderToString(<ContratoAlquiler reserva={reserva} cliente={cliente} vehiculo={vehiculo} empresa={empresa} idioma={idioma} />);
  const cajas = (idioma: IdiomaContrato) => [...html(idioma).matchAll(/data-testid="caja-firma"[^>]*>(.*?)<\/div>/g)].map(m => m[1].replace(/<[^>]*>/g, ''));

  it('hay una caja por firmante, con el título en el idioma del contrato', () => {
    expect(cajas('es')).toEqual(['Firma arrendador (2M Rent a Car)', 'Firma conductor']);
    expect(cajas('en')).toEqual(["Lessor&#x27;s signature (2M Rent a Car)", "Driver&#x27;s signature"]);
  });

  it('las cajas llevan el borde lila de marca y ya no quedan las líneas de puntos antiguas', () => {
    const h = html('es');
    expect(h).toContain('border-color:#C48CD6');
    expect(h).not.toContain('border-dashed border-slate-300 pb-12');
    expect(texto('es')).not.toContain('Por el Arrendatario');
  });

  it('el título sale en mayúsculas al verse e imprimirse', () => {
    expect(html('en')).toMatch(/uppercase[^>]*>Driver&#x27;s signature/);
  });
});

describe('logo de la empresa', () => {
  const con = (logoBase64: string) =>
    renderToString(<ContratoAlquiler reserva={reserva} cliente={cliente} vehiculo={vehiculo} empresa={{ ...empresa, logoBase64 }} idioma="es" />);

  it('muestra el logo subido en la cabecera, antes del título', () => {
    const h = con('data:image/png;base64,AAAA');
    expect(h).toContain('src="data:image/png;base64,AAAA"');
    expect(h.indexOf('data:image/png;base64,AAAA')).toBeLessThan(h.indexOf('Contrato de Alquiler'));
  });

  it('sin logo subido no deja imagen rota', () => {
    expect(con('')).not.toContain('<img');
  });
});

describe('cabecera y pie sin marca del programa', () => {
  it.each(['es', 'en'] as const)('no menciona CRM, Flotas/Fleet ni "sin conductor" (%s)', idioma => {
    expect(texto(idioma)).not.toMatch(/CRM|Flotas &|Fleet &|Copia legal|Certified legal|Sin conductor|Without driver/);
  });
});

const pedidoWeb = { referenciaExterna: '4821', lugarRecogida: 'Aeropuerto, Palma de Mallorca', lugarDevolucion: 'Cami de son Gotleu, 8 bajos, 07008' } as SolicitudReserva;

describe('número de reserva web, lugares y entrega/devolución', () => {
  it('muestra el número de la reserva de la web cuando la reserva viene de un pedido', () => {
    expect(texto('es', { solicitud: pedidoWeb })).toContain('Reserva web nº 4821');
    expect(texto('en', { solicitud: pedidoWeb })).toContain('Web booking no. 4821');
  });

  it('una reserva manual no muestra número de reserva web', () => {
    expect(texto('es')).not.toContain('Reserva web');
    expect(texto('en')).not.toContain('Web booking');
  });

  it('muestra el lugar de entrega y de devolución guardados en la reserva', () => {
    const t = texto('es', { reserva: { lugarRecogida: 'Hotel Sol, Palma', lugarDevolucion: 'Aeropuerto' } });
    expect(t).toContain('Lugar de entrega: Hotel Sol, Palma');
    expect(t).toContain('Lugar de devolución: Aeropuerto');
    const e = texto('en', { reserva: { lugarRecogida: 'Hotel Sol, Palma', lugarDevolucion: 'Aeropuerto' } });
    expect(e).toContain('Pick-up location: Hotel Sol, Palma');
    expect(e).toContain('Return location: Aeropuerto');
  });

  it('si la reserva no guarda el lugar, usa el del pedido de la web', () => {
    const t = texto('es', { solicitud: pedidoWeb });
    expect(t).toContain('Lugar de entrega: Aeropuerto, Palma de Mallorca');
    expect(t).toContain('Lugar de devolución: Cami de son Gotleu, 8 bajos, 07008');
  });

  it('sin lugar en ninguna parte dice «No informado» en vez de dejarlo vacío', () => {
    expect(texto('es')).toContain('Lugar de entrega: No informado');
    expect(texto('en')).toContain('Pick-up location: Not provided');
  });

  it('ya no incluye los cuadros de entrega y devolución del vehículo (se dan al cliente al reservar)', () => {
    for (const idioma of ['es', 'en'] as const) {
      const t = texto(idioma);
      expect(t).not.toMatch(/6\. |7\. |ENTREGA DEL VEHÍCULO|DEVOLUCIÓN DEL VEHÍCULO|VEHICLE HANDOVER|VEHICLE RETURN|Combustible|Fuel|Daños|Damage/);
    }
    expect(texto('es', { reserva: { entrega: undefined } })).toContain('DESCRIPCIÓN DEL VEHÍCULO');
  });
});

describe('visor del contrato (Alquiler y ficha del cliente)', () => {
  const visor = (cli: Cliente | undefined) =>
    renderToString(<ContratoVisor reserva={reserva} cliente={cli} vehiculo={vehiculo} empresa={empresa} onClose={() => undefined} />);

  it('muestra el contrato con el selector de idioma, imprimir y cerrar', () => {
    const h = visor(cliente);
    expect(h).toContain('Contrato de Alquiler de Vehículo');
    expect(h).toContain('Descargar / Imprimir');
    expect(h).toContain('Español');
    expect(h).toContain('English');
    expect(h).toContain('Cerrar');
    expect(h).toContain('data-imprimible');
  });

  it('ofrece WhatsApp y correo solo si el cliente tiene teléfono y correo', () => {
    expect(visor(cliente)).toContain('wa.me/34600111222');
    expect(visor(cliente)).toContain('mailto:ana@example.com');
    const h = visor(undefined);
    expect(h).not.toContain('wa.me');
    expect(h).not.toContain('mailto:');
  });
});
