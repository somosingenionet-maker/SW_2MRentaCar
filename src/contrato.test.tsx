import { describe, it, expect, vi } from 'vitest';
import { renderToString } from 'react-dom/server';
import ContratoAlquiler from './components/ContratoAlquiler';
import { ContratoVisorVista, type EstadoFirma } from './components/ContratoVisor';
import FirmaPantalla from './components/FirmaPantalla';
import { crearSnapshot, calcularHuella, cambiosTrasFirma } from './utils/firmaContrato';
import { TEXTOS_CONTRATO, DECLARACION_ES, DECLARACION_EN, IDIOMAS_CONTRATO, type IdiomaContrato } from './utils/contratoTextos';
import { DEFAULT_EMPRESA_CONFIG } from './data/empresaConfig';
import type { Cliente, ContratoFirmado, Reserva, SolicitudReserva, Vehiculo } from './types';

// El visor del contrato carga la firma de la base de datos: en los tests no hay conexión.
vi.mock('./data/contratosFirmadosDb', () => ({
  fetchContratoFirmado: async () => null,
  guardarContratoFirmado: async () => undefined,
  anularContratoFirmado: async () => undefined,
  fetchFirmasVigentes: async () => ({}),
}));


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
    expect(t).toContain('Fianza (depósito reembolsable, no incluida en el importe): 500,00 €');
  });

  it('en inglés traduce títulos, etiquetas y fechas, y conserva las horas', () => {
    const t = texto('en');
    expect(t).toContain('Vehicle Rental Agreement');
    expect(t).toContain('LESSOR DETAILS');
    expect(t).toContain('Pick-up date and time: 31 Oct 2026 · 10:00');
    expect(t).toContain('Agreed return date and time: 2 Nov 2026 · 09:30');
    expect(t).toContain('Driving licence: ABC12345 · issued 1 Mar 2018 · expires 1 Mar 2028');
    expect(t).toContain('Automatic');
    expect(t).toContain('Deposit (refundable, not included in the amount): 500.00 €');
    for (const espanol of ['DATOS DEL', 'Contrato de', 'Fecha y hora', 'Kilometraje', 'Matrícula', 'oct.', 'Arrendador', 'Arrendatario', 'conductor']) expect(t).not.toContain(espanol);
  });

  it('sin fianza no aparece su línea, en ningún idioma', () => {
    expect(texto('es', { reserva: { fianza: 0 } })).not.toContain('Fianza');
    expect(texto('en', { reserva: { fianza: undefined } })).not.toContain('Deposit');
  });

  it('seguro: completo con precio, o terceros básico, traducido', () => {
    expect(texto('es')).toContain('Seguro Técnico Completo (2 días × 15,00 €): 30,00 €');
    expect(texto('en')).toContain('Comprehensive insurance (2 days × 15.00 €): 30.00 €');
    expect(texto('es', { reserva: { incluyeSeguroTodoRiesgo: false } })).toContain('Póliza de terceros básica: Incluida');
    expect(texto('en', { reserva: { incluyeSeguroTodoRiesgo: false } })).toContain('Basic third-party policy: Included');
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
    // El enlace de WhatsApp no puede adjuntar archivos: el texto no debe prometerlo.
    for (const idioma of ['es', 'en'] as const) expect(TEXTOS_CONTRATO[idioma].mensaje(d)).not.toMatch(/adjunt|attach/i);
  });
});

