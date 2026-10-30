import type { Vehiculo } from '../types';

/** Idiomas en los que se puede ver, imprimir y enviar el contrato. */
export type IdiomaContrato = 'es' | 'en';

export const IDIOMAS_CONTRATO: { id: IdiomaContrato; etiqueta: string }[] = [
  { id: 'es', etiqueta: 'Español' },
  { id: 'en', etiqueta: 'English' },
];

/**
 * Declaración final que firma el cliente. Los dos textos los facilitó el cliente (2M) y se usan
 * tal cual: no se retocan sin que ellos lo pidan.
 */
export const DECLARACION_ES =
  'Declaro haber leído las condiciones descritas anteriormente, así como las Condiciones que recibo por separado y declaro que acepto los términos y condiciones de las mismas. ' +
  'Si el pago de este alquiler se realiza mediante tarjeta bancaria o efectivo, mi firma confirma y acepta los pagos realizados mediante la tarjeta anotada.';

export const DECLARACION_EN =
  'I declare that I have read the conditions described above, as well as the Conditions that I receive separately and declare that I accept their terms and conditions. ' +
  'If the payment of this rent is made by bank card or cash, my signature confirms and accepts payments made on the card added to the contract.';

/** Todos los textos fijos del contrato. Si falta uno en un idioma, el código no compila. */
export interface TextosContrato {
  /** Configuración regional para fechas y números. */
  locale: string;
  titulo: string;
  numero: string;
  ciudadExpedicion: string;
  fechaFirma: string;
  // 1. Arrendador
  s1: string;
  nif: (nif: string) => string;
  sedeFiscal: string;
  telefonoCentral: string;
  // 2. Arrendatario
  s2: string;
  documento: string;
  carnet: string;
  noInformado: string;
  email: string;
  telefono: string;
  domicilio: string;
  fichaNoDisponible: string;
  carnetPalabras: { expedido: string; vence: string };
  // 3. Vehículo
  s3: string;
  marcaModelo: string;
  matricula: string;
  bastidor: string;
  transmision: string;
  aseguradora: string;
  kmEntrada: string;
  vehiculoDesasociado: string;
  transmisiones: { manual: string; automatico: string; sinDato: string };
  // 4. Plazos
  s4: string;
  fechaHoraEntrega: string;
  fechaHoraRetorno: string;
  lugarEntrega: string;
  lugarDevolucion: string;
  reservaWeb: string;
  jornadas: string;
  diasNaturales: (n: number) => string;
  retraso: string;
  // 5. Tarifas
  s5: string;
  precioBase: string;
  porDia: string;
  seguroCompleto: string;
  incluido: string;
  polizaTerceros: string;
  fianza: string;
  importeNeto: string;
  // Final
  declaracion: string;
  /** Título de la caja de firma de la empresa y de la del conductor (se muestra en mayúsculas). */
  firmaArrendador: (empresa: string) => string;
  firmaConductor: string;
  /** Línea bajo la firma del cliente: «Firmado electrónicamente el 30 oct. 2026 14:05 · Ref. 1A2B3C4D». */
  firmadoElectronicamente: (fecha: string, ref: string) => string;
  /** Textos de la pantalla donde el cliente firma. */
  pantallaFirma: {
    titulo: string;
    instruccion: string;
    aceptar: string;
    firmeAqui: string;
    borrar: string;
    confirmar: string;
    guardando: string;
    cancelar: string;
    errorGuardar: string;
    firmaCorta: string;
  };
  // Mensaje que acompaña al contrato
  asuntoCorreo: (empresa: string) => string;
  mensaje: (d: { nombre: string; vehiculo: string; matricula: string; desde: string; hasta: string; dias: number; total: string; empresa: string }) => string;
}

