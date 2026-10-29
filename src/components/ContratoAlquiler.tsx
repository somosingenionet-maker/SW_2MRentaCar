import type { Reserva, Cliente, Vehiculo, SolicitudReserva } from '../types';
import type { EmpresaConfig } from '../data/empresaConfig';
import { formatDate } from '../utils/dateFormat';
import { diasAlquiler } from '../utils/solicitudes';
import { fechaConHora } from '../utils/horaReserva';
import { resumenCarnet } from '../utils/carnet';
import { lugaresReserva } from '../utils/lugarReserva';
import { TEXTOS_CONTRATO, etiquetaTransmisionContrato, type IdiomaContrato } from '../utils/contratoTextos';

interface Props {
  reserva: Reserva;
  cliente?: Cliente;
  vehiculo?: Vehiculo;
  empresa: EmpresaConfig;
  idioma: IdiomaContrato;
  /** Pedido de la web del que viene la reserva, si lo hay (aporta el número de reserva web y el lugar si falta). */
  solicitud?: SolicitudReserva;
}

/** Cuerpo imprimible del contrato de alquiler, en español o en inglés. */
export default function ContratoAlquiler({ reserva, cliente, vehiculo, empresa, idioma, solicitud }: Props) {
  const tx = TEXTOS_CONTRATO[idioma];
  const fecha = (iso: string) => formatDate(iso, idioma);
  const c = cliente;
  const v = vehiculo;
  const lugares = lugaresReserva(reserva, solicitud);

  return (
    <div className="p-8 md:p-12 space-y-6 text-slate-800 font-sans print:p-0" id="contract-printable-area" lang={idioma}>

      {/* Cabecera */}
      <div className="flex justify-between items-start border-b-2 border-slate-950 pb-5">
        <div className="flex items-center gap-4">
          {empresa.logoBase64 && <img src={empresa.logoBase64} alt={empresa.nombre} className="h-16 max-w-[10rem] object-contain" />}
          <h1 className="text-xl font-extrabold tracking-tight text-slate-900 uppercase font-display">{tx.titulo}</h1>
        </div>
        <div className="text-right">
          <span className="text-xs font-mono font-bold block text-slate-500">{tx.numero}</span>
          <strong className="text-lg font-mono font-black text-blue-600">{reserva.id.slice(-8).toUpperCase()}</strong>
        </div>
      </div>

      {/* Fecha y lugar */}
      <div className="text-xs text-slate-500 border-b border-rose-100 pb-2 flex justify-between font-semibold">
        <span>{tx.ciudadExpedicion}: {empresa.ciudad}</span>
        {solicitud?.referenciaExterna && <span data-testid="reserva-web">{tx.reservaWeb} {solicitud.referenciaExterna}</span>}
        <span>{tx.fechaFirma}: {fecha(reserva.fechaInicio)}</span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
        {/* Arrendador */}
        <div className="space-y-1.5 text-xs text-slate-700">
          <h5 className="font-bold text-slate-900 uppercase border-b border-slate-200 pb-1 text-[10px]">{tx.s1}</h5>
          <p className="font-bold">{empresa.razonSocial}</p>
          <p className="text-slate-500">{tx.nif(empresa.nif)}</p>
          <p className="text-slate-500">{tx.sedeFiscal}: {empresa.direccionFiscal}</p>
          {(empresa.ciudad || empresa.pais) && (
            <p className="text-slate-500">{[empresa.ciudad, empresa.pais].filter(Boolean).join(' · ')}</p>
          )}
          <p className="text-slate-500">{tx.telefonoCentral}: {empresa.telefono}</p>
        </div>

        {/* Arrendatario */}
        <div className="space-y-1.5 text-xs text-slate-700" id="contract-client-specs">
          <h5 className="font-bold text-slate-900 uppercase border-b border-slate-200 pb-1 text-[10px]">{tx.s2}</h5>
          {c ? (
            <>
              <p className="font-bold">{c.nombre} {c.apellidos}</p>
              <p className="text-slate-500 font-mono">{tx.documento}: {c.nifNiePasaporte}</p>
              <p className="text-slate-500">{tx.carnet}: {resumenCarnet(c, fecha, tx.carnetPalabras) || tx.noInformado}</p>
              <p className="text-slate-500">{tx.email}: {c.correo || tx.noInformado}</p>
              <p className="text-slate-500">{tx.telefono}: {c.telefono}</p>
              <p className="text-slate-500">{tx.domicilio}: {c.direccion || tx.noInformado}</p>
              {(c.ciudad || c.pais) && <p className="text-slate-500">{[c.ciudad, c.pais].filter(Boolean).join(' · ')}</p>}
            </>
          ) : (
            <p className="text-rose-600 italic font-semibold">{tx.fichaNoDisponible}</p>
          )}
        </div>
      </div>

      {/* Vehículo */}
      <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-1.5 text-xs text-slate-700" id="contract-vehicle-specs">
        <h5 className="font-bold text-slate-900 uppercase text-[10px] pb-1 border-b border-slate-200">{tx.s3}</h5>
        {v ? (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <span className="text-slate-400 block text-[9px] uppercase font-semibold">{tx.marcaModelo}</span>
              <strong className="font-bold text-slate-800">{v.marca} {v.modelo}</strong>
            </div>
            <div>
              <span className="text-slate-400 block text-[9px] uppercase font-semibold">{tx.matricula}</span>
              <strong className="font-mono font-bold text-slate-800">{v.matricula}</strong>
            </div>
            <div>
              <span className="text-slate-400 block text-[9px] uppercase font-semibold">{tx.bastidor}</span>
              <strong className="font-mono text-slate-500 text-[10px]">{v.bastidor}</strong>
            </div>
            <div>
              <span className="text-slate-400 block text-[9px] uppercase font-semibold">{tx.transmision}</span>
              <strong className="font-bold text-slate-800">{etiquetaTransmisionContrato(v.transmision, tx)}</strong>
            </div>
            {v.aseguradora && (
              <div>
                <span className="text-slate-400 block text-[9px] uppercase font-semibold">{tx.aseguradora}</span>
                <strong className="font-bold text-slate-800">{v.aseguradora}</strong>
              </div>
            )}
            <div>
              <span className="text-slate-400 block text-[9px] uppercase font-semibold">{tx.kmEntrada}</span>
              <strong className="font-mono font-bold text-slate-800">{v.kilometraje.toLocaleString(tx.locale)} km</strong>
            </div>
          </div>
        ) : (
          <p className="text-rose-600 italic font-semibold">{tx.vehiculoDesasociado}</p>
        )}
      </div>

      {/* Plazos y liquidación */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs text-slate-700">
        <div className="space-y-1.5">
          <h5 className="font-bold text-slate-900 uppercase text-[10px] pb-1 border-b border-slate-200">{tx.s4}</h5>
          <p><strong>{tx.fechaHoraEntrega}:</strong> {fechaConHora(reserva.fechaInicio, reserva.horaInicio, fecha)}</p>
          <p><strong>{tx.lugarEntrega}:</strong> {lugares.recogida || tx.noInformado}</p>
          <p><strong>{tx.fechaHoraRetorno}:</strong> {fechaConHora(reserva.fechaFin, reserva.horaFin, fecha)}</p>
          <p><strong>{tx.lugarDevolucion}:</strong> {lugares.devolucion || tx.noInformado}</p>
          <p><strong>{tx.jornadas}:</strong> {tx.diasNaturales(diasAlquiler(reserva.fechaInicio, reserva.fechaFin))}</p>
          <p className="text-slate-500 italic text-[10px]">{tx.retraso}</p>
        </div>

        <div className="p-4 bg-blue-50/50 border border-blue-200 rounded-xl space-y-1.5" id="contract-financial-specs">
          <h5 className="font-bold text-blue-950 uppercase text-[10px] pb-1 border-b border-blue-200">{tx.s5}</h5>
          <div className="flex justify-between font-sans">
            <span>{tx.precioBase}:</span>
            <strong className="font-mono">{reserva.tarifaDiaria.toFixed(2)} {tx.porDia}</strong>
          </div>
          <div className="flex justify-between font-sans">
            <span>{tx.seguroCompleto}:</span>
            <strong className="font-mono">
              {reserva.incluyeSeguroTodoRiesgo
                ? (reserva.seguroDia != null ? `${reserva.seguroDia.toFixed(2)} ${tx.porDia}` : tx.incluido)
                : tx.polizaTerceros}
            </strong>
          </div>
          {reserva.fianza != null && reserva.fianza > 0 && (
            <div className="flex justify-between font-sans">
              <span>{tx.fianza}:</span>
              <strong className="font-mono">{reserva.fianza.toFixed(2)} €</strong>
            </div>
          )}
          <div className="flex justify-between border-t border-blue-300 pt-1 text-blue-900 font-extrabold font-sans">
            <span>{tx.importeNeto}:</span>
            <strong className="font-mono text-blue-950">{reserva.totalCobrado.toFixed(2)} €</strong>
          </div>
        </div>
      </div>

      {/* Declaración final del cliente */}
      <div className="border-t border-slate-100 pt-4" id="contract-declaration">
        <p className="text-[11px] text-slate-700 leading-relaxed text-justify">{tx.declaracion}</p>
      </div>

      {/* Firmas: una caja con borde lila por firmante, con el título dentro y espacio para firmar */}
      <div className="grid grid-cols-2 gap-6 pt-4 pb-2" id="contract-signatures-visualizer">
        {[tx.firmaArrendador(empresa.nombre), tx.firmaConductor].map(titulo => (
          <div key={titulo} data-testid="caja-firma" className="h-36 border-[3px] px-3 pt-2 break-inside-avoid" style={{ borderColor: '#C48CD6' }}>
            <span className="block text-[11px] font-bold uppercase tracking-wide text-slate-900">{titulo}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
