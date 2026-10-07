import { useEffect, useState } from 'react';
import { documentoValido, normalizarDocumento, TipoDocumento } from '../utils/documento';

// Página pública de autorregistro: la abre el cliente desde el enlace que le
// manda el personal (/?registro=<token>). No hay sesión ni acceso a la base de
// datos: todo pasa por la función `registro-cliente`, que valida el enlace.

type Idioma = 'es' | 'en';

const T = {
  es: {
    titulo: 'Tus datos para el alquiler',
    intro: 'Rellena este formulario una sola vez. Nos ahorra papeleo al recoger el vehículo y tarda menos de 2 minutos.',
    cargando: 'Comprobando el enlace…',
    invalido: 'Este enlace no es válido.',
    usado: 'Este enlace ya se ha utilizado. ¡Gracias! Si necesitas cambiar algo, contacta con nosotros.',
    expirado: 'Este enlace ha caducado. Pídenos uno nuevo.',
    errorRed: 'No se pudo conectar. Revisa tu conexión e inténtalo de nuevo.',
    contacto: 'Contacto',
    nombre: 'Nombre', apellidos: 'Apellidos',
    tipoDoc: 'Tipo de documento', dni: 'DNI', nie: 'NIE', pasaporte: 'Pasaporte / otro',
    documento: 'Número de documento',
    correo: 'Correo electrónico', telefono: 'Teléfono (con prefijo)',
    direccion: 'Dirección', ciudad: 'Ciudad', pais: 'País',
    consentimiento: (e: string) => `Acepto que ${e} trate estos datos para gestionar mi alquiler y cumplir las obligaciones legales del contrato.`,
    responsable: (r: string, nif: string, dir: string, mail: string) =>
      `Responsable: ${r}${nif ? ` (NIF ${nif})` : ''}${dir ? `, ${dir}` : ''}. Puedes ejercer tus derechos de acceso, rectificación y supresión escribiendo a ${mail}.`,
    enviar: 'Enviar mis datos', enviando: 'Enviando…',
    gracias: '¡Gracias! Hemos recibido tus datos.',
    graciasSub: 'Ya no necesitas hacer nada más. Nos vemos pronto.',
    revisa: 'Revisa los campos marcados en rojo.',
    errDoc: 'Documento no válido. Revisa el tipo y la letra final.',
    errCampo: 'Campo obligatorio',
    errCorreo: 'Correo no válido', errTel: 'Teléfono no válido', errConsent: 'Necesitamos tu aceptación para continuar',
  },
  en: {
    titulo: 'Your details for the rental',
    intro: 'Please fill in this form once. It saves paperwork when you pick up the vehicle and takes under 2 minutes.',
    cargando: 'Checking your link…',
    invalido: 'This link is not valid.',
    usado: 'This link has already been used. Thank you! If you need to change anything, please contact us.',
    expirado: 'This link has expired. Please ask us for a new one.',
    errorRed: 'Could not connect. Check your connection and try again.',
    contacto: 'Contact',
    nombre: 'First name', apellidos: 'Last name',
    tipoDoc: 'Document type', dni: 'Spanish ID (DNI)', nie: 'Spanish foreigner ID (NIE)', pasaporte: 'Passport / other ID',
    documento: 'Document number',
    correo: 'Email', telefono: 'Phone (with country code)',
    direccion: 'Address', ciudad: 'City', pais: 'Country',
    consentimiento: (e: string) => `I agree that ${e} processes this data to manage my rental and meet the legal requirements of the contract.`,
    responsable: (r: string, nif: string, dir: string, mail: string) =>
      `Controller: ${r}${nif ? ` (Tax ID ${nif})` : ''}${dir ? `, ${dir}` : ''}. You can exercise your rights of access, rectification and erasure by writing to ${mail}.`,
    enviar: 'Send my details', enviando: 'Sending…',
    gracias: 'Thank you! We have received your details.',
    graciasSub: 'There is nothing else you need to do. See you soon.',
    revisa: 'Please check the fields marked in red.',
    errDoc: 'Invalid document. Check the type and the final letter.',
    errCampo: 'Required field',
    errCorreo: 'Invalid email', errTel: 'Invalid phone number', errConsent: 'We need your consent to continue',
  },
} as const;

interface Empresa { nombre: string; color: string; telefono: string; correo: string; razonSocial: string; nif: string; direccion: string }
interface Previo { nombre?: string; apellidos?: string; correo?: string; telefono?: string; direccion?: string; ciudad?: string; pais?: string }
type Carga =
  | { estado: 'cargando' }
  | { estado: 'invalido' | 'usado' | 'expirado' | 'red' }
  | { estado: 'ok'; empresa: Empresa; previo: Previo | null };