const ES: TextosContrato = {
  locale: 'es-ES',
  titulo: 'Contrato de Alquiler de Vehículo',
  numero: 'CONTRATO NÚMERO',
  ciudadExpedicion: 'Ciudad de expedición',
  fechaFirma: 'Fecha de firma',
  s1: '1. DATOS DEL ARRENDADOR',
  nif: nif => `NIF: ${nif} • CIF de Operaciones`,
  sedeFiscal: 'Sede Fiscal',
  telefonoCentral: 'Teléfono central',
  s2: '2. DATOS DEL ARRENDATARIO (CLIENTE)',
  documento: 'DNI/NIF/NIE',
  carnet: 'Carnet de conducir',
  noInformado: 'No informado',
  email: 'Email',
  telefono: 'Teléfono',
  domicilio: 'Domicilio',
  fichaNoDisponible: 'Ficha del cliente no disponible en el CRM.',
  carnetPalabras: { expedido: 'expedido', vence: 'vence' },
  s3: '3. DESCRIPCIÓN DEL VEHÍCULO DE FLOTA',
  marcaModelo: 'Marca y Modelo',
  matricula: 'Matrícula Nacional',
  bastidor: 'Nº de Bastidor',
  transmision: 'Transmisión',
  aseguradora: 'Aseguradora',
  kmEntrada: 'Kilometraje Entrada',
  vehiculoDesasociado: 'Vehículo desasociado de la flota.',
  transmisiones: { manual: 'Manual', automatico: 'Automático', sinDato: '—' },
  s4: '4. VIGENCIA Y PLAZOS',
  fechaHoraEntrega: 'Fecha y hora de entrega',
  fechaHoraRetorno: 'Fecha y hora acordadas de retorno',
  lugarEntrega: 'Lugar de entrega',
  lugarDevolucion: 'Lugar de devolución',
  reservaWeb: 'Reserva web nº',
  jornadas: 'Número total de jornadas',
  diasNaturales: n => `${n} días naturales`,
  retraso: 'El retraso superior a 59 minutos en la devolución facultará el cobro de un día adicional con penalización.',
  s5: '5. LIQUIDACIÓN DE TARIFAS (I.V.A. INCLUIDO)',
  precioBase: 'Precio unitario base',
  porDia: '€ / día',
  seguroCompleto: 'Seguro Técnico Completo',
  incluido: 'Incluido',
  polizaTerceros: 'Póliza Terceros Básica',
  fianza: 'Fianza (depósito reembolsable)',
  importeNeto: 'IMPORTE FACTURADO NETO',
  declaracion: DECLARACION_ES,
  firmaArrendador: empresa => `Firma arrendador (${empresa})`,
  firmaConductor: 'Firma conductor',
  firmadoElectronicamente: (fecha, ref) => `Firmado electrónicamente el ${fecha} · Ref. ${ref}`,
  pantallaFirma: {
    titulo: 'Firma del contrato',
    instruccion: 'Revise el contrato, marque la casilla y firme con el dedo en el recuadro.',
    aceptar: 'He leído el contrato y acepto sus condiciones',
    firmeAqui: 'Firme aquí con el dedo',
    borrar: 'Borrar',
    confirmar: 'Firmar y guardar',
    guardando: 'Guardando…',
    cancelar: 'Cancelar',
    errorGuardar: 'No se pudo guardar la firma. Compruebe la conexión e inténtelo de nuevo.',
    firmaCorta: 'La firma es demasiado corta. Bórrela y firme de nuevo.',
  },
  asuntoCorreo: empresa => `Contrato de Alquiler - ${empresa}`,
  mensaje: d =>
    `Hola ${d.nombre},\n\nLe enviamos los datos del contrato de alquiler del vehículo ${d.vehiculo} (${d.matricula}) desde el ${d.desde} hasta el ${d.hasta} (${d.dias} días). Total: ${d.total} €.\n\nUn saludo,\n${d.empresa}`,
};

