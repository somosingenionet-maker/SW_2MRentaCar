import { useEffect, useState } from 'react';
import { motion } from 'motion/react';
import { FileText, Printer, MessageCircle, PenTool, ShieldCheck, AlertTriangle } from 'lucide-react';
import type { Reserva, Cliente, Vehiculo, SolicitudReserva, ContratoFirmado } from '../types';
import type { EmpresaConfig } from '../data/empresaConfig';
import ContratoAlquiler from './ContratoAlquiler';
import FirmaPantalla from './FirmaPantalla';
import { IDIOMAS_CONTRATO, TEXTOS_CONTRATO, type IdiomaContrato } from '../utils/contratoTextos';
import { formatDate } from '../utils/dateFormat';
import { fechaConHora } from '../utils/horaReserva';
import { diasAlquiler } from '../utils/solicitudes';
import { genId } from '../utils/id';
import {
  calcularHuella, cambiosTrasFirma, crearSnapshot, fechaHoraFirma, integridadCorrecta, referenciaCorta,
} from '../utils/firmaContrato';
import { anularContratoFirmado, fetchContratoFirmado, guardarContratoFirmado } from '../data/contratosFirmadosDb';

/** Estado de la firma de la reserva: se está comprobando, no se pudo comprobar, o ya se sabe (firmada o no). */
export type EstadoFirma = { fase: 'cargando' } | { fase: 'error' } | { fase: 'listo'; firmado: ContratoFirmado | null };

interface DatosContrato {
  reserva: Reserva;
  cliente?: Cliente;
  vehiculo?: Vehiculo;
  /** Pedido de la web del que viene la reserva, si lo hay. */
  solicitud?: SolicitudReserva;
  empresa: EmpresaConfig;
}

interface VistaProps extends DatosContrato {
  estado: EstadoFirma;
  /** null = aún comprobando. */
  integro: boolean | null;
  puedeAnular: boolean;
  firmando: boolean;
  onAbrirFirma: () => void;
  onCerrarFirma: () => void;
  onConfirmarFirma: (d: { firmaPng: string; idioma: IdiomaContrato }) => Promise<void>;
  onAnular: (motivo: string) => Promise<void>;
  onClose: () => void;
}

