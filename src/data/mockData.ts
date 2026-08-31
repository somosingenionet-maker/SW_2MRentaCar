import { Vehiculo, Intervencion, Cliente, Reserva, Alerta, NotificacionCliente, Factura } from '../types';

export const INITIAL_VEHICULES: Vehiculo[] = [
  {
    id: 'veh-1',
    marca: 'Toyota',
    modelo: 'Auris Hybrid',
    anio: 2019,
    color: 'Blanco',
    combustible: 'hibrido',
    matricula: '2840-KPT',
    bastidor: 'SB1ZA3JE40E819385',
    kilometraje: 142500,
    itvVencimiento: '2026-07-15',
    seguroVencimiento: '2026-10-10',
    impuestoVencimiento: '2027-05-20',
    fechaRegistro: '2022-03-12',
    esFlotaAlquiler: true,
    tarifasAlquiler: { temporadaAlta: 55, temporadaMedia: 45, temporadaBaja: 35 }
  },
  {
    id: 'veh-2',
    marca: 'Seat',
    modelo: 'León TSI',
    anio: 2021,
    color: 'Gris',
    combustible: 'gasolina',
    matricula: '8912-LMN',
    bastidor: 'VSSZZZ5FZHR041920',
    kilometraje: 95400,
    itvVencimiento: '2026-06-25',
    seguroVencimiento: '2026-06-18',
    impuestoVencimiento: '2027-05-20',
    fechaRegistro: '2023-01-15',
    esFlotaAlquiler: true,
    tarifasAlquiler: { temporadaAlta: 60, temporadaMedia: 50, temporadaBaja: 40 }
  },
  {
    id: 'veh-3',
    marca: 'Peugeot',
    modelo: '3008 BlueHDi',
    anio: 2018,
    color: 'Negro',
    combustible: 'diesel',
    matricula: '5531-KXT',
    bastidor: 'VF3JRHNYHHS592183',
    kilometraje: 188300,
    itvVencimiento: '2026-12-05',
    seguroVencimiento: '2026-09-01',
    impuestoVencimiento: '2027-05-20',
    fechaRegistro: '2021-08-04',
    esFlotaAlquiler: true,
    tarifasAlquiler: { temporadaAlta: 65, temporadaMedia: 55, temporadaBaja: 45 }
  },
  {
    id: 'veh-4',
    marca: 'Volkswagen',
    modelo: 'Golf TDI',
    anio: 2017,
    color: 'Azul',
    combustible: 'diesel',
    matricula: '4410-JVZ',
    bastidor: 'WVWZZZAUZGW289410',
    kilometraje: 119800,
    itvVencimiento: '2027-02-14',
    seguroVencimiento: '2026-11-15',
    impuestoVencimiento: '2027-05-20',
    fechaRegistro: '2020-11-20'
  },
  {
    id: 'veh-5',
    marca: 'BMW',
    modelo: 'Serie 3 320d',
    anio: 2022,
    color: 'Plata',
    combustible: 'diesel',
    matricula: '0123-MBL',
    bastidor: 'WBA8C51040A591280',
    kilometraje: 62000,
    itvVencimiento: '2028-04-10',
    seguroVencimiento: '2026-07-30',
    impuestoVencimiento: '2027-05-20',
    fechaRegistro: '2024-04-10',
    esFlotaAlquiler: true,
    tarifasAlquiler: { temporadaAlta: 85, temporadaMedia: 75, temporadaBaja: 60 }
  }
];

