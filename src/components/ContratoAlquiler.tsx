import type { SnapshotContrato } from '../types';
import { formatDate } from '../utils/dateFormat';
import { diasAlquiler } from '../utils/solicitudes';
import { fechaConHora } from '../utils/horaReserva';
import { resumenCarnet } from '../utils/carnet';
import { lugaresReserva } from '../utils/lugarReserva';
import { nombreComplemento } from '../utils/complementos';
import { desgloseReserva, type LineaDesglose } from '../utils/desgloseReserva';
import { fechaHoraFirma, referenciaCorta } from '../utils/firmaContrato';
import { TEXTOS_CONTRATO, etiquetaTransmisionContrato, type IdiomaContrato } from '../utils/contratoTextos';
import { fmt2 } from '../utils/moneda';

/** Firma del cliente ya registrada: se dibuja dentro de su caja. */
interface FirmaVisible {
  png: string;
  firmadoEn: string;
  huella: string;
}

interface Props {
  reserva: SnapshotContrato['reserva'];
  cliente?: SnapshotContrato['cliente'] | null;
  vehiculo?: SnapshotContrato['vehiculo'] | null;
  /** El logo no forma parte de lo firmado: se muestra el que tenga la empresa en ese momento. */
  empresa: SnapshotContrato['empresa'] & { logoBase64?: string };
  idioma: IdiomaContrato;
  /** Pedido de la web del que viene la reserva, si lo hay (aporta el número de reserva web y el lugar si falta). */
  solicitud?: SnapshotContrato['solicitud'] | null;
  firma?: FirmaVisible;
}