/** Ventana con el contrato de una reserva: idioma, imprimir, envío y firma en pantalla. Sin acceso a datos (ver ContratoVisor). */
export function ContratoVisorVista({
  reserva, cliente, vehiculo, solicitud, empresa, estado, integro, puedeAnular, firmando,
  onAbrirFirma, onCerrarFirma, onConfirmarFirma, onAnular, onClose,
}: VistaProps) {
  const [idiomaElegido, setIdiomaElegido] = useState<IdiomaContrato>('es');
  const [anulando, setAnulando] = useState<{ motivo: string; error: string; guardando: boolean } | null>(null);

  const firmado = estado.fase === 'listo' ? estado.firmado : null;
  // Un contrato firmado queda en el idioma en que se firmó y con los datos que se firmaron.
  const idioma = firmado ? firmado.idioma : idiomaElegido;
  const tx = TEXTOS_CONTRATO[idioma];
  const fecha = (iso: string) => formatDate(iso, idioma);
  const texto = tx.mensaje({
    nombre: cliente?.nombre ?? '',
    vehiculo: `${vehiculo?.marca ?? ''} ${vehiculo?.modelo ?? ''}`.trim(),
    matricula: vehiculo?.matricula ?? '',
    desde: fechaConHora(reserva.fechaInicio, reserva.horaInicio, fecha),
    hasta: fechaConHora(reserva.fechaFin, reserva.horaFin, fecha),
    dias: diasAlquiler(reserva.fechaInicio, reserva.fechaFin),
    total: reserva.totalCobrado.toFixed(2),
    empresa: empresa.nombre,
  });
  const tel = cliente?.telefono?.replace(/\D/g, '') ?? '';
  const cambios = firmado ? cambiosTrasFirma(firmado.contrato, reserva, solicitud) : [];
  const puedeFirmar = estado.fase === 'listo' && !firmado && reserva.estado !== 'cancelada';
  const snapshotActual = () => crearSnapshot(reserva, cliente, vehiculo, solicitud, empresa);

  const confirmarAnulacion = async () => {
    if (!anulando) return;
    const motivo = anulando.motivo.trim();
    if (motivo.length < 3) { setAnulando({ ...anulando, error: 'Indica el motivo de la anulación.' }); return; }
    setAnulando({ ...anulando, guardando: true, error: '' });
    try {
      await onAnular(motivo);
      setAnulando(null);
    } catch (err) {
      setAnulando({ motivo, guardando: false, error: err instanceof Error ? err.message : 'No se pudo anular la firma.' });
    }
  };

  return (
    <>
      <div data-imprimible data-hoja="contrato" className="fixed inset-0 bg-slate-900/80 backdrop-blur-xs flex items-start justify-center p-4 z-50 overflow-y-auto pt-10">
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 20, opacity: 0 }}
          className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full border border-slate-200 overflow-hidden print:shadow-none print:border-none print:max-w-full my-6"
          id="legal-contract-pdf-modal"
        >
          {/* Cabecera de la ventana (no se imprime) */}
          <div className="px-6 py-4 bg-slate-800 text-white flex justify-between items-center print:hidden">
            <div className="flex items-center gap-2">
              <FileText className="w-5 h-5 text-blue-400" />
              <span className="font-bold text-sm font-display">Visor de Contrato de Alquiler</span>
            </div>
            <div className="flex gap-2 flex-wrap justify-end">
              {puedeFirmar && (
                <button
                  onClick={onAbrirFirma}
                  className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-lg transition flex items-center gap-1 cursor-pointer font-sans"
                >
                  <PenTool className="w-3.5 h-3.5" /> Firmar en pantalla
                </button>
              )}
              <button
                onClick={() => window.print()}
                className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-lg transition flex items-center gap-1 cursor-pointer font-sans"
              >
                <Printer className="w-3.5 h-3.5" /> Descargar / Imprimir
              </button>
              {/* Selector de idioma del contrato (también cambia el mensaje de WhatsApp) */}
              <div className="inline-flex rounded-lg border border-slate-600 overflow-hidden text-xs font-bold" role="group" aria-label="Idioma del contrato"
                title={firmado ? 'El contrato firmado queda en el idioma en que se firmó' : undefined}>
                {IDIOMAS_CONTRATO.map(i => (
                  <button
                    key={i.id}
                    type="button"
                    onClick={() => setIdiomaElegido(i.id)}
                    aria-pressed={idioma === i.id}
                    disabled={!!firmado}
                    className={`px-3 py-1.5 transition ${firmado ? 'cursor-not-allowed opacity-60' : 'cursor-pointer'} ${idioma === i.id ? 'bg-white text-slate-900' : 'bg-slate-700 text-slate-200 hover:bg-slate-600'}`}
                  >
                    {i.etiqueta}
                  </button>
                ))}
              </div>
              {cliente?.telefono && (
                <a href={`https://wa.me/${tel}?text=${encodeURIComponent(texto)}`} target="_blank" rel="noreferrer"
                  className="px-3 py-1.5 bg-green-600 hover:bg-green-500 text-white text-xs font-bold rounded-lg transition flex items-center gap-1">
                  <MessageCircle className="w-3.5 h-3.5" /> WhatsApp
                </a>
              )}
              <button
                onClick={onClose}
                className="px-3 py-1.5 bg-slate-700 hover:bg-slate-600 text-slate-200 text-xs font-bold rounded-lg transition cursor-pointer font-sans"
              >
                Cerrar
              </button>
            </div>
          </div>

          {/* Avisos sobre la firma (no se imprimen) */}
          <div className="print:hidden empty:hidden">
            {estado.fase === 'error' && (
              <div role="alert" className="px-6 py-3 bg-rose-50 border-b border-rose-200 text-xs font-semibold text-rose-700 flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0 mt-px" />
                No se pudo comprobar si este contrato está firmado, así que no se puede firmar ahora. Se muestra con los datos actuales. Cierra y vuelve a abrirlo.
              </div>
            )}
            {firmado && (
              <div data-testid="aviso-firmado" className="px-6 py-3 bg-emerald-50 border-b border-emerald-200 text-xs font-semibold text-emerald-800 space-y-1">
                <div className="flex items-start gap-2">
                  <ShieldCheck className="w-4 h-4 shrink-0 mt-px" />
                  <span>
                    Contrato firmado el {fechaHoraFirma(firmado.firmadoEn, 'es')}
                    {firmado.firmadoPor ? ` · Registrado por ${firmado.firmadoPor}` : ''} · Ref. {referenciaCorta(firmado.huella)}.
                    {' '}Es una copia fija de lo que se firmó.
                    {integro === true && ' Copia íntegra: coincide con su huella.'}
                  </span>
                </div>
                {integro === false && (
                  <p role="alert" className="text-rose-700 flex items-start gap-2">
                    <AlertTriangle className="w-4 h-4 shrink-0 mt-px" />
                    Atención: el contrato guardado no coincide con su huella. No lo des por válido y avisa a soporte.
                  </p>
                )}
                {cambios.length > 0 && (
                  <p className="text-amber-700 flex items-start gap-2" data-testid="aviso-cambios">
                    <AlertTriangle className="w-4 h-4 shrink-0 mt-px" />
                    La reserva ha cambiado desde la firma ({cambios.join(', ')}). Aquí se ve lo que se firmó.
                    {puedeAnular ? ' Si el contrato debe reflejar los cambios, anula la firma y vuelve a firmar.' : ' Si el contrato debe reflejar los cambios, pide a un administrador que anule la firma.'}
                  </p>
                )}
                {puedeAnular && (
                  <button type="button" onClick={() => setAnulando({ motivo: '', error: '', guardando: false })}
                    className="mt-1 px-2.5 py-1 border border-rose-300 text-rose-700 bg-white hover:bg-rose-50 rounded-md text-[11px] font-bold cursor-pointer">
                    Anular firma
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Cuerpo imprimible del contrato: el firmado (congelado) o el actual */}
          {firmado ? (
            <ContratoAlquiler
              reserva={firmado.contrato.reserva} cliente={firmado.contrato.cliente} vehiculo={firmado.contrato.vehiculo}
              empresa={{ ...firmado.contrato.empresa, logoBase64: empresa.logoBase64 }} idioma={firmado.idioma}
              solicitud={firmado.contrato.solicitud}
              firma={{ png: firmado.firmaPng, firmadoEn: firmado.firmadoEn, huella: firmado.huella }}
            />
          ) : (
            <ContratoAlquiler reserva={reserva} cliente={cliente} vehiculo={vehiculo} empresa={empresa} idioma={idioma} solicitud={solicitud} />
          )}
        </motion.div>
      </div>

      {firmando && (
        <FirmaPantalla
          contrato={snapshotActual()}
          logoBase64={empresa.logoBase64}
          idiomaInicial={idiomaElegido}
          onCancelar={onCerrarFirma}
          onConfirmar={onConfirmarFirma}
        />
      )}

      {anulando && (
        <div className="fixed inset-0 z-[70] bg-slate-900/60 flex items-center justify-center p-4 print:hidden" role="dialog" aria-modal="true" aria-label="Anular firma">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-5 space-y-3">
            <h3 className="font-extrabold text-slate-900 text-sm">Anular la firma de este contrato</h3>
            <p className="text-xs text-slate-600">
              La firma anulada se conserva como registro, pero el contrato volverá a estar sin firmar y se podrá firmar de nuevo con los datos actuales.
            </p>
            <textarea
              aria-label="Motivo de la anulación" autoFocus rows={3} value={anulando.motivo} disabled={anulando.guardando}
              onChange={e => setAnulando({ ...anulando, motivo: e.target.value, error: '' })}
              placeholder="Motivo (por ejemplo: cambió la fecha de devolución)"
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
            {anulando.error && <p role="alert" className="text-xs font-semibold text-rose-600">{anulando.error}</p>}
            <div className="flex justify-end gap-2 text-xs font-bold">
              <button type="button" onClick={() => setAnulando(null)} disabled={anulando.guardando}
                className="px-3 py-2 border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-50 cursor-pointer">Cancelar</button>
              <button type="button" onClick={confirmarAnulacion} disabled={anulando.guardando}
                className="px-3 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-lg cursor-pointer disabled:opacity-60">
                {anulando.guardando ? 'Anulando…' : 'Anular firma'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

interface Props extends DatosContrato {
  /** Solo los administradores pueden anular una firma. */
  puedeAnularFirma?: boolean;
  /** Avisa de que se ha firmado o anulado una firma, para refrescar las marcas «Firmado» de las listas. */
  onFirmaCambiada?: () => void;
  onClose: () => void;
}

/** Carga la firma de la reserva y gestiona firmar y anular. */
export default function ContratoVisor({ puedeAnularFirma = false, onFirmaCambiada, onClose, ...datos }: Props) {
  const { reserva, cliente, vehiculo, solicitud, empresa } = datos;
  const [estado, setEstado] = useState<EstadoFirma>({ fase: 'cargando' });
  const [integro, setIntegro] = useState<boolean | null>(null);
  const [firmando, setFirmando] = useState(false);

  useEffect(() => {
    let vigente = true;
    setEstado({ fase: 'cargando' });
    fetchContratoFirmado(reserva.id)
      .then(firmado => { if (vigente) setEstado({ fase: 'listo', firmado }); })
      .catch(err => { console.error('Error comprobando la firma del contrato', err); if (vigente) setEstado({ fase: 'error' }); });
    return () => { vigente = false; };
  }, [reserva.id]);

  const firmado = estado.fase === 'listo' ? estado.firmado : null;
  useEffect(() => {
    let vigente = true;
    setIntegro(null);
    if (firmado) integridadCorrecta(firmado).then(ok => { if (vigente) setIntegro(ok); }).catch(() => { if (vigente) setIntegro(false); });
    return () => { vigente = false; };
  }, [firmado]);

  const confirmarFirma = async ({ firmaPng, idioma }: { firmaPng: string; idioma: IdiomaContrato }) => {
    const base = { contrato: crearSnapshot(reserva, cliente, vehiculo, solicitud, empresa), idioma, firmaPng, firmadoEn: new Date().toISOString() };
    const nuevo: ContratoFirmado = {
      id: genId('firma'), reservaId: reserva.id, ...base,
      huella: await calcularHuella(base), dispositivo: navigator.userAgent.slice(0, 300),
    };
    try {
      await guardarContratoFirmado(nuevo);
    } catch (err) {
      // Otro aparato firmó esta reserva mientras tanto: se muestra lo que ya hay en vez de pisarlo.
      if ((err as { code?: string }).code === '23505') {
        setEstado({ fase: 'listo', firmado: await fetchContratoFirmado(reserva.id) });
        setFirmando(false);
        onFirmaCambiada?.();
        return;
      }
      throw err;
    }
    // Se vuelve a leer para ver quién la registró, que lo pone la base de datos.
    const guardado = await fetchContratoFirmado(reserva.id).catch(() => null);
    setEstado({ fase: 'listo', firmado: guardado ?? nuevo });
    setFirmando(false);
    onFirmaCambiada?.();
  };

  const anular = async (motivo: string) => {
    if (!firmado) return;
    await anularContratoFirmado(firmado.id, motivo);
    setEstado({ fase: 'listo', firmado: null });
    onFirmaCambiada?.();
  };

  return (
    <ContratoVisorVista
      {...datos}
      estado={estado} integro={integro} puedeAnular={puedeAnularFirma} firmando={firmando}
      onAbrirFirma={() => setFirmando(true)} onCerrarFirma={() => setFirmando(false)}
      onConfirmarFirma={confirmarFirma} onAnular={anular} onClose={onClose}
    />
  );
}