describe('cajas de firma', () => {
  const html = (idioma: IdiomaContrato) =>
    renderToString(<ContratoAlquiler reserva={reserva} cliente={cliente} vehiculo={vehiculo} empresa={empresa} idioma={idioma} />);
  const cajas = (idioma: IdiomaContrato) => [...html(idioma).matchAll(/data-testid="caja-firma"[^>]*>(.*?)<\/div>/g)].map(m => m[1].replace(/<[^>]*>/g, ''));

  it('hay una sola caja, la del conductor, con el título en el idioma del contrato', () => {
    expect(cajas('es')).toEqual(['Firma conductor']);
    expect(cajas('en')).toEqual(["Driver&#x27;s signature"]);
  });

  it('ya no hay caja de firma de la empresa, en ningún idioma', () => {
    for (const idioma of ['es', 'en'] as const) expect(texto(idioma)).not.toMatch(/Firma arrendador|Lessor's signature/);
  });

  it('la caja va centrada', () => {
    expect(html('es')).toMatch(/data-testid="caja-firma" class="[^"]*\bmx-auto\b/);
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
    expect(e).toContain('Return location: Airport');
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

const FIRMA_PNG = 'data:image/png;base64,iVBORw0KGgo=';

describe('firma dentro de la caja del conductor', () => {
  const html = (idioma: IdiomaContrato, firma?: { png: string; firmadoEn: string; huella: string }) =>
    renderToString(<ContratoAlquiler reserva={reserva} cliente={cliente} vehiculo={vehiculo} empresa={empresa} idioma={idioma} firma={firma} />);
  const f = { png: FIRMA_PNG, firmadoEn: '2026-10-30T13:05:00.000Z', huella: 'ABCDEF0123456789'.repeat(4) };

  it('sin firma no hay imagen en la caja', () => {
    expect(html('es')).not.toContain('firma-cliente');
  });

  it('con firma dibuja la imagen y la línea «firmado electrónicamente» con la referencia, en cada idioma', () => {
    const es = html('es', f);
    expect(es).toContain(`src="${FIRMA_PNG}"`);
    expect(es).toContain('Firmado electrónicamente el');
    expect(es).toContain('Ref. ABCDEF01');
    const en = html('en', f);
    expect(en).toContain('Electronically signed on');
    expect(en).toContain('Ref. ABCDEF01');
    expect(en).not.toContain('Firmado electrónicamente');
  });

  it('la firma va dentro de la caja del conductor', () => {
    const h = html('es', f);
    expect(h.indexOf('Firma conductor')).toBeLessThan(h.indexOf('firma-cliente'));
    expect(h.match(/data-testid="caja-firma"/g)).toHaveLength(1);
  });
});

describe('pantalla de firma del cliente', () => {
  const contrato = crearSnapshot(reserva, cliente, vehiculo, undefined, empresa);
  const pantalla = (idiomaInicial: IdiomaContrato) =>
    renderToString(<FirmaPantalla contrato={contrato} idiomaInicial={idiomaInicial} onCancelar={() => undefined} onConfirmar={async () => undefined} />);

  it('en español muestra el contrato, la casilla de aceptación, el lienzo y los botones', () => {
    const h = pantalla('es');
    expect(h).toContain('Firma del contrato');
    expect(h).toContain('Contrato de Alquiler de Vehículo');
    expect(h).toContain('He leído el contrato y acepto sus condiciones');
    expect(h).toContain('data-testid="lienzo-firma"');
    expect(h).toContain('Firme aquí con el dedo');
    expect(h).toContain('Firmar y guardar');
    expect(h).toContain('Borrar');
    expect(h).toContain('type="checkbox"');
  });

  it('en inglés todo sale en inglés', () => {
    const h = pantalla('en');
    for (const t of ['Contract signature', 'Vehicle Rental Agreement', 'I have read the agreement and accept its terms', 'Sign here with your finger', 'Sign and save', 'Clear']) expect(h).toContain(t);
    for (const es of ['Firma del contrato', 'He leído', 'Firmar y guardar', 'Borrar']) expect(h).not.toContain(es);
  });

  it('no se puede firmar de entrada: sin aceptar ni firmar el botón está desactivado', () => {
    expect(pantalla('es')).toMatch(/<button[^>]*disabled=""[^>]*>Firmar y guardar|<button[^>]*disabled=""[^>]*>[^<]*Firmar y guardar/);
  });

  it('no se imprime y se presenta como diálogo', () => {
    const h = pantalla('es');
    expect(h).toContain('print:hidden');
    expect(h).toContain('role="dialog"');
  });
});

describe('visor del contrato (Alquiler y ficha del cliente)', () => {
  const firmado = async (cambios: Partial<Reserva> = {}): Promise<ContratoFirmado> => {
    const base = { contrato: crearSnapshot({ ...reserva, ...cambios }, cliente, vehiculo, undefined, empresa), idioma: 'en' as const, firmaPng: FIRMA_PNG, firmadoEn: '2026-10-30T13:05:00.000Z' };
    return { id: 'f1', reservaId: reserva.id, ...base, huella: await calcularHuella(base), firmadoPor: 'Daniel' };
  };
  const vista = (estado: EstadoFirma, extra: { cli?: Cliente | undefined; reserva?: Reserva; integro?: boolean | null; puedeAnular?: boolean } = {}) =>
    renderToString(
      <ContratoVisorVista
        reserva={extra.reserva ?? reserva} cliente={'cli' in extra ? extra.cli : cliente} vehiculo={vehiculo} empresa={empresa}
        estado={estado} integro={extra.integro ?? null} puedeAnular={extra.puedeAnular ?? false} firmando={false}
        onAbrirFirma={() => undefined} onCerrarFirma={() => undefined} onConfirmarFirma={async () => undefined}
        onAnular={async () => undefined} onClose={() => undefined}
      />,
    );
  const texto = (h: string) => h.replace(/<[^>]*>/g, ' ').replace(/&amp;/g, '&').replace(/&#x27;/g, "'").replace(/\s+/g, ' ');

  it('muestra el contrato con el selector de idioma, imprimir y cerrar', () => {
    const h = vista({ fase: 'listo', firmado: null });
    expect(h).toContain('Contrato de Alquiler de Vehículo');
    expect(h).toContain('Descargar / Imprimir');
    expect(h).toContain('Español');
    expect(h).toContain('English');
    expect(h).toContain('Cerrar');
    expect(h).toContain('data-imprimible');
  });

  it('ofrece WhatsApp solo si el cliente tiene teléfono, y ya no ofrece enviar por correo', () => {
    const con = vista({ fase: 'listo', firmado: null });
    expect(con).toContain('wa.me/34600111222');
    expect(con).not.toContain('mailto:');
    const sin = vista({ fase: 'listo', firmado: null }, { cli: undefined });
    expect(sin).not.toContain('wa.me');
    expect(sin).not.toContain('mailto:');
  });

  it('sin firmar ofrece «Firmar en pantalla»; mientras comprueba, si falló la comprobación o si la reserva está anulada, no', () => {
    expect(vista({ fase: 'listo', firmado: null })).toContain('Firmar en pantalla');
    expect(vista({ fase: 'cargando' })).not.toContain('Firmar en pantalla');
    const error = vista({ fase: 'error' });
    expect(error).not.toContain('Firmar en pantalla');
    expect(error).toContain('No se pudo comprobar si este contrato está firmado');
    expect(vista({ fase: 'listo', firmado: null }, { reserva: { ...reserva, estado: 'cancelada' } })).not.toContain('Firmar en pantalla');
  });

  it('firmado: enseña lo firmado (no los datos actuales), en el idioma de la firma, con la firma dentro', async () => {
    const f = await firmado();
    // La reserva cambió después de firmar: el importe actual ya no es 76.
    const h = vista({ fase: 'listo', firmado: f }, { reserva: { ...reserva, totalCobrado: 90 }, integro: true });
    const t = texto(h);
    expect(t).toContain('Vehicle Rental Agreement');
    expect(t).toContain('76.00 €');
    expect(t).not.toContain('90.00 €');
    expect(h).toContain(`src="${FIRMA_PNG}"`);
    expect(h).not.toContain('Firmar en pantalla');
    expect(texto(h)).toContain('Contrato firmado el');
    expect(texto(h)).toContain('Registrado por Daniel');
    expect(texto(h)).toContain('Copia íntegra');
  });

  it('firmado: el selector de idioma queda desactivado', async () => {
    const h = vista({ fase: 'listo', firmado: await firmado() });
    expect((h.match(/disabled=""/g) ?? []).length).toBeGreaterThanOrEqual(2);
  });

  it('firmado: avisa si la reserva cambió desde la firma, y solo entonces', async () => {
    const f = await firmado();
    expect(vista({ fase: 'listo', firmado: f }, { integro: true })).not.toContain('aviso-cambios');
    const h = vista({ fase: 'listo', firmado: f }, { reserva: { ...reserva, totalCobrado: 90, fechaFin: '2026-11-05' } });
    expect(h).toContain('aviso-cambios');
    expect(texto(h)).toContain('La reserva ha cambiado desde la firma');
    expect(texto(h)).toContain('las fechas, el importe');
  });

  it('firmado: si la huella no coincide lo dice claramente', async () => {
    const h = vista({ fase: 'listo', firmado: await firmado() }, { integro: false });
    expect(texto(h)).toContain('no coincide con su huella');
    expect(texto(h)).not.toContain('Copia íntegra');
  });

  it('solo un administrador ve «Anular firma»', async () => {
    const f = await firmado();
    expect(vista({ fase: 'listo', firmado: f }, { puedeAnular: true })).toContain('Anular firma');
    expect(vista({ fase: 'listo', firmado: f }, { puedeAnular: false })).not.toContain('Anular firma');
    expect(texto(vista({ fase: 'listo', firmado: f }, { puedeAnular: false, reserva: { ...reserva, totalCobrado: 90 } }))).toContain('pide a un administrador');
  });
});

describe('días de alquiler en el contrato', () => {
  const conHoras = (extra: Partial<Reserva>, idioma: IdiomaContrato = 'es') => texto(idioma, { reserva: extra });

  it('cuenta las horas: del 1 a las 12:00 al 4 a las 19:00 son 4 días, no 3', () => {
    const t = conHoras({ fechaInicio: '2027-01-01', fechaFin: '2027-01-04', horaInicio: '12:00', horaFin: '19:00' });
    expect(t).toContain('Número total de jornadas: 4 días naturales');
    expect(conHoras({ fechaInicio: '2027-01-01', fechaFin: '2027-01-04', horaInicio: '12:00', horaFin: '19:00' }, 'en')).toContain('Total number of rental days: 4 calendar days');
  });

  it('con las mismas horas, los días exactos', () => {
    expect(conHoras({ fechaInicio: '2027-01-01', fechaFin: '2027-01-04', horaInicio: '12:00', horaFin: '12:00' })).toContain('jornadas: 3 días naturales');
  });

  it('una reserva sin horas cuenta la diferencia entre fechas, como siempre', () => {
    expect(conHoras({ fechaInicio: '2026-10-31', fechaFin: '2026-11-02', horaInicio: undefined, horaFin: undefined })).toContain('jornadas: 2 días naturales');
  });

  it('un contrato firmado enseña los días que se firmaron, aunque la cuenta cambie después', () => {
    expect(conHoras({ dias: 9 } as Partial<Reserva>)).toContain('jornadas: 9 días naturales');
  });

  it('la copia firmada guarda los días', () => {
    const snap = crearSnapshot({ ...reserva, fechaInicio: '2027-01-01', fechaFin: '2027-01-04', horaInicio: '12:00', horaFin: '19:00' } as Reserva, cliente, vehiculo, undefined, empresa);
    expect(snap.reserva.dias).toBe(4);
  });
});

describe('complementos en el contrato', () => {
  const extras = [
    { nombre: 'Sillita infantil', cantidad: 2, precio: 8, porDia: true, total: 64 },
    { nombre: 'Baca coche', cantidad: 1, precio: 50, porDia: false, total: 50 },
    { nombre: 'Portabicicletas', cantidad: 1, total: 37.5 },
  ];
  const conExtras = (idioma: IdiomaContrato) => texto(idioma, { reserva: { extras } as Partial<Reserva> });

  it('lista cada complemento con su importe: por día, precio fijo y los de la web (sin desglose)', () => {
    const t = conExtras('es');
    expect(t).toContain('Sillita infantil × 2 (8,00 € / día): 64,00 €');
    expect(t).toContain('Baca coche (50,00 €, precio fijo): 50,00 €');
    expect(t).toContain('Portabicicletas: 37,50 €');
  });

  it('en inglés traduce el tipo de precio', () => {
    const t = conExtras('en');
    expect(t).toContain('Child seat × 2 (8.00 € / day): 64.00 €');
    expect(t).toContain('Roof rack (50.00 €, fixed price): 50.00 €');
  });

  it('la línea va dentro del cuadro económico, antes del importe neto', () => {
    const t = conExtras('es');
    expect(t.indexOf('Baca coche')).toBeLessThan(t.indexOf('IMPORTE FACTURADO NETO'));
    // La fianza es un depósito aparte: va DESPUÉS del importe neto, no entre las líneas que lo forman.
    expect(t.indexOf('Fianza')).toBeGreaterThan(t.indexOf('IMPORTE FACTURADO NETO'));
  });

  it('quita el precio que la web pone en el nombre', () => {
    const t = texto('es', { reserva: { extras: [{ nombre: 'Maxi-Cosi - 8€/día', cantidad: 1, total: 64 }] } as Partial<Reserva> });
    expect(t).toContain('Maxi-Cosi: 64,00 €');
    expect(t).not.toContain('8€/día');
  });

  it('sin complementos no aparece ninguna línea extra', () => {
    expect(renderToString(<ContratoAlquiler reserva={reserva} cliente={cliente} vehiculo={vehiculo} empresa={empresa} idioma="es" />)).not.toContain('complemento-contrato');
  });

  it('la copia firmada guarda los complementos, y no añade el campo si no hay', () => {
    const con = crearSnapshot({ ...reserva, extras } as Reserva, cliente, vehiculo, undefined, empresa);
    expect(con.reserva.extras).toEqual(extras);
    expect(JSON.parse(JSON.stringify(con))).toEqual(con);
    expect('extras' in crearSnapshot(reserva, cliente, vehiculo, undefined, empresa).reserva).toBe(false);
  });
});

describe('desglose económico del contrato: cada línea a su precio, el descuento aparte', () => {
  // Pedido real 2178 de la web: 3 días, cupón de 10 € repartido por WooCommerce; aquí cada línea a su precio de lista.
  const pedido = {
    fechaInicio: '2026-10-29', fechaFin: '2026-11-01', horaInicio: '04:00', horaFin: '04:00',
    tarifaDiaria: 40, seguroDia: 15, incluyeSeguroTodoRiesgo: true, totalCobrado: 219, fianza: 500,
    extras: [{ nombre: 'Sillita infantil - 8€/día', cantidad: 1, total: 24 }, { nombre: 'Portabicicletas', cantidad: 1, total: 40 }],
    descuento: 10, cupon: '10mallorca',
  } as Partial<Reserva>;

  it('el portabicicletas sale a 40 € y el cupón de 10 € aparte, y todo suma el importe neto', () => {
    const t = texto('es', { reserva: pedido });
    expect(t).toContain('Alquiler (3 días × 40,00 €): 120,00 €');
    expect(t).toContain('Seguro Técnico Completo (3 días × 15,00 €): 45,00 €');
    expect(t).toContain('Sillita infantil: 24,00 €');
    expect(t).toContain('Portabicicletas: 40,00 €');
    expect(t).toContain('Descuento (cupón 10mallorca): −10,00 €');
    expect(t).toContain('IMPORTE FACTURADO NETO: 219,00 €');
    expect(t).not.toContain('37.50');
    expect(120 + 45 + 24 + 40 - 10).toBe(219);
  });

  it('en inglés, mismas líneas traducidas', () => {
    const t = texto('en', { reserva: pedido });
    expect(t).toContain('Rental (3 days × 40.00 €): 120.00 €');
    expect(t).toContain('Comprehensive insurance (3 days × 15.00 €): 45.00 €');
    expect(t).toContain('Discount (coupon 10mallorca): −10.00 €');
    expect(t).toContain('NET INVOICED AMOUNT: 219.00 €');
    expect(t).toContain('Deposit (refundable, not included in the amount): 500.00 €');
  });

  it('un descuento sin código de cupón se llama solo «Descuento»', () => {
    const t = texto('es', { reserva: { ...pedido, descuento: 18, cupon: undefined, totalCobrado: 211, extras: [], tarifaDiaria: 40 } as Partial<Reserva> });
    expect(t).toContain('Descuento: −18,00 €');
    expect(t).not.toContain('cupón');
  });

  it('las líneas van en orden y la fianza, aparte y después del importe', () => {
    const t = texto('es', { reserva: pedido });
    const orden = ['Alquiler (', 'Seguro Técnico Completo (', 'Sillita infantil', 'Portabicicletas', 'Descuento (', 'IMPORTE FACTURADO NETO', 'Fianza (depósito'].map(x => t.indexOf(x));
    expect(orden.every(i => i >= 0)).toBe(true);
    expect([...orden].sort((a, b) => a - b)).toEqual(orden);
  });

  it('si el total guardado no sale de la cuenta, el contrato lo enseña como «Otros ajustes» en vez de esconderlo', () => {
    const t = texto('es', { reserva: { ...pedido, totalCobrado: 200 } as Partial<Reserva> });
    expect(t).toContain('Otros ajustes: −19,00 €');
  });

  it('sin fianza no sale la línea de fianza', () => {
    expect(texto('es', { reserva: { ...pedido, fianza: 0 } as Partial<Reserva> })).not.toContain('Fianza');
  });
});

describe('contrato con alquiler a precio cerrado', () => {
  const cerrado = {
    fechaInicio: '2026-10-29', fechaFin: '2026-11-01', horaInicio: '04:00', horaFin: '04:00',
    tarifaDiaria: 33.33, precioFijo: 100, seguroDia: 15, incluyeSeguroTodoRiesgo: true, totalCobrado: 145, fianza: 500,
  } as Partial<Reserva>;

  it('en español: una línea de precio pactado, sin días × tarifa ni redondeos', () => {
    const t = texto('es', { reserva: cerrado });
    expect(t).toContain('Alquiler (3 días, precio pactado): 100,00 €');
    expect(t).toContain('Seguro Técnico Completo (3 días × 15,00 €): 45,00 €');
    expect(t).toContain('IMPORTE FACTURADO NETO: 145,00 €');
    expect(t).not.toContain('33,33');
    expect(t).not.toContain('Redondeo');
    expect(t).not.toContain('Otros ajustes');
  });

  it('en inglés', () => {
    const t = texto('en', { reserva: cerrado });
    expect(t).toContain('Rental (3 days, agreed price): 100.00 €');
    expect(t).toContain('NET INVOICED AMOUNT: 145.00 €');
  });
});

describe('contrato en inglés: todo en inglés', () => {
  // Datos como los de 2M: cliente británico, país en español, complementos de la web con su nombre español,
  // lugares y aseguradora tal como están guardados.
  const britanico = {
    ...cliente, nombre: 'John', apellidos: 'Smith', pais: 'Reino Unido', ciudad: 'London', direccion: '10 Downing Street',
    segundoConductor: { nombre: 'Mary Smith', dni: 'AB123456C', permiso: 'SMITH701234M99XY' },
  } as Cliente;
  const vehiculoMutua = { ...vehiculo, aseguradora: 'Mutua (actualmente de baja)' } as Vehiculo;
  const completa: Partial<Reserva> = {
    lugarRecogida: 'Aeropuerto, Palma de Mallorca', lugarDevolucion: 'Cami de son Gotleu, 8 bajos, 07008',
    tarifaDiaria: 40, fechaInicio: '2026-10-29', fechaFin: '2026-11-01', horaInicio: '04:00', horaFin: '04:00',
    totalCobrado: 308, incluyeSeguroTodoRiesgo: true, seguroDia: 15, descuento: 10, cupon: '10mallorca',
    extras: [
      { nombre: 'Sillita infantil', cantidad: 2, precio: 8, porDia: true, total: 48 },
      { nombre: 'Baca coche', cantidad: 1, precio: 50, porDia: false, total: 50 },
      { nombre: 'Portabicicletas', cantidad: 1, total: 40 },
      { nombre: 'Asiento elevador de respaldo alto - 8€/día', cantidad: 1, total: 24 },
      { nombre: 'Maxi-Cosi', cantidad: 1, total: 24 },
    ],
  };
  const en = texto('en', { cliente: britanico, vehiculo: vehiculoMutua, reserva: completa, solicitud: { referenciaExterna: '2178', lugarRecogida: '', lugarDevolucion: '' } as SolicitudReserva });

  // Palabras que solo existen en español (se evitan las que también son inglés: no, a, me…).
  // Los nombres propios («Palma de Mallorca», «Camí de Son Gotleu») se quitan antes de mirar.
  const ESPANOL = /\b(contrato|alquiler|veh[ií]culo|firma|fianza|seguro|conductor|cliente|tel[eé]fono|domicilio|aeropuerto|bajos|espa[ñn]a|reino unido|p[oó]liza|sillita|baca|portabicicletas|asiento|elevador|informado|n[uú]mero|fecha|lugar|entrega|devoluci[oó]n|retorno|importe|descuento|cup[oó]n|ajustes|redondeo|permiso|carnet|matr[ií]cula|bastidor|transmisi[oó]n|aseguradora|kilometraje|d[ií]as?|jornadas|naturales|dep[oó]sito|reembolsable|arrendador|arrendatario|sede|fiscal|actualmente|baja|completo|t[eé]cnico|terceros|b[aá]sica|incluid[oa]|declaro|le[ií]do|condiciones|pagos?|tarjeta|efectivo|mediante|desde|hasta|reserva|pedido)\b/i;
  const sinPropios = (t: string) => t.replace(/Palma de Mallorca|Cam[ií] de Son Gotleu|Cami de son Gotleu|Two M Rent a Car SL|Illes Balears/gi, ' ');

  it('no queda ninguna palabra en español en todo el contrato', () => {
    const encontradas = (sinPropios(en).match(new RegExp(ESPANOL.source, 'gi')) ?? []);
    expect(encontradas).toEqual([]);
  });

  it('el país, los complementos, los lugares y la aseguradora salen traducidos', () => {
    expect(en).toContain('London · United Kingdom');
    expect(en).toContain('Palma (Illes Balears) · Spain');
    expect(en).toContain('Child seat × 2 (8.00 € / day): 48.00 €');
    expect(en).toContain('Roof rack (50.00 €, fixed price): 50.00 €');
    expect(en).toContain('Bike rack: 40.00 €');
    expect(en).toContain('High-back booster seat: 24.00 €');
    expect(en).toContain('Maxi-Cosi: 24.00 €');
    expect(en).toContain('Pick-up location: Airport, Palma de Mallorca');
    expect(en).toContain('Return location: Cami de son Gotleu, 8 (ground floor), 07008');
    expect(en).toContain('Registered office: Camí de Son Gotleu, 8 (ground floor)');
    expect(en).toContain('Insurer Mutua (currently inactive)');
  });

  it('el contrato en español no cambia: país, complementos y lugares como están guardados', () => {
    const es = texto('es', { cliente: britanico, vehiculo: vehiculoMutua, reserva: completa });
    expect(es).toContain('London · Reino Unido');
    expect(es).toContain('Sillita infantil × 2');
    expect(es).toContain('Baca coche');
    expect(es).toContain('Lugar de entrega: Aeropuerto, Palma de Mallorca');
    expect(es).toContain('8 bajos');
    expect(es).toContain('Mutua (actualmente de baja)');
  });
});

describe('segundo conductor en el contrato', () => {
  const conSegundo = { ...cliente, segundoConductor: { nombre: 'Luis Gil', dni: '87654321X', permiso: 'B-1234567' } } as Cliente;

  it('en español: nombre, documento y permiso del segundo conductor', () => {
    const t = texto('es', { cliente: conSegundo });
    expect(t).toContain('Segundo conductor: Luis Gil');
    expect(t).toContain('DNI/NIF/NIE: 87654321X');
    expect(t).toContain('Carnet de conducir: B-1234567');
  });

  it('en inglés: Additional driver, ID y driving licence', () => {
    const t = texto('en', { cliente: conSegundo });
    expect(t).toContain('Additional driver: Luis Gil');
    expect(t).toContain('ID / NIF / NIE / Passport: 87654321X');
    expect(t).toContain('Driving licence: B-1234567');
  });

  it('sin segundo conductor (o con null) no aparece nada', () => {
    expect(texto('es')).not.toContain('Segundo conductor');
    expect(texto('en', { cliente: { ...cliente, segundoConductor: null } as Cliente })).not.toContain('Additional driver');
  });

  it('la copia firmada lo guarda, y añadirlo o cambiarlo después de firmar se detecta', () => {
    const firmado = crearSnapshot(reserva, conSegundo, vehiculo, undefined, empresa);
    expect(firmado.cliente?.segundoConductor).toEqual({ nombre: 'Luis Gil', dni: '87654321X', permiso: 'B-1234567' });
    expect(cambiosTrasFirma(firmado, reserva, undefined, conSegundo)).toEqual([]);
    expect(cambiosTrasFirma(firmado, reserva, undefined, { segundoConductor: { nombre: 'Otro', dni: '1', permiso: '2' } })).toContain('el segundo conductor');
    expect(cambiosTrasFirma(firmado, reserva, undefined, { segundoConductor: null })).toContain('el segundo conductor');
    // un contrato firmado sin segundo conductor y un cliente que sigue sin él: sin cambios; con uno nuevo, sí
    const sin = crearSnapshot(reserva, cliente, vehiculo, undefined, empresa);
    expect('segundoConductor' in (sin.cliente ?? {}) && sin.cliente?.segundoConductor !== undefined).toBe(false);
    expect(cambiosTrasFirma(sin, reserva, undefined, { segundoConductor: null })).toEqual([]);
    expect(cambiosTrasFirma(sin, reserva, undefined, conSegundo)).toContain('el segundo conductor');
    // sin pasar el cliente no se compara (comportamiento anterior)
    expect(cambiosTrasFirma(sin, reserva)).toEqual([]);
  });
});

describe('pantalla de firma y mensaje en inglés', () => {
  const ESPANOL = /\b(contrato|firma|firme|dedo|borrar|guardar|guardando|cancelar|conexi[oó]n|int[eé]ntelo|revise|marque|casilla|recuadro|acepto|condiciones|le[ií]do|hola|saludo|enviamos|alquiler|veh[ií]culo|desde|hasta|d[ií]as)\b/i;

  it('el cliente que firma en inglés ve la pantalla de firma entera en inglés', () => {
    const h = renderToString(<FirmaPantalla contrato={crearSnapshot(reserva, cliente, vehiculo, undefined, empresa)} idiomaInicial="en" onConfirmar={async () => undefined} onCancelar={() => undefined} />).replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ');
    expect(h).toContain('Contract signature');
    expect(h.match(new RegExp(ESPANOL.source, 'gi')) ?? []).toEqual([]);
  });

  it('el mensaje que acompaña al contrato en inglés está en inglés', () => {
    const m = TEXTOS_CONTRATO.en.mensaje({ nombre: 'John', vehiculo: 'Seat Ibiza', matricula: '1234ABC', desde: '1 Nov 2026', hasta: '5 Nov 2026', dias: 4, total: '180.00', empresa: '2M Rent a Car' });
    expect(m.match(new RegExp(ESPANOL.source, 'gi')) ?? []).toEqual([]);
    expect(m).toContain('Hello John');
  });
});
