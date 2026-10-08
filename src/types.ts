/** Tarifas por temporada para vehículos de flota de alquiler. */
export interface TarifasAlquiler {
  temporadaAlta: number;
  temporadaMedia: number;
  temporadaBaja: number;
}

export interface Vehiculo {
  id: string;
  marca: string;
  modelo: string;
  anio?: number;
  color?: string;
  combustible?: 'gasolina' | 'diesel' | 'hibrido' | 'electrico' | 'otro';
  matricula: string;
  bastidor: string;
  kilometraje: number;
  itvVencimiento: string;       // YYYY-MM-DD
  seguroVencimiento: string;    // YYYY-MM-DD
  impuestoVencimiento: string;  // YYYY-MM-DD
  fechaRegistro: string;
  /** Vehículo propio del taller para alquiler (módulo Rent-a-Car). */
  esFlotaAlquiler?: boolean;
  /** Tarifas de alquiler por temporada. Solo aplica si esFlotaAlquiler=true. */
  tarifasAlquiler?: TarifasAlquiler;
}

// ─── Órdenes de Trabajo ───────────────────────────────────────────────────────

export type OTEstado =
  | 'presupuesto'
  | 'recibido'
  | 'en_reparacion'
  | 'listo'
  | 'entregado'
  | 'cancelado';

export type LineaOTTipo = 'mano_de_obra' | 'producto';

export interface EventoOT {
  fecha: string;       // ISO timestamp
  descripcion: string; // Texto legible del evento
}

export interface LineaOT {
  id: string;
  tipo: LineaOTTipo;
  descripcion: string;
  cantidad: number;
  precioUnitario: number;
  /** Coste real para el taller. Usado en rentabilidad para calcular margen. */
  costoUnitario?: number;
  subtotal: number;
}

export interface OrdenTrabajo {
  id: string;
  numero: string;
  vehiculoId: string;
  clienteId: string;
  estado: OTEstado;
  fechaRecepcion: string;
  fechaEstimadaEntrega?: string;
  fechaEntrega?: string;
  kilometrajeEntrada: number;
  kilometrajeSalida?: number;
  /** Síntoma descrito por el cliente. */
  descripcionProblema: string;
  /** Diagnóstico del mecánico. */
  diagnostico?: string;
  tecnicoAsignado?: string;
  lineas: LineaOT[];
  subtotal: number;
  ivaPct: number;
  totalIva: number;
  total: number;
  notas?: string;
  /** Indica si el presupuesto ya fue enviado al cliente. */
  presupuestoEstado?: 'pendiente' | 'enviado';
  /** true cuando el presupuesto fue aprobado por el cliente: se salta el estado 'presupuesto' al recibir el vehículo. */
  presupuestoAprobado?: boolean;
  /** Marca que ya se notificó al cliente cuando el estado es 'listo'. */
  notificacionEnviada?: boolean;
  /** Timestamp ISO de la última modificación — usado para ordenar la lista. */
  fechaActualizacion: string;
  /** Registro cronológico de eventos de esta OT. */
  historial: EventoOT[];
  /** Factura generada desde esta OT. */
  facturaId?: string;
}

export interface InteraccionCliente {
  id: string;
  fecha: string;
  tipo: 'llamada' | 'email' | 'visita' | 'whatsapp' | 'registro_contrato';
  notas: string;
}

export interface Cliente {
  id: string;
  nombre: string;
  apellidos: string;
  nifNiePasaporte: string;
  correo: string;
  telefono: string;
  direccion: string;
  ciudad?: string;
  pais?: string;
  /**
   * Cuando es `true`, el cliente es exclusivo de alquiler y no se le asocia
   * un vehículo de flota propio (el selector de vehículo se oculta en el CRM).
   */
  esClienteAlquiler?: boolean;
  interacciones: InteraccionCliente[];
  fechaRegistro: string;
  /** IDs de los vehículos de flota (taller) asociados a este cliente. */
  vehiculosAsociados?: string[];
}

export type TemporadaAlquiler = 'alta' | 'media' | 'baja';

export interface Reserva {
  id: string;
  vehiculoId: string;
  clienteId: string;
  fechaInicio: string; // YYYY-MM-DD
  fechaFin: string;    // YYYY-MM-DD
  temporada: TemporadaAlquiler;
  /** Tarifa aplicada en el momento de crear la reserva. No cambia si se editan las tarifas del vehículo. */
  tarifaDiaria: number;
  totalCobrado: number;
  estado: 'confirmada' | 'cancelada';
  incluyeSeguroTodoRiesgo: boolean;
  /** De dónde viene: creada a mano o asignada desde una solicitud de la web. */
  origen?: 'manual' | 'web';
}

/** Extra contratado junto al vehículo en una solicitud (sillita, cobertura...). */
export interface SolicitudExtra {
  nombre: string;
  cantidad: number;
  total: number;
}

/**
 * Pedido de alquiler llegado de un canal externo (hoy la web). Es una bandeja
 * de entrada: la web reserva un MODELO ("Fiat Doblo o similar"), no un coche
 * concreto, así que no se crea la Reserva hasta que alguien asigna el vehículo.
 */