const FUNCION = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/registro-cliente`;

function idiomaInicial(): Idioma {
  const forzado = new URLSearchParams(window.location.search).get('lang');
  if (forzado === 'es' || forzado === 'en') return forzado;
  return navigator.language?.toLowerCase().startsWith('es') ? 'es' : 'en';
}

export default function RegistroPublico({ token }: { token: string }) {
  const [idioma, setIdioma] = useState<Idioma>(idiomaInicial);
  const t = T[idioma];
  const [carga, setCarga] = useState<Carga>({ estado: 'cargando' });
  const [enviando, setEnviando] = useState(false);
  const [hecho, setHecho] = useState(false);
  const [errorEnvio, setErrorEnvio] = useState('');
  const [intentado, setIntentado] = useState(false);

  const [f, setF] = useState({
    nombre: '', apellidos: '', tipoDocumento: 'dni' as TipoDocumento, documento: '',
    correo: '', telefono: '', direccion: '', ciudad: '', pais: '', consentimiento: false,
  });
  const set = <K extends keyof typeof f>(k: K, v: (typeof f)[K]) => setF(prev => ({ ...prev, [k]: v }));

  useEffect(() => {
    document.title = idioma === 'es' ? 'Tus datos — 2M Rent a Car' : 'Your details — 2M Rent a Car';
  }, [idioma]);

  useEffect(() => {
    let vivo = true;
    fetch(`${FUNCION}?t=${encodeURIComponent(token)}`)
      .then(r => r.json())
      .then(d => {
        if (!vivo) return;
        if (d.estado !== 'ok') { setCarga({ estado: d.estado === 'usado' || d.estado === 'expirado' ? d.estado : 'invalido' }); return; }
        setCarga({ estado: 'ok', empresa: d.empresa, previo: d.cliente });
        if (d.cliente) {
          setF(prev => ({
            ...prev,
            nombre: d.cliente.nombre ?? '', apellidos: d.cliente.apellidos ?? '', correo: d.cliente.correo ?? '',
            telefono: d.cliente.telefono ?? '', direccion: d.cliente.direccion ?? '', ciudad: d.cliente.ciudad ?? '', pais: d.cliente.pais ?? '',
          }));
        }
      })
      .catch(() => { if (vivo) setCarga({ estado: 'red' }); });
    return () => { vivo = false; };
  }, [token]);

  const doc = normalizarDocumento(f.documento);
  const errores: Record<string, string> = {};
  if (!f.nombre.trim()) errores.nombre = t.errCampo;
  if (!f.apellidos.trim()) errores.apellidos = t.errCampo;
  if (!documentoValido(f.tipoDocumento, doc)) errores.documento = t.errDoc;
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(f.correo.trim())) errores.correo = t.errCorreo;
  if (f.telefono.replace(/\D/g, '').length < 7) errores.telefono = t.errTel;
  if (!f.direccion.trim()) errores.direccion = t.errCampo;
  if (!f.ciudad.trim()) errores.ciudad = t.errCampo;
  if (!f.pais.trim()) errores.pais = t.errCampo;
  if (!f.consentimiento) errores.consentimiento = t.errConsent;

  const enviar = async (e: React.FormEvent) => {
    e.preventDefault();
    setIntentado(true);
    setErrorEnvio('');
    if (Object.keys(errores).length) return;
    setEnviando(true);
    try {
      const r = await fetch(FUNCION, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, datos: { ...f, documento: doc, idioma } }),
      });
      if (r.ok) { setHecho(true); return; }
      const d = await r.json().catch(() => ({}));
      if (d.error === 'usado' || d.error === 'expirado') setCarga({ estado: d.error });
      else if (d.error === 'validacion') setErrorEnvio(t.revisa);
      else setErrorEnvio(t.errorRed);
    } catch {
      setErrorEnvio(t.errorRed);
    } finally {
      setEnviando(false);
    }
  };

  const color = carga.estado === 'ok' ? carga.empresa.color : '#C38DD6';
  const nombreEmpresa = carga.estado === 'ok' ? carga.empresa.nombre : '2M Rent a Car';
  const campo = (k: string) =>
    `w-full mt-1 px-3 py-3 border rounded-xl text-base bg-white focus:outline-none focus:ring-2 focus:ring-purple-300 ${
      intentado && errores[k] ? 'border-rose-400 bg-rose-50/40' : 'border-slate-200'
    }`;
  const msgError = (k: string) => (intentado && errores[k] ? <p className="text-xs text-rose-600 mt-1">{errores[k]}</p> : null);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 font-sans" style={{ backgroundImage: `linear-gradient(180deg, ${color}33, transparent 280px)` }}>
      <div className="max-w-xl mx-auto px-4 py-6 sm:py-10">
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-2.5">
            <img src="/favicon.webp" alt="" className="w-10 h-10 rounded-xl bg-white p-1 shadow-sm" />
            <span className="font-extrabold text-lg">{nombreEmpresa}</span>
          </div>
          <div className="inline-flex rounded-lg border border-slate-200 overflow-hidden text-xs font-bold bg-white">
            {(['es', 'en'] as Idioma[]).map(l => (
              <button key={l} type="button" onClick={() => setIdioma(l)}
                className={`px-3 py-1.5 ${idioma === l ? 'text-white' : 'text-slate-500'}`}
                style={idioma === l ? { backgroundColor: '#7A4A93' } : undefined}>
                {l.toUpperCase()}
              </button>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-5 sm:p-7">
          {carga.estado === 'cargando' && <p className="text-center text-slate-400 py-10">{t.cargando}</p>}

          {(carga.estado === 'invalido' || carga.estado === 'usado' || carga.estado === 'expirado' || carga.estado === 'red') && (
            <p className="text-center text-slate-600 py-10">
              {carga.estado === 'invalido' ? t.invalido : carga.estado === 'usado' ? t.usado : carga.estado === 'expirado' ? t.expirado : t.errorRed}
            </p>
          )}

          {carga.estado === 'ok' && hecho && (
            <div className="text-center py-8 space-y-2">
              <div className="mx-auto w-14 h-14 rounded-full flex items-center justify-center text-3xl text-white" style={{ backgroundColor: '#7A4A93' }}>✓</div>
              <h1 className="text-xl font-extrabold">{t.gracias}</h1>
              <p className="text-slate-500 text-sm">{t.graciasSub}</p>
            </div>
          )}

          {carga.estado === 'ok' && !hecho && (
            <form onSubmit={enviar} noValidate className="space-y-4">
              <div>
                <h1 className="text-xl font-extrabold">{t.titulo}</h1>
                <p className="text-sm text-slate-500 mt-1">{t.intro}</p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <label className="block text-sm font-semibold">{t.nombre}
                  <input className={campo('nombre')} autoComplete="given-name" value={f.nombre} onChange={e => set('nombre', e.target.value)} />
                  {msgError('nombre')}
                </label>
                <label className="block text-sm font-semibold">{t.apellidos}
                  <input className={campo('apellidos')} autoComplete="family-name" value={f.apellidos} onChange={e => set('apellidos', e.target.value)} />
                  {msgError('apellidos')}
                </label>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <label className="block text-sm font-semibold">{t.tipoDoc}
                  <select className={campo('tipo')} value={f.tipoDocumento} onChange={e => set('tipoDocumento', e.target.value as TipoDocumento)}>
                    <option value="dni">{t.dni}</option>
                    <option value="nie">{t.nie}</option>
                    <option value="pasaporte">{t.pasaporte}</option>
                  </select>
                </label>
                <label className="block text-sm font-semibold">{t.documento}
                  <input className={campo('documento')} autoCapitalize="characters" autoComplete="off" value={f.documento} onChange={e => set('documento', e.target.value)} />
                  {msgError('documento')}
                </label>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <label className="block text-sm font-semibold">{t.correo}
                  <input type="email" inputMode="email" className={campo('correo')} autoComplete="email" value={f.correo} onChange={e => set('correo', e.target.value)} />
                  {msgError('correo')}
                </label>
                <label className="block text-sm font-semibold">{t.telefono}
                  <input type="tel" inputMode="tel" className={campo('telefono')} autoComplete="tel" value={f.telefono} onChange={e => set('telefono', e.target.value)} />
                  {msgError('telefono')}
                </label>
              </div>

              <label className="block text-sm font-semibold">{t.direccion}
                <input className={campo('direccion')} autoComplete="street-address" value={f.direccion} onChange={e => set('direccion', e.target.value)} />
                {msgError('direccion')}
              </label>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <label className="block text-sm font-semibold">{t.ciudad}
                  <input className={campo('ciudad')} autoComplete="address-level2" value={f.ciudad} onChange={e => set('ciudad', e.target.value)} />
                  {msgError('ciudad')}
                </label>
                <label className="block text-sm font-semibold">{t.pais}
                  <input className={campo('pais')} autoComplete="country-name" value={f.pais} onChange={e => set('pais', e.target.value)} />
                  {msgError('pais')}
                </label>
              </div>

              <div className={`rounded-xl border p-3 ${intentado && errores.consentimiento ? 'border-rose-400 bg-rose-50/40' : 'border-slate-200 bg-slate-50'}`}>
                <label className="flex items-start gap-2.5 text-sm cursor-pointer">
                  <input type="checkbox" className="mt-1 w-4 h-4" checked={f.consentimiento} onChange={e => set('consentimiento', e.target.checked)} />
                  <span>{t.consentimiento(carga.empresa.nombre)}</span>
                </label>
                <p className="text-[11px] text-slate-400 mt-2 leading-relaxed">
                  {t.responsable(carga.empresa.razonSocial || carga.empresa.nombre, carga.empresa.nif, carga.empresa.direccion, carga.empresa.correo)}
                </p>
                {msgError('consentimiento')}
              </div>

              {intentado && Object.keys(errores).length > 0 && <p className="text-sm text-rose-600 font-semibold">{t.revisa}</p>}
              {errorEnvio && <p className="text-sm text-rose-600 font-semibold">{errorEnvio}</p>}

              <button type="submit" disabled={enviando}
                className="w-full py-3.5 rounded-xl text-white font-extrabold text-base disabled:opacity-60 transition"
                style={{ backgroundColor: '#7A4A93' }}>
                {enviando ? t.enviando : t.enviar}
              </button>
            </form>
          )}
        </div>
        <p className="text-center text-[11px] text-slate-400 mt-4">{carga.estado === 'ok' ? `${carga.empresa.telefono} · ${carga.empresa.correo}` : ''}</p>
      </div>
    </div>
  );
}