/** Cuerpo imprimible del contrato de alquiler, en español o en inglés. */
export default function ContratoAlquiler({ reserva, cliente, vehiculo, empresa, idioma, solicitud, firma }: Props) {
  const tx = TEXTOS_CONTRATO[idioma];
  const fecha = (iso: string) => formatDate(iso, idioma);
  const c = cliente;
  const v = vehiculo;
  const lugares = lugaresReserva(reserva, solicitud ?? undefined);
  const dias = reserva.dias ?? diasAlquiler(reserva.fechaInicio, reserva.fechaFin, reserva.horaInicio, reserva.horaFin);
  const desglose = desgloseReserva(reserva, dias);
  // Importes con la coma española; el contrato en inglés los lleva con punto.
  const f2 = (n: number) => fmt2(n, tx.locale);
  const euros = (n: number) => `${n < 0 ? '−' : ''}${f2(Math.abs(n))} €`;
  // Cada línea económica con su texto en el idioma del contrato: concepto (y cómo se calcula) e importe.
  const lineasEconomicas = desglose.lineas.map((l: LineaDesglose) => {
    switch (l.tipo) {
      case 'alquiler': return { etiqueta: `${tx.alquiler} (${tx.diasPorPrecio(l.dias, f2(l.precio))})`, importe: euros(l.importe) };
      case 'alquiler-fijo': return { etiqueta: `${tx.alquiler} (${tx.diasPrecioPactado(l.dias)})`, importe: euros(l.importe) };
      case 'seguro': return { etiqueta: `${tx.seguroCompleto} (${tx.diasPorPrecio(l.dias, f2(l.precio))})`, importe: euros(l.importe) };
      case 'seguro-incluido': return { etiqueta: tx.seguroCompleto, importe: tx.incluido };
      case 'terceros': return { etiqueta: tx.polizaTerceros, importe: tx.incluida };
      case 'extra': {
        const cuenta = l.precio != null && l.porDia != null ? ` (${f2(l.precio)} ${l.porDia ? tx.porDia : `€, ${tx.precioFijo}`})` : '';
        return { etiqueta: `${nombreComplemento(l.nombre)}${l.cantidad > 1 ? ` × ${l.cantidad}` : ''}${cuenta}`, importe: euros(l.importe) };
      }
      case 'descuento': return { etiqueta: `${tx.descuento}${l.cupon ? ` (${tx.cupon} ${l.cupon})` : ''}`, importe: euros(l.importe), descuento: true };
      case 'ajuste': return { etiqueta: Math.abs(l.importe) > 0.05 ? tx.otrosAjustes : tx.redondeo, importe: euros(l.importe) };
    }
  });

  return (
    <div className="p-8 md:p-12 space-y-6 text-slate-800 font-sans print:p-0 print:space-y-3" id="contract-printable-area" lang={idioma}>

      {/* Cabecera */}
      <div className="flex justify-between items-start border-b-2 border-slate-950 pb-5 print:pb-3">
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

      <div className="grid grid-cols-1 md:grid-cols-2 print:grid-cols-2 gap-6 pt-2">
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
      <div className="p-4 print:p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-1.5 text-xs text-slate-700 break-inside-avoid" id="contract-vehicle-specs">
        <h5 className="font-bold text-slate-900 uppercase text-[10px] pb-1 border-b border-slate-200">{tx.s3}</h5>
        {v ? (
          <div className="grid grid-cols-2 md:grid-cols-4 print:grid-cols-4 gap-4">
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
      <div className="grid grid-cols-1 md:grid-cols-2 print:grid-cols-2 gap-6 text-xs text-slate-700">
        <div className="space-y-1.5">
          <h5 className="font-bold text-slate-900 uppercase text-[10px] pb-1 border-b border-slate-200">{tx.s4}</h5>
          <p><strong>{tx.fechaHoraEntrega}:</strong> {fechaConHora(reserva.fechaInicio, reserva.horaInicio, fecha)}</p>
          <p><strong>{tx.lugarEntrega}:</strong> {lugares.recogida || tx.noInformado}</p>
          <p><strong>{tx.fechaHoraRetorno}:</strong> {fechaConHora(reserva.fechaFin, reserva.horaFin, fecha)}</p>
          <p><strong>{tx.lugarDevolucion}:</strong> {lugares.devolucion || tx.noInformado}</p>
          <p><strong>{tx.jornadas}:</strong> {tx.diasNaturales(dias)}</p>
          <p className="text-slate-500 italic text-[10px]">{tx.retraso}</p>
        </div>

        <div className="p-4 print:p-3 bg-blue-50/50 border border-blue-200 rounded-xl space-y-1.5 break-inside-avoid" id="contract-financial-specs">
          <h5 className="font-bold text-blue-950 uppercase text-[10px] pb-1 border-b border-blue-200">{tx.s5}</h5>
          {lineasEconomicas.map((l, i) => (
            <div key={i} data-testid="linea-economica" className="flex justify-between gap-2 font-sans">
              <span>{l.etiqueta}:</span>
              <strong className={`font-mono shrink-0 ${l.descuento ? 'text-emerald-800' : ''}`}>{l.importe}</strong>
            </div>
          ))}
          <div className="flex justify-between border-t border-blue-300 pt-1 text-blue-900 font-extrabold font-sans">
            <span>{tx.importeNeto}:</span>
            <strong className="font-mono text-blue-950">{euros(desglose.total)}</strong>
          </div>
          {desglose.fianza > 0 && (
            <div data-testid="fianza-contrato" className="flex justify-between gap-2 border-t border-dashed border-blue-300 pt-1.5 text-[10px] text-slate-600 font-sans">
              <span>{tx.fianzaAparte}:</span>
              <strong className="font-mono shrink-0">{euros(desglose.fianza)}</strong>
            </div>
          )}
        </div>
      </div>

      {/* Firma del cliente: una caja con borde lila, centrada, con el título dentro y espacio para firmar */}
      <div className="pt-4 pb-2 print:pt-2 print:pb-0 break-inside-avoid" id="contract-signatures-visualizer">
        <div data-testid="caja-firma" className="relative w-1/2 min-w-[14rem] mx-auto h-36 print:h-28 border-[3px] px-3 pt-2 break-inside-avoid" style={{ borderColor: '#C48CD6' }}>
          <span className="block text-[11px] font-bold uppercase tracking-wide text-slate-900">{tx.firmaConductor}</span>
          {firma && (
            <>
              <img src={firma.png} alt={tx.firmaConductor} data-testid="firma-cliente" className="absolute left-3 right-3 top-7 bottom-5 w-[calc(100%-1.5rem)] h-[calc(100%-3rem)] object-contain" />
              <span className="absolute bottom-1 left-3 right-3 text-[8px] text-slate-500 truncate">
                {tx.firmadoElectronicamente(fechaHoraFirma(firma.firmadoEn, idioma), referenciaCorta(firma.huella))}
              </span>
            </>
          )}
        </div>
      </div>

      {/* Declaración final del cliente, debajo de las firmas */}
      <div className="pt-2 break-inside-avoid" id="contract-declaration">
        <p className="text-[11px] text-slate-700 leading-relaxed text-justify">{tx.declaracion}</p>
      </div>
    </div>
  );
}