export const INITIAL_INTERVENCIONES: Intervencion[] = [
  {
    id: 'int-1',
    vehiculoId: 'veh-1',
    tipo: 'preventivo',
    descripcion: 'Mantenimiento periódico: Aceite 5W30, filtro de aceite y filtro de habitáculo.',
    tallerRealizador: 'Taller Central inGenio',
    costo: 185.00,
    kilometrajeEnIntervencion: 135000,
    fechaIntervencion: '2025-10-05',
    notas: 'Todo correcto. Próximo cambio recomendado a los 150.000 kms o en Octubre 2026.'
  },
  {
    id: 'int-2',
    vehiculoId: 'veh-1',
    tipo: 'reparacion',
    descripcion: 'Sustitución de pastillas de freno delanteras y rectificado de discos.',
    tallerRealizador: 'Frenos Seguros S.L.',
    costo: 240.00,
    kilometrajeEnIntervencion: 138200,
    fechaIntervencion: '2026-01-20',
    notas: 'Pastillas marca Brembo. Se verificó desgaste de las traseras (vida útil aproximada restante: 15.000 km).'
  },
  {
    id: 'int-3',
    vehiculoId: 'veh-2',
    tipo: 'preventivo',
    descripcion: 'Cambio de neumáticos delanteros Michelin Primacy 4 y alineado de dirección.',
    tallerRealizador: 'Neumáticos del Sur',
    costo: 310.00,
    kilometrajeEnIntervencion: 92100,
    fechaIntervencion: '2026-03-12',
    notas: 'Neumáticos traseros al 60% de vida útil.'
  },
  {
    id: 'int-4',
    vehiculoId: 'veh-3',
    tipo: 'reparacion',
    descripcion: 'Cambio de válvula EGR por fallo en cuadro de mandos (P0401) y limpieza del colector de admisión.',
    tallerRealizador: 'Taller Central inGenio',
    costo: 480.00,
    kilometrajeEnIntervencion: 184500,
    fechaIntervencion: '2026-04-02',
    notas: 'Solucionado piloto de avería de motor. Comportamiento en carretera testeado satisfactoriamente.'
  },
  {
    id: 'int-5',
    vehiculoId: 'veh-3',
    tipo: 'preventivo',
    descripcion: 'Kit de distribución completo, bomba de agua y anticongelante.',
    tallerRealizador: 'Taller Central inGenio',
    costo: 650.00,
    kilometrajeEnIntervencion: 175000,
    fechaIntervencion: '2025-06-15',
    notas: 'Mantenimiento preventivo por kilometraje del fabricante de 10 años / 180.000 km.'
  },
  {
    id: 'int-6',
    vehiculoId: 'veh-4',
    tipo: 'reparacion',
    descripcion: 'Sustitución de batería de arranque (Varta E39 AGM 70Ah).',
    tallerRealizador: 'Taller Central inGenio',
    costo: 195.00,
    kilometrajeEnIntervencion: 114000,
    fechaIntervencion: '2025-12-18',
    notas: 'Fallo de arranque inicial por baja tensión con clima invernal.'
  }
];

export const INITIAL_CLIENTES: Cliente[] = [
  {
    id: 'cli-1',
    nombre: 'Alejandro',
    apellidos: 'Gómez Ruiz',
    nifNiePasaporte: '45123987M',
    correo: 'alejandro.gomez@gmail.com',
    telefono: '+34 611 223 344',
    direccion: 'Calle Mayor 45, 2ºA, Madrid',
    interacciones: [
      { id: 'int-cli-1-1', fecha: '2026-05-10', tipo: 'llamada', notas: 'Pregunta tarifas para alquiler de vehículo familiar en julio.' },
      { id: 'int-cli-1-2', fecha: '2026-05-12', tipo: 'registro_contrato', notas: 'Firmó contrato de alquiler para el Toyota Auris (veh-1).' }
    ],
    fechaRegistro: '2024-02-10'
  },
  {
    id: 'cli-2',
    nombre: 'María Pilar',
    apellidos: 'Sánchez Ortiz',
    nifNiePasaporte: '02894156X',
    correo: 'pilar.sanchez.cortes@outlook.com',
    telefono: '+34 655 443 322',
    direccion: 'Avenida de la Constitución 12, Sevilla',
    interacciones: [
      { id: 'int-cli-2-1', fecha: '2026-04-18', tipo: 'visita', notas: 'Usuario habitual. Solicita presupuesto de renting a largo plazo.' },
      { id: 'int-cli-2-2', fecha: '2026-06-01', tipo: 'whatsapp', notas: 'Consulta si el Seat León (veh-2) está disponible libre de avería.' }
    ],
    fechaRegistro: '2023-11-05'
  },
  {
    id: 'cli-3',
    nombre: 'Carlos',
    apellidos: 'Benítez Varga',
    nifNiePasaporte: 'Y1284562P',
    correo: 'carlos.benitez@ingenio.es',
    telefono: '+34 688 991 122',
    direccion: 'Paseo de Gracia 89, Barcelona',
    interacciones: [
      { id: 'int-cli-3-1', fecha: '2026-05-20', tipo: 'email', notas: 'Reportó leve ruido metálico en Peugeot 3008 tras entrega. Se agendó revisión.' }
    ],
    fechaRegistro: '2025-01-20'
  },
  {
    id: 'cli-4',
    nombre: 'Lucía',
    apellidos: 'Fernández Cobo',
    nifNiePasaporte: '71924158W',
    correo: 'lucia.fc@gmail.com',
    telefono: '+34 600 112 233',
    direccion: 'Calle Alcalá 120, Madrid',
    interacciones: [
      { id: 'int-cli-4-1', fecha: '2026-06-05', tipo: 'llamada', notas: 'Nueva cliente. Reserva confirmada para el BMW Serie 3.' }
    ],
    fechaRegistro: '2026-06-05'
  }
];

