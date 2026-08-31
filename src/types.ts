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

export interface Intervencion {
  id: string;
  vehiculoId: string;
  tipo: 'reparacion' | 'preventivo';
  descripcion: string;
  /** Lista de tareas/ítems realizados. Sustituye a `descripcion` en la UI. */
  items?: string[];
  tallerRealizador: string;
  costo?: number;
  kilometrajeEnIntervencion: number;
  fechaIntervencion: string;
  notas?: string;
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
  /** Albarán generado desde esta OT. */
  albaranId?: string;
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

/** Identificador de módulo funcional. Controla qué pestañas ve cada usuario. */
export type ModuloId = 'vehiculos' | 'clientes' | 'taller' | 'alertas' | 'rentabilidad' | 'facturas' | 'alquileres';

export interface Usuario {
  id: string;
  nombre: string;
  email: string;
  /** Solo se usaba en el esquema antiguo de localStorage. Con Supabase Auth ya no se almacena. */
  passwordHash?: string;
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

export interface Albaran {
  id: string;
  numero: string;
  clienteId: string;
  vehiculoId: string;
  intervencionIds: string[];
  fecha: string;
  estado: 'borrador' | 'enviado' | 'rechazado';
  lineas: LineaDocumento[];
  notas: string;
  subtotal: number;
  ivaPct: number;
  totalIva: number;
  total: number;
}

export interface Factura {
  id: string;
  numero: string;
  /** Presente cuando la factura se generó a partir de un albarán. */
  albaranId?: string;
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
