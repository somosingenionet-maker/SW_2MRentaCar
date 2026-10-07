import { useState } from 'react';
import { Link2, X, Copy, Check, MessageCircle, Mail, ClipboardCheck, Clock } from 'lucide-react';
import { Cliente, InvitacionCliente } from '../types';
import { formatDate } from '../utils/dateFormat';

type Idioma = 'es' | 'en';

const DIAS_VALIDEZ = 7;

const soloDigitos = (t: string) => t.replace(/\D/g, '');

/** Teléfono para wa.me: solo dígitos; un móvil/fijo español de 9 cifras recibe el prefijo 34. */
function telefonoWhatsapp(tel: string): string {
  let d = soloDigitos(tel);
  if (tel.trim().startsWith('00')) d = d.slice(2);
  if (d.length === 9 && /^[6-9]/.test(d)) d = '34' + d;
  return d;
}

function mensaje(idioma: Idioma, empresa: string, nombre: string, enlace: string): string {
  const saludo = nombre ? nombre.split(' ')[0] : '';
  return idioma === 'es'
    ? `Hola${saludo ? ' ' + saludo : ''}, soy de ${empresa}. Para agilizar la recogida del vehículo, rellena tus datos en este enlace (2 minutos, un solo uso): ${enlace}`
    : `Hello${saludo ? ' ' + saludo : ''}, this is ${empresa}. To speed up your vehicle pick-up, please fill in your details here (2 minutes, single use): ${enlace}`;
}

// ── Modal: generar y enviar el enlace ───────────────────────────────────────

interface PedirDatosProps {
  cliente: Cliente | null;
  empresaNombre: string;
  onCrear: (clienteId: string | null, idioma: Idioma) => Promise<string>;
  onClose: () => void;
}