export const INITIAL_RESERVAS: Reserva[] = [];

export const INITIAL_ALERTAS: Alerta[] = [
  {
    id: 'al-1',
    vehiculoId: 'veh-2',
    tipo: 'itv',
    descripcion: 'Inspección Técnica de Vehículo (ITV) vence el 2026-06-25.',
    estado: 'activa',
    fechaLimite: '2026-06-25'
  },
  {
    id: 'al-2',
    vehiculoId: 'veh-2',
    tipo: 'seguro',
    descripcion: 'Póliza de seguro a todo riesgo de Mapfre vence el 2026-06-18.',
    estado: 'activa',
    fechaLimite: '2026-06-18'
  },
  {
    id: 'al-3',
    vehiculoId: 'veh-4',
    tipo: 'mantenimiento',
    descripcion: 'Cambio de aceite de motor y filtros recomendado a los 120.000 kms (kilometraje actual: 119.800 km).',
    estado: 'activa',
    kilometrajeLimite: 120000
  },
  {
    id: 'al-4',
    vehiculoId: 'veh-1',
    tipo: 'itv',
    descripcion: 'ITV del vehículo vence pronto el 2026-07-15.',
    estado: 'pendiente',
    fechaLimite: '2026-07-15'
  }
];

export const INITIAL_NOTIFICACIONES: NotificacionCliente[] = [
  {
    id: 'not-1',
    clienteId: 'cli-1',
    vehiculoId: 'veh-1',
    tipoEnvio: 'email',
    asunto: 'Confirmación de Reserva de Vehículo 2840-KPT',
    mensaje: 'Hola Alejandro Gómez Ruiz, su reserva del Toyota Auris para las fechas 2026-05-15 al 2026-05-22 ha sido confirmada con éxito. Tarifa registrada: 45.00 €/día. ¡Gracias por confiar en inGenio!',
    fechaEnvio: '2026-05-12 10:30',
    leido: true,
    tipoEvento: 'reserva_confirmada'
  },
  {
    id: 'not-2',
    clienteId: 'cli-2',
    vehiculoId: 'veh-2',
    tipoEnvio: 'whatsapp',
    mensaje: '⚙️ Recordatorio inGenio Flotas: Estimada María Pilar, le recordamos que tenemos programada una reserva del Seat León (8912-LMN) el 2026-06-10. El vehículo estará limpio y con combustible completo. Si tiene dudas use este canal.',
    fechaEnvio: '2026-06-05 14:15',
    leido: true,
    tipoEvento: 'reserva_confirmada'
  },
  {
    id: 'not-3',
    clienteId: 'cli-3',
    vehiculoId: 'veh-3',
    tipoEnvio: 'sms',
    mensaje: 'inGenio taller: Carlos, su vehiculo Peugeot 3008 (5531-KXT) ya tiene solucionado el problema del piloto motor tras cambiar la válvula EGR. Puede retirar el coche cuando desee. Coste final: 480.00 €.',
    fechaEnvio: '2026-04-02 18:00',
    leido: true,
    tipoEvento: 'reparacion_lista'
  }
];