const EN: TextosContrato = {
  locale: 'en-GB',
  titulo: 'Vehicle Rental Agreement',
  numero: 'CONTRACT NUMBER',
  ciudadExpedicion: 'City of issue',
  fechaFirma: 'Date of signing',
  s1: '1. LESSOR DETAILS',
  nif: nif => `Tax ID (NIF/CIF): ${nif}`,
  sedeFiscal: 'Registered office',
  telefonoCentral: 'Main phone',
  s2: '2. LESSEE (CUSTOMER) DETAILS',
  documento: 'ID / NIF / NIE / Passport',
  carnet: 'Driving licence',
  noInformado: 'Not provided',
  email: 'Email',
  telefono: 'Phone',
  domicilio: 'Address',
  fichaNoDisponible: 'Customer record not available in the CRM.',
  carnetPalabras: { expedido: 'issued', vence: 'expires' },
  s3: '3. FLEET VEHICLE DESCRIPTION',
  marcaModelo: 'Make and model',
  matricula: 'Registration plate',
  bastidor: 'Chassis (VIN) no.',
  transmision: 'Transmission',
  aseguradora: 'Insurer',
  kmEntrada: 'Mileage at pick-up',
  vehiculoDesasociado: 'Vehicle no longer in the fleet.',
  transmisiones: { manual: 'Manual', automatico: 'Automatic', sinDato: '—' },
  s4: '4. TERM AND SCHEDULE',
  fechaHoraEntrega: 'Pick-up date and time',
  fechaHoraRetorno: 'Agreed return date and time',
  lugarEntrega: 'Pick-up location',
  lugarDevolucion: 'Return location',
  reservaWeb: 'Web booking no.',
  jornadas: 'Total number of rental days',
  diasNaturales: n => `${n} calendar days`,
  retraso: 'A delay of more than 59 minutes in returning the vehicle entitles the Lessor to charge an additional day with a penalty.',
  s5: '5. RATES AND CHARGES (VAT INCLUDED)',
  precioBase: 'Base unit price',
  porDia: '€ / day',
  seguroCompleto: 'Comprehensive insurance',
  incluido: 'Included',
  polizaTerceros: 'Basic third-party policy',
  fianza: 'Deposit (refundable)',
  importeNeto: 'NET INVOICED AMOUNT',
  declaracion: DECLARACION_EN,
  firmaArrendador: empresa => `Lessor's signature (${empresa})`,
  firmaConductor: "Driver's signature",
  firmadoElectronicamente: (fecha, ref) => `Electronically signed on ${fecha} · Ref. ${ref}`,
  pantallaFirma: {
    titulo: 'Contract signature',
    instruccion: 'Please review the agreement, tick the box and sign with your finger in the box.',
    aceptar: 'I have read the agreement and accept its terms',
    firmeAqui: 'Sign here with your finger',
    borrar: 'Clear',
    confirmar: 'Sign and save',
    guardando: 'Saving…',
    cancelar: 'Cancel',
    errorGuardar: 'The signature could not be saved. Check the connection and try again.',
    firmaCorta: 'The signature is too short. Clear it and sign again.',
  },
  asuntoCorreo: empresa => `Rental Agreement - ${empresa}`,
  mensaje: d =>
    `Hello ${d.nombre},\n\nHere are the details of the rental agreement for the vehicle ${d.vehiculo} (${d.matricula}) from ${d.desde} to ${d.hasta} (${d.dias} days). Total: ${d.total} €.\n\nKind regards,\n${d.empresa}`,
};

export const TEXTOS_CONTRATO: Record<IdiomaContrato, TextosContrato> = { es: ES, en: EN };

/** Etiqueta del cambio (manual o automático) en el idioma del contrato. */
export function etiquetaTransmisionContrato(t: Vehiculo['transmision'], tx: TextosContrato): string {
  return t === 'automatico' ? tx.transmisiones.automatico : t === 'manual' ? tx.transmisiones.manual : tx.transmisiones.sinDato;
}