export function PedirDatosModal({ cliente, empresaNombre, onCrear, onClose }: PedirDatosProps) {
  const [idioma, setIdioma] = useState<Idioma>(cliente?.pais && !/espa[ñn]a|spain/i.test(cliente.pais) ? 'en' : 'es');
  const [enlace, setEnlace] = useState('');
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState('');
  const [copiado, setCopiado] = useState(false);

  const generar = async () => {
    setCargando(true);
    setError('');
    try {
      setEnlace(await onCrear(cliente?.id ?? null, idioma));
    } catch (e) {
      console.error('Error creando invitación', e);
      setError('No se pudo generar el enlace. Revisa la conexión e inténtalo de nuevo.');
    } finally {
      setCargando(false);
    }
  };

  const texto = enlace ? mensaje(idioma, empresaNombre, cliente?.nombre ?? '', enlace) : '';
  const copiar = async () => {
    try { await navigator.clipboard.writeText(enlace); setCopiado(true); setTimeout(() => setCopiado(false), 2000); }
    catch { setError('No se pudo copiar automáticamente: selecciona el enlace y cópialo a mano.'); }
  };
  const telWa = cliente ? telefonoWhatsapp(cliente.telefono) : '';

  return (
    <div className="fixed inset-0 bg-slate-900/60 flex items-center justify-center p-4 z-50" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden" onClick={e => e.stopPropagation()}>
        <div className="px-5 py-4 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
          <h3 className="font-extrabold text-slate-800 flex items-center gap-2"><Link2 className="w-5 h-5 text-blue-600" /> Pedir datos al cliente</h3>
          <button onClick={onClose} className="p-1 text-slate-400 hover:text-slate-700"><X className="w-5 h-5" /></button>
        </div>
        <div className="p-5 space-y-4 text-sm">
          <p className="text-slate-600">
            {cliente
              ? <>Se enviará un formulario a <strong>{cliente.nombre} {cliente.apellidos}</strong> para que complete su NIF/NIE/pasaporte y sus datos de contacto.</>
              : <>Se generará un formulario para una persona <strong>nueva</strong>: al recibirlo podrás crear su ficha.</>}
            {' '}El enlace es de un solo uso y caduca a los {DIAS_VALIDEZ} días.
          </p>

          {!enlace ? (
            <>
              <div>
                <span className="text-[11px] font-bold uppercase text-slate-400 block mb-1">Idioma del mensaje y del formulario</span>
                <div className="inline-flex rounded-lg border border-slate-200 overflow-hidden text-xs font-bold">
                  {(['es', 'en'] as Idioma[]).map(l => (
                    <button key={l} type="button" onClick={() => setIdioma(l)}
                      className={`px-4 py-1.5 ${idioma === l ? 'bg-blue-600 text-white' : 'bg-white text-slate-500 hover:bg-slate-50'}`}>
                      {l === 'es' ? 'Español' : 'English'}
                    </button>
                  ))}
                </div>
              </div>
              {error && <p className="text-xs text-rose-600 bg-rose-50 border border-rose-200 rounded-lg px-3 py-2">{error}</p>}
              <div className="flex justify-end gap-2 pt-1">
                <button onClick={onClose} className="px-4 py-2 border border-slate-200 rounded-xl text-slate-500 hover:bg-slate-50">Cancelar</button>
                <button onClick={generar} disabled={cargando}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white font-bold rounded-xl flex items-center gap-1.5">
                  <Link2 className="w-4 h-4" /> {cargando ? 'Generando…' : 'Generar enlace'}
                </button>
              </div>
            </>
          ) : (
            <>
              <div>
                <span className="text-[11px] font-bold uppercase text-slate-400 block mb-1">Enlace (solo se muestra ahora)</span>
                <input readOnly value={enlace} onFocus={e => e.currentTarget.select()}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs font-mono bg-slate-50" />
              </div>
              <div className="flex flex-wrap gap-2">
                <button onClick={copiar} className="px-3 py-2 bg-slate-800 hover:bg-slate-900 text-white text-xs font-bold rounded-lg flex items-center gap-1.5">
                  {copiado ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />} {copiado ? 'Copiado' : 'Copiar enlace'}
                </button>
                <a href={`https://wa.me/${telWa}?text=${encodeURIComponent(texto)}`} target="_blank" rel="noreferrer"
                  className="px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg flex items-center gap-1.5">
                  <MessageCircle className="w-4 h-4" /> WhatsApp
                </a>
                <a href={`mailto:${cliente?.correo ?? ''}?subject=${encodeURIComponent(idioma === 'es' ? `Tus datos para el alquiler — ${empresaNombre}` : `Your details for the rental — ${empresaNombre}`)}&body=${encodeURIComponent(texto)}`}
                  className="px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-lg flex items-center gap-1.5">
                  <Mail className="w-4 h-4" /> Correo
                </a>
              </div>
              {!cliente && <p className="text-[11px] text-slate-400">Como es una persona nueva, WhatsApp y correo se abren sin destinatario: elígelo tú.</p>}
              <p className="text-[11px] text-slate-400">Cuando el cliente lo envíe verás un aviso en «Datos recibidos» de Clientes para revisarlo y aplicarlo.</p>
              {error && <p className="text-xs text-rose-600">{error}</p>}
              <div className="flex justify-end"><button onClick={onClose} className="px-4 py-2 border border-slate-200 rounded-xl text-slate-600 hover:bg-slate-50">Cerrar</button></div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Modal: revisar lo recibido y aplicarlo ──────────────────────────────────

interface RevisarProps {
  invitacion: InvitacionCliente;
  cliente: Cliente | null;
  onAplicar: (inv: InvitacionCliente) => Promise<void>;
  onDescartar: (inv: InvitacionCliente) => Promise<void>;
  onClose: () => void;
}

const ETIQUETA_DOC = { dni: 'DNI', nie: 'NIE', pasaporte: 'Pasaporte / otro' } as const;

export function RevisarDatosModal({ invitacion, cliente, onAplicar, onDescartar, onClose }: RevisarProps) {
  const [trabajando, setTrabajando] = useState(false);
  const [error, setError] = useState('');
  const d = invitacion.datos;
  if (!d) return null;

  const filas: { campo: string; actual: string; nuevo: string }[] = [
    { campo: 'Nombre', actual: cliente?.nombre ?? '', nuevo: d.nombre },
    { campo: 'Apellidos', actual: cliente?.apellidos ?? '', nuevo: d.apellidos },
    { campo: `Documento (${ETIQUETA_DOC[d.tipoDocumento]})`, actual: cliente?.nifNiePasaporte ?? '', nuevo: d.documento },
    { campo: 'Correo', actual: cliente?.correo ?? '', nuevo: d.correo },
    { campo: 'Teléfono', actual: cliente?.telefono ?? '', nuevo: d.telefono },
    { campo: 'Dirección', actual: cliente?.direccion ?? '', nuevo: d.direccion },
    { campo: 'Ciudad', actual: cliente?.ciudad ?? '', nuevo: d.ciudad },
    { campo: 'País', actual: cliente?.pais ?? '', nuevo: d.pais },
  ];

  const ejecutar = async (accion: (inv: InvitacionCliente) => Promise<void>) => {
    setTrabajando(true);
    setError('');
    try { await accion(invitacion); onClose(); }
    catch (e) { console.error('Error en datos recibidos', e); setError('No se pudo completar la acción. Inténtalo de nuevo.'); setTrabajando(false); }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 flex items-center justify-center p-4 z-50 overflow-y-auto" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full overflow-hidden my-6" onClick={e => e.stopPropagation()}>
        <div className="px-5 py-4 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
          <h3 className="font-extrabold text-slate-800 flex items-center gap-2"><ClipboardCheck className="w-5 h-5 text-blue-600" /> Datos recibidos del cliente</h3>
          <button onClick={onClose} className="p-1 text-slate-400 hover:text-slate-700"><X className="w-5 h-5" /></button>
        </div>
        <div className="p-5 space-y-4 text-sm">
          <p className="text-slate-600">
            {cliente
              ? <>Compara lo que ha enviado con la ficha actual. Al aplicar, la ficha se actualiza con los datos de la derecha.</>
              : <>Es una persona <strong>nueva</strong>: al aplicar se creará su ficha de cliente con estos datos.</>}
          </p>
          <div className="overflow-x-auto border border-slate-100 rounded-xl">
            <table className="w-full text-xs">
              <thead className="bg-slate-50 text-slate-400 uppercase tracking-wider text-[10px]">
                <tr><th className="text-left p-2.5">Campo</th>{cliente && <th className="text-left p-2.5">Ficha actual</th>}<th className="text-left p-2.5">Recibido</th></tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {filas.map(f => {
                  const cambia = !!cliente && f.actual.trim().toLowerCase() !== f.nuevo.trim().toLowerCase();
                  return (
                    <tr key={f.campo} className={cambia ? 'bg-amber-50/60' : ''}>
                      <td className="p-2.5 font-bold text-slate-500">{f.campo}</td>
                      {cliente && <td className="p-2.5 text-slate-500">{f.actual || <span className="italic text-slate-300">vacío</span>}</td>}
                      <td className={`p-2.5 font-semibold ${cambia ? 'text-slate-900' : 'text-slate-700'}`}>{f.nuevo}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <p className="text-[11px] text-slate-400">
            Aceptó el tratamiento de sus datos el {formatDate(d.consentimientoEn.slice(0, 10))}. Revisa especialmente el documento antes de aplicarlo.
          </p>
          {error && <p className="text-xs text-rose-600 bg-rose-50 border border-rose-200 rounded-lg px-3 py-2">{error}</p>}
          <div className="flex justify-between gap-2 pt-1">
            <button onClick={() => ejecutar(onDescartar)} disabled={trabajando}
              className="px-4 py-2 border border-slate-200 text-slate-500 hover:bg-slate-50 rounded-xl disabled:opacity-60">Descartar</button>
            <button onClick={() => ejecutar(onAplicar)} disabled={trabajando}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl flex items-center gap-1.5 disabled:opacity-60">
              <Check className="w-4 h-4" /> {trabajando ? 'Guardando…' : cliente ? 'Aplicar a la ficha' : 'Crear cliente'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Panel resumen dentro del CRM ────────────────────────────────────────────

interface PanelProps {
  invitaciones: InvitacionCliente[];
  clientes: Cliente[];
  onRevisar: (inv: InvitacionCliente) => void;
  onCancelar: (inv: InvitacionCliente) => Promise<void>;
}

export function PanelDatosRecibidos({ invitaciones, clientes, onRevisar, onCancelar }: PanelProps) {
  const ahora = Date.now();
  const recibidas = invitaciones.filter(i => i.estado === 'completada');
  const esperando = invitaciones.filter(i => i.estado === 'pendiente' && new Date(i.expiraEn).getTime() > ahora);
  if (recibidas.length === 0 && esperando.length === 0) return null;

  const nombreDe = (inv: InvitacionCliente) => {
    const c = clientes.find(x => x.id === inv.clienteId);
    return c ? `${c.nombre} ${c.apellidos}` : inv.datos ? `${inv.datos.nombre} ${inv.datos.apellidos}` : 'Persona nueva';
  };

  return (
    <div className="border border-blue-100 bg-blue-50/40 rounded-xl p-3 space-y-2">
      {recibidas.length > 0 && (
        <div className="space-y-1.5">
          <span className="text-[10px] font-bold uppercase tracking-wider text-blue-700 flex items-center gap-1">
            <ClipboardCheck className="w-3.5 h-3.5" /> Datos recibidos por revisar ({recibidas.length})
          </span>
          {recibidas.map(inv => (
            <div key={inv.id} className="flex items-center justify-between gap-2 bg-white rounded-lg border border-blue-100 px-3 py-2">
              <div className="min-w-0 text-xs">
                <div className="font-bold text-slate-800 truncate">{nombreDe(inv)}</div>
                <div className="text-[10px] text-slate-400">{inv.clienteId ? 'Cliente existente' : 'Persona nueva'}{inv.completadaEn ? ` · ${formatDate(inv.completadaEn.slice(0, 10))}` : ''}</div>
              </div>
              <button onClick={() => onRevisar(inv)} className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-lg shrink-0">Revisar</button>
            </div>
          ))}
        </div>
      )}
      {esperando.length > 0 && (
        <div className="space-y-1">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1">
            <Clock className="w-3.5 h-3.5" /> Enlaces enviados, esperando respuesta ({esperando.length})
          </span>
          {esperando.map(inv => (
            <div key={inv.id} className="flex items-center justify-between gap-2 text-xs text-slate-500 px-1">
              <span className="truncate">{nombreDe(inv)} · caduca {formatDate(inv.expiraEn.slice(0, 10))}</span>
              <button onClick={() => onCancelar(inv).catch(err => console.error('Error cancelando enlace', err))}
                className="text-[11px] text-slate-400 hover:text-rose-600 underline shrink-0">Anular</button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