// Acceso seguro a localStorage: devuelve el valor por defecto si la clave
// no existe o si el JSON almacenado está corrupto.
const getLocalStorageItem = <T>(key: string, defaultValue: T): T => {
  try {
    const item = localStorage.getItem(key);
    return item ? JSON.parse(item) : defaultValue;
  } catch (err) {
    console.error(`Error reading ${key} from localStorage`, err);
    return defaultValue;
  }
};

const setLocalStorageItem = <T>(key: string, value: T): void => {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (err) {
    console.error(`Error writing ${key} to localStorage`, err);
  }
};

export const getVehiculos = () => getLocalStorageItem<Vehiculo[]>('ingenio_vehiculos', INITIAL_VEHICULES);
export const saveVehiculos = (data: Vehiculo[]) => setLocalStorageItem('ingenio_vehiculos', data);

export const getIntervenciones = () => getLocalStorageItem<Intervencion[]>('ingenio_intervenciones', INITIAL_INTERVENCIONES);
export const saveIntervenciones = (data: Intervencion[]) => setLocalStorageItem('ingenio_intervenciones', data);

export const getClientes = () => getLocalStorageItem<Cliente[]>('ingenio_clientes', INITIAL_CLIENTES);
export const saveClientes = (data: Cliente[]) => setLocalStorageItem('ingenio_clientes', data);

export const getReservas = () => getLocalStorageItem<Reserva[]>('ingenio_reservas', INITIAL_RESERVAS);
export const saveReservas = (data: Reserva[]) => setLocalStorageItem('ingenio_reservas', data);

export const getAlertas = () => getLocalStorageItem<Alerta[]>('ingenio_alertas', INITIAL_ALERTAS);
export const saveAlertas = (data: Alerta[]) => setLocalStorageItem('ingenio_alertas', data);

export const getNotificaciones = () => getLocalStorageItem<NotificacionCliente[]>('ingenio_notificaciones', INITIAL_NOTIFICACIONES);
export const saveNotificaciones = (data: NotificacionCliente[]) => setLocalStorageItem('ingenio_notificaciones', data);


export interface EmpresaConfig {
  nombre: string;
  tagline: string;
  razonSocial: string;
  nif: string;
  direccionFiscal: string;
  correo: string;
  telefono: string;
  web: string;
  ciudad: string;
  pais: string;
  brandColor: string;
  logoBase64: string;
}

export const DEFAULT_EMPRESA_CONFIG: EmpresaConfig = {
  nombre: '2M Rent a Car',
  tagline: 'Alquiler de vehículos y taller mecánico',
  razonSocial: 'Two M Rent a Car SL',
  nif: 'B13712658',
  direccionFiscal: 'Camí de Son Gotleu, 8 bajos',
  correo: 'info@2mrentacar.es',
  telefono: '(+34) 633 47 48 87',
  web: 'www.2mrentacar.es',
  ciudad: 'Palma (Illes Balears)',
  pais: 'España',
  brandColor: '#C38DD6',
  logoBase64: '',
};

// Se hace spread con DEFAULT_EMPRESA_CONFIG para que configuraciones guardadas
// en versiones anteriores (sin los campos nuevos) reciban los valores por
// defecto en lugar de devolver `undefined`.
// Caché en memoria de la configuración de empresa. Se siembra desde
// localStorage/valores por defecto (acceso síncrono inmediato) y se actualiza
// con lo que llega de Supabase al arrancar (ver data/empresaDb.ts).
let empresaCache: EmpresaConfig = {
  ...DEFAULT_EMPRESA_CONFIG,
  ...getLocalStorageItem<Partial<EmpresaConfig>>('ingenio_empresa_config', DEFAULT_EMPRESA_CONFIG),
};

export const getEmpresaConfig = (): EmpresaConfig => empresaCache;

/** Actualiza la caché local (y localStorage como respaldo). No toca Supabase. */
export const setEmpresaConfigCache = (data: EmpresaConfig) => {
  empresaCache = { ...DEFAULT_EMPRESA_CONFIG, ...data };
  setLocalStorageItem('ingenio_empresa_config', empresaCache);
};

export const getFacturas = (): Factura[] =>
  getLocalStorageItem<Factura[]>('ingenio_facturas', []);

export const saveFacturas = (data: Factura[]) =>
  setLocalStorageItem('ingenio_facturas', data);