export interface SolicitudReserva {
  id: string;
  origen: string;
  referenciaExterna: string;
  /** Estado del pedido en la web (on-hold, processing, cancelled...). */
  estadoExterno: string;
  /** historica: pedido anterior a la app o ya cumplido; no es trabajo pendiente pero sí historial del cliente. */
  estadoGestion: 'pendiente' | 'convertida' | 'descartada' | 'historica';
  clienteNombre: string;
  clienteApellidos: string;
  clienteEmail: string;
  clienteTelefono: string;
  clienteDireccion?: string;
  clienteCiudad?: string;
  clientePais?: string;
  carnetCategoria?: string;
  /** NIF/NIE/pasaporte, si la web ya lo pide en el pago. */
  clienteDocumento?: string;
  /** Fecha y hora local 'YYYY-MM-DDTHH:mm'. Null si la web mandó un formato no reconocido. */
  fechaRecogida?: string | null;
  fechaDevolucion?: string | null;
  lugarRecogida?: string;
  lugarDevolucion?: string;
  vehiculoNombre: string;
  vehiculoWebId?: string;
  /** Lo que se cobra por el vehículo solo, ya con descuento. */
  vehiculoTotal: number;
  extras: SolicitudExtra[];
  descuento: number;
  total: number;
  metodoPago?: string;
  pagado: boolean;
  fechaPedido?: string;
  clienteId?: string;
  reservaId?: string;
}

export type AlertaTipo = 'itv' | 'mantenimiento' | 'seguro' | 'impuesto';

export interface Alerta {
  id: string;
  vehiculoId: string;
  tipo: AlertaTipo;
  descripcion: string;
  estado: 'activa' | 'pendiente' | 'atendida';
  /** Fecha límite para alertas por vencimiento (ITV, seguro, impuesto). */
  fechaLimite?: string;
  /** Kilometraje límite para alertas por odómetro (mantenimiento). */
  kilometrajeLimite?: number;
}

export interface NotificacionCliente {
  id: string;
  clienteId: string;
  vehiculoId?: string;
  tipoEnvio: 'email' | 'sms' | 'whatsapp';
  asunto?: string;
  mensaje: string;
  fechaEnvio: string;
  leido: boolean;
  tipoEvento: 'mantenimiento_preventivo' | 'itv_proxima' | 'reserva_confirmada' | 'vencimiento_seguro' | 'reparacion_lista';
}

export interface Tecnico {
  id: string;
  nombre: string;
  especialidad?: string;
  activo: boolean;
}

/**
 * Cita de la Agenda del taller: programación previa a la creación de la OT.
 * Admite datos libres (contactoNombre/contactoTelefono/vehiculoDescripcion)
 * para clientes o vehículos que aún no están registrados — se completan al
 * convertir la cita en Orden de Trabajo.
 */
export interface Cita {
  id: string;
  fechaHora: string; // ISO timestamp
  duracionMinutos: number;
  clienteId?: string;
  vehiculoId?: string;
  contactoNombre?: string;
  contactoTelefono?: string;
  vehiculoDescripcion?: string;
  motivo: string;
  tecnicoId?: string;
  estado: 'pendiente' | 'confirmada' | 'cancelada' | 'convertida';
  notas?: string;
  otId?: string;
}

/** Datos que el cliente envía desde el formulario público de autorregistro. */
export interface DatosRegistro {
  nombre: string;
  apellidos: string;
  tipoDocumento: 'dni' | 'nie' | 'pasaporte';
  documento: string;
  correo: string;
  telefono: string;
  direccion: string;
  ciudad: string;
  pais: string;
  consentimientoEn: string;
}

/**
 * Enlace de autorregistro enviado a un cliente (o a una persona nueva si no
 * lleva clienteId). Lo que el cliente envíe queda en `datos` hasta que el
 * personal lo revise y lo aplique a la ficha.
 */
export interface InvitacionCliente {
  id: string;
  clienteId?: string;
  estado: 'pendiente' | 'completada' | 'aplicada' | 'cancelada';
  expiraEn: string;
  datos?: DatosRegistro;
  idioma?: 'es' | 'en';
  completadaEn?: string;
  creadaEn: string;
}

/** Identificador de módulo funcional. Controla qué pestañas ve cada usuario. */
export type ModuloId = 'vehiculos' | 'clientes' | 'taller' | 'alertas' | 'rentabilidad' | 'facturas' | 'alquileres' | 'citas';

export interface Usuario {
  id: string;
  nombre: string;
  email: string;
  rol: 'super_admin' | 'admin' | 'usuario';
  modulos: ModuloId[];
  activo: boolean;
  fechaCreacion: string;
}

export interface LineaDocumento {
  id: string;
  descripcion: string;
  cantidad: number;
  precioUnitario: number;
  subtotal: number;
}

export interface Factura {
  id: string;
  numero: string;
  clienteId: string;
  vehiculoId?: string;
  /** Ids de las órdenes de trabajo importadas a esta factura (ver FacturasTab). */
  intervencionIds: string[];
  fecha: string;
  fechaVencimiento: string;
  estado: 'borrador' | 'emitida' | 'pagada' | 'vencida' | 'cancelada';
  lineas: LineaDocumento[];
  notas: string;
  subtotal: number;
  ivaPct: number;
  totalIva: number;
  total: number;
}
