import { useCallback, useEffect, useRef, useState } from 'react';
import { Bell, BellOff, Check, ChevronDown, ChevronUp, Gauge, RefreshCw, Wrench, Package, StickyNote, WifiOff } from 'lucide-react';
import {
  ETIQUETA_ESTADO_TALLER, descripcionVehiculo, haceCuanto, ordenarParaMecanico, ordenesNuevas, progresoMecanico,
  type OrdenMecanico, type PaginaMecanico,
} from '../utils/tallerMecanico';
import { formatDate } from '../utils/dateFormat';

// Página pública del mecánico: la abre desde el enlace personal que le manda el taller (/?taller=<token>).
// No hay sesión ni acceso a la base de datos: todo pasa por la función `taller-mecanico`, que solo le da
// SUS órdenes y sin precios ni datos del cliente.

const FUNCION = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/taller-mecanico`;
const CADA_MS = 20_000;
const CLAVE_AVISOS = 'taller_mecanico_avisos';

type Carga =
  | { estado: 'cargando' }
  | { estado: 'invalido' }
  | { estado: 'ok'; pagina: PaginaMecanico };

const COLOR_ESTADO: Record<OrdenMecanico['estado'], string> = {
  recibido: 'bg-slate-100 text-slate-700',
  en_reparacion: 'bg-amber-100 text-amber-800',
  listo: 'bg-emerald-100 text-emerald-800',
};

const leerAvisos = (): boolean => { try { return localStorage.getItem(CLAVE_AVISOS) === '1'; } catch { return false; } };
const guardarAvisos = (v: boolean) => { try { localStorage.setItem(CLAVE_AVISOS, v ? '1' : '0'); } catch { /* sin almacenamiento: no se recuerda */ } };

export default function TallerMecanico({ token }: { token: string }) {
  const [carga, setCarga] = useState<Carga>({ estado: 'cargando' });
  const [sinRed, setSinRed] = useState(false);
  const [ahora, setAhora] = useState(() => Date.now());
  const [ultima, setUltima] = useState<number | null>(null);
  const [abierta, setAbierta] = useState<string | null>(null);
  const [nuevas, setNuevas] = useState<Set<string>>(new Set());
  const [ocupado, setOcupado] = useState<string | null>(null);
  const [aviso, setAviso] = useState('');
  const [confirmarListo, setConfirmarListo] = useState<string | null>(null);
  const [notas, setNotas] = useState<Record<string, string>>({});
  const [avisosActivos, setAvisosActivos] = useState(leerAvisos);
  const idsPrevios = useRef<Set<string> | null>(null);
  const audio = useRef<AudioContext | null>(null);
  const avisosRef = useRef(avisosActivos);
  avisosRef.current = avisosActivos;

  // Pitido corto + vibración + notificación del navegador (si se dio permiso) cuando llega un coche nuevo.
  const avisarNuevas = useCallback((nuevos: OrdenMecanico[]) => {
    if (nuevos.length === 0) return;
    setNuevas(prev => new Set([...prev, ...nuevos.map(o => o.id)]));
    if (!avisosRef.current) return;
    try {
      const ctx = audio.current;
      if (ctx) {
        for (const [inicio, hz] of [[0, 880], [0.22, 1175]] as const) {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.frequency.value = hz;
          gain.gain.setValueAtTime(0.0001, ctx.currentTime + inicio);
          gain.gain.exponentialRampToValueAtTime(0.25, ctx.currentTime + inicio + 0.02);
          gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + inicio + 0.2);
          osc.connect(gain).connect(ctx.destination);
          osc.start(ctx.currentTime + inicio);
          osc.stop(ctx.currentTime + inicio + 0.22);
        }
      }
      navigator.vibrate?.([200, 100, 200]);
      if (typeof Notification !== 'undefined' && Notification.permission === 'granted') {
        const o = nuevos[0];
        new Notification(nuevos.length > 1 ? `${nuevos.length} coches nuevos en el taller` : `Coche nuevo: ${o.vehiculo.matricula ?? o.numero}`, {
          body: nuevos.length > 1 ? 'Abre tu lista para verlos.' : descripcionVehiculo(o.vehiculo),
        });
      }
    } catch { /* un aviso que falla no debe romper la página */ }
  }, []);

  const aplicar = useCallback((pagina: PaginaMecanico) => {
    avisarNuevas(ordenesNuevas(idsPrevios.current, pagina.ordenes).map(id => pagina.ordenes.find(o => o.id === id)!));
    idsPrevios.current = new Set(pagina.ordenes.map(o => o.id));
    setCarga({ estado: 'ok', pagina });
    setUltima(Date.now());
    setSinRed(false);
  }, [avisarNuevas]);

  const cargar = useCallback(async () => {
    try {
      const r = await fetch(`${FUNCION}?t=${encodeURIComponent(token)}`);
      const d = await r.json();
      if (d.estado === 'ok') aplicar(d as PaginaMecanico);
      else setCarga({ estado: 'invalido' });
    } catch {
      setSinRed(true);
    }
  }, [token, aplicar]);

  // Carga inicial, repetición cada 20 s mientras la página está a la vista, y al volver a ella.
  useEffect(() => {
    void cargar();
    const pulso = setInterval(() => { setAhora(Date.now()); if (!document.hidden) void cargar(); }, CADA_MS);
    const alVolver = () => { if (!document.hidden) void cargar(); };
    document.addEventListener('visibilitychange', alVolver);
    return () => { clearInterval(pulso); document.removeEventListener('visibilitychange', alVolver); };
  }, [cargar]);

  useEffect(() => {
    if (carga.estado === 'ok') document.title = `${nuevas.size > 0 ? `(${nuevas.size}) ` : ''}Taller · ${carga.pagina.tecnico.nombre}`;
  }, [carga, nuevas]);

  const enviar = async (clave: string, cuerpo: Record<string, unknown>) => {
    setOcupado(clave);
    setAviso('');
    try {
      const r = await fetch(FUNCION, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ token, ...cuerpo }) });
      const d = await r.json().catch(() => ({}));
      if (r.status === 403) { setCarga({ estado: 'invalido' }); return false; }
      if (d.estado === 'ok') { aplicar(d as PaginaMecanico); return true; }
      if (r.status === 409 && d.ordenes) {
        aplicar(d as PaginaMecanico);
        setAviso('Esa orden ha cambiado mientras tanto. Se ha actualizado la lista.');
        return false;
      }
      setAviso('No se pudo guardar. Inténtalo de nuevo.');
      return false;
    } catch {
      setAviso('Sin conexión: no se guardó. Inténtalo de nuevo cuando tengas cobertura.');
      return false;
    } finally {
      setOcupado(null);
    }
  };

  const activarAvisos = async () => {
    if (avisosActivos) { setAvisosActivos(false); guardarAvisos(false); return; }
    try {
      // El navegador solo deja sonar y pedir permiso tras un toque del usuario: se hace aquí.
      const Ctx = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (Ctx && !audio.current) audio.current = new Ctx();
      await audio.current?.resume();
      if (typeof Notification !== 'undefined' && Notification.permission === 'default') await Notification.requestPermission();
    } catch { /* sin sonido o sin notificaciones: queda al menos la marca «Nuevo» */ }
    setAvisosActivos(true);
    guardarAvisos(true);
  };

  if (carga.estado === 'cargando') {
    return <Pantalla><p className="text-sm text-slate-500 text-center py-20">{sinRed ? 'No se pudo conectar. Reintentando…' : 'Cargando tus órdenes…'}</p></Pantalla>;
  }
  if (carga.estado === 'invalido') {
    return (
      <Pantalla>
        <div className="text-center py-20 px-6 space-y-2">
          <Wrench className="w-10 h-10 text-slate-300 mx-auto" />
          <h1 className="text-lg font-extrabold text-slate-800">Este enlace ya no está activo</h1>
          <p className="text-sm text-slate-500">Pide uno nuevo en el taller.</p>
        </div>
      </Pantalla>
    );
  }

  const { pagina } = carga;
  const color = pagina.empresa.color || '#C38DD6';
  const ordenes = ordenarParaMecanico(pagina.ordenes);

  return (
    <Pantalla>
      <header className="px-4 pt-4 pb-3 text-white" style={{ backgroundColor: '#1e293b' }}>
        <div className="flex items-center justify-between gap-2">
          <div className="min-w-0">
            <p className="text-[11px] font-bold uppercase tracking-wider opacity-70 truncate">{pagina.empresa.nombre} · Taller</p>
            <h1 className="text-lg font-extrabold truncate">Hola, {pagina.tecnico.nombre}</h1>
          </div>
          <button type="button" onClick={activarAvisos} aria-pressed={avisosActivos}
            className={`shrink-0 px-3 py-2 rounded-xl text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer ${avisosActivos ? 'bg-emerald-500 text-white' : 'bg-white/15 text-white'}`}>
            {avisosActivos ? <Bell className="w-4 h-4" /> : <BellOff className="w-4 h-4" />} {avisosActivos ? 'Avisos activos' : 'Activar avisos'}
          </button>
        </div>
        <div className="mt-2 flex items-center justify-between text-[11px] opacity-80">
          <span>{ordenes.length} {ordenes.length === 1 ? 'coche' : 'coches'} en tu lista</span>
          <button type="button" onClick={() => void cargar()} className="inline-flex items-center gap-1 cursor-pointer" aria-label="Actualizar ahora">
            <RefreshCw className="w-3 h-3" /> Actualizado {ultima ? (haceCuanto(new Date(ultima).toISOString(), ahora) || 'ahora mismo') : '—'}
          </button>
        </div>
        <div className="h-1 mt-3 rounded-full" style={{ backgroundColor: color }} />
      </header>

      {sinRed && (
        <p role="status" className="px-4 py-2 bg-amber-50 text-amber-800 text-xs font-semibold flex items-center gap-1.5">
          <WifiOff className="w-3.5 h-3.5" /> Sin conexión. Se reintenta solo; lo que ves puede no estar al día.
        </p>
      )}
      {aviso && <p role="alert" className="px-4 py-2 bg-rose-50 text-rose-700 text-xs font-semibold">{aviso}</p>}

      <main className="p-3 space-y-3">
        {ordenes.length === 0 && (
          <div className="text-center py-16 px-6 space-y-1">
            <Check className="w-9 h-9 text-slate-300 mx-auto" />
            <p className="text-sm font-bold text-slate-600">No tienes coches asignados ahora</p>
            <p className="text-xs text-slate-400">Cuando te asignen uno, aparecerá aquí y te avisaremos.</p>
          </div>
        )}
        {ordenes.map(o => (
          <Tarjeta
            key={o.id} orden={o} color={color} ahora={ahora}
            abierta={abierta === o.id} nueva={nuevas.has(o.id)} ocupado={ocupado}
            nota={notas[o.id] ?? ''} confirmandoListo={confirmarListo === o.id}
            onAbrir={() => {
              setAbierta(abierta === o.id ? null : o.id);
              setNuevas(prev => { const n = new Set(prev); n.delete(o.id); return n; });
            }}
            onTarea={(lineaId, hecha) => void enviar(`t-${lineaId}`, { accion: 'tarea', otId: o.id, lineaId, hecha })}
            onEmpezar={() => void enviar(`e-${o.id}`, { accion: 'empezar', otId: o.id })}
            onListo={() => {
              const { hechas, total } = progresoMecanico(o);
              if (hechas < total && confirmarListo !== o.id) { setConfirmarListo(o.id); return; }
              setConfirmarListo(null);
              void enviar(`l-${o.id}`, { accion: 'listo', otId: o.id });
            }}
            onCancelarListo={() => setConfirmarListo(null)}
            onReabrir={() => void enviar(`r-${o.id}`, { accion: 'reabrir', otId: o.id })}
            onNota={t => setNotas(prev => ({ ...prev, [o.id]: t }))}
            onEnviarNota={async () => { if (await enviar(`n-${o.id}`, { accion: 'nota', otId: o.id, texto: notas[o.id] ?? '' })) setNotas(prev => ({ ...prev, [o.id]: '' })); }}
          />
        ))}
      </main>
    </Pantalla>
  );
}

function Pantalla({ children }: { children: React.ReactNode }) {
  return <div className="min-h-screen bg-slate-50 text-slate-800 font-sans"><div className="max-w-xl mx-auto min-h-screen bg-slate-50">{children}</div></div>;
}

interface TarjetaProps {
  orden: OrdenMecanico;
  color: string;
  ahora: number;
  abierta: boolean;
  nueva: boolean;
  ocupado: string | null;
  nota: string;
  confirmandoListo: boolean;
  onAbrir: () => void;
  onTarea: (lineaId: string, hecha: boolean) => void;
  onEmpezar: () => void;
  onListo: () => void;
  onCancelarListo: () => void;
  onReabrir: () => void;
  onNota: (t: string) => void;
  onEnviarNota: () => void;
}

export function Tarjeta({ orden: o, color, ahora, abierta, nueva, ocupado, nota, confirmandoListo, onAbrir, onTarea, onEmpezar, onListo, onCancelarListo, onReabrir, onNota, onEnviarNota }: TarjetaProps) {
  const { hechas, total } = progresoMecanico(o);
  const pct = total > 0 ? Math.round((hechas / total) * 100) : 0;
  const bloqueado = ocupado !== null;

  return (
    <article className={`bg-white rounded-2xl border shadow-sm overflow-hidden ${nueva ? 'border-2' : 'border-slate-200'}`} style={nueva ? { borderColor: color } : undefined}>
      <button type="button" onClick={onAbrir} aria-expanded={abierta} className="w-full text-left p-4 flex items-start gap-3 cursor-pointer">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xl font-black font-mono tracking-wide text-slate-900">{o.vehiculo.matricula ?? '—'}</span>
            <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${COLOR_ESTADO[o.estado]}`}>{ETIQUETA_ESTADO_TALLER[o.estado]}</span>
            {nueva && <span className="text-[11px] font-bold px-2 py-0.5 rounded-full text-white" style={{ backgroundColor: color }}>Nuevo</span>}
          </div>
          <p className="text-sm font-semibold text-slate-700 mt-0.5">{descripcionVehiculo(o.vehiculo)}</p>
          {o.problema && !abierta && <p className="text-xs text-slate-500 mt-1 line-clamp-2 whitespace-pre-line">{o.problema}</p>}
          {total > 0 && (
            <div className="mt-2" aria-label={`${hechas} de ${total} tareas hechas`}>
              <div className="h-2 rounded-full bg-slate-100 overflow-hidden"><div className="h-full rounded-full bg-emerald-500 transition-all" style={{ width: `${pct}%` }} /></div>
              <p className="text-[11px] font-semibold text-slate-500 mt-1">{hechas} de {total} tareas</p>
            </div>
          )}
        </div>
        {abierta ? <ChevronUp className="w-5 h-5 text-slate-400 shrink-0 mt-1" /> : <ChevronDown className="w-5 h-5 text-slate-400 shrink-0 mt-1" />}
      </button>

      {abierta && (
        <div className="px-4 pb-4 space-y-4 border-t border-slate-100 pt-3">
          <dl className="grid grid-cols-2 gap-2 text-xs">
            <div><dt className="text-slate-400 font-semibold">Orden</dt><dd className="font-bold text-slate-700">{o.numero}</dd></div>
            <div><dt className="text-slate-400 font-semibold">Entrada</dt><dd className="font-bold text-slate-700">{formatDate(o.recepcion)}</dd></div>
            {o.kilometraje != null && <div><dt className="text-slate-400 font-semibold flex items-center gap-1"><Gauge className="w-3 h-3" /> Kilometraje</dt><dd className="font-bold text-slate-700">{o.kilometraje.toLocaleString('es-ES')} km</dd></div>}
            {o.fechaEstimadaEntrega && <div><dt className="text-slate-400 font-semibold">Entrega prevista</dt><dd className="font-bold text-slate-700">{formatDate(o.fechaEstimadaEntrega)}</dd></div>}
            {o.actualizada && <div className="col-span-2"><dt className="text-slate-400 font-semibold">Última novedad</dt><dd className="font-bold text-slate-700">{haceCuanto(o.actualizada, ahora)}</dd></div>}
          </dl>

          {o.problema && <Bloque titulo="Problema">{o.problema}</Bloque>}
          {o.diagnostico && <Bloque titulo="Diagnóstico">{o.diagnostico}</Bloque>}
          {o.notas && <Bloque titulo="Notas del taller" icono={<StickyNote className="w-3.5 h-3.5" />}>{o.notas}</Bloque>}

          <section>
            <h3 className="text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-2 flex items-center gap-1"><Wrench className="w-3.5 h-3.5" /> Tareas</h3>
            {o.tareas.length === 0 ? (
              <p className="text-xs text-slate-400">Esta orden no tiene tareas detalladas. Guíate por el problema y el diagnóstico.</p>
            ) : (
              <ul className="space-y-2">
                {o.tareas.map(t => (
                  <li key={t.id}>
                    <button type="button" role="checkbox" aria-checked={t.hecha} disabled={bloqueado} onClick={() => onTarea(t.id, !t.hecha)}
                      className={`w-full min-h-[52px] px-3 py-2 rounded-xl border-2 flex items-center gap-3 text-left transition cursor-pointer disabled:opacity-60 ${t.hecha ? 'bg-emerald-50 border-emerald-300' : 'bg-white border-slate-200 active:bg-slate-50'}`}>
                      <span className={`w-7 h-7 rounded-lg border-2 shrink-0 flex items-center justify-center ${t.hecha ? 'bg-emerald-500 border-emerald-500 text-white' : 'border-slate-300'}`}>
                        {t.hecha && <Check className="w-5 h-5" />}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className={`block text-sm font-semibold ${t.hecha ? 'text-slate-500 line-through' : 'text-slate-800'}`}>{t.descripcion}</span>
                        {t.hecha && t.hechaEn && <span className="block text-[11px] text-slate-400">{t.hechaPor} · {haceCuanto(t.hechaEn, ahora)}</span>}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </section>

          {o.piezas.length > 0 && (
            <section>
              <h3 className="text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1 flex items-center gap-1"><Package className="w-3.5 h-3.5" /> Piezas previstas</h3>
              <ul className="text-xs text-slate-600 space-y-0.5">
                {o.piezas.map((p, i) => <li key={i}>• {p.descripcion} <span className="text-slate-400">× {p.cantidad}</span></li>)}
              </ul>
            </section>
          )}

          <section className="space-y-2">
            <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500 block" htmlFor={`nota-${o.id}`}>Añadir una nota para el taller</label>
            <textarea id={`nota-${o.id}`} rows={2} maxLength={500} value={nota} onChange={e => onNota(e.target.value)} placeholder="Ej.: falta una pieza, hay que avisar al cliente…"
              className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-slate-400" />
            <button type="button" onClick={onEnviarNota} disabled={bloqueado || nota.trim().length < 2}
              className="px-4 py-2.5 rounded-xl text-xs font-bold bg-slate-800 text-white disabled:bg-slate-300 cursor-pointer disabled:cursor-not-allowed">Enviar nota</button>
          </section>

          <div className="space-y-2 pt-1">
            {o.estado === 'recibido' && (
              <button type="button" onClick={onEmpezar} disabled={bloqueado}
                className="w-full py-4 rounded-xl text-base font-extrabold text-white bg-amber-500 active:bg-amber-600 disabled:opacity-60 cursor-pointer">Empezar reparación</button>
            )}
            {(o.estado === 'en_reparacion' || o.estado === 'recibido') && (
              confirmandoListo ? (
                <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 space-y-2">
                  <p className="text-sm font-semibold text-amber-900">Faltan {total - hechas} {total - hechas === 1 ? 'tarea' : 'tareas'} por marcar. ¿Marcar el coche como listo igualmente?</p>
                  <div className="flex gap-2">
                    <button type="button" onClick={onCancelarListo} className="flex-1 py-3 rounded-xl text-sm font-bold border border-slate-300 bg-white cursor-pointer">Volver</button>
                    <button type="button" onClick={onListo} disabled={bloqueado} className="flex-1 py-3 rounded-xl text-sm font-extrabold text-white bg-emerald-600 disabled:opacity-60 cursor-pointer">Sí, está listo</button>
                  </div>
                </div>
              ) : (
                <button type="button" onClick={onListo} disabled={bloqueado}
                  className={`w-full py-4 rounded-xl text-base font-extrabold text-white bg-emerald-600 active:bg-emerald-700 disabled:opacity-60 cursor-pointer ${o.estado === 'recibido' ? 'opacity-90' : ''}`}>Marcar como listo</button>
              )
            )}
            {o.estado === 'listo' && (
              <button type="button" onClick={onReabrir} disabled={bloqueado}
                className="w-full py-3 rounded-xl text-sm font-bold border-2 border-slate-300 bg-white text-slate-700 disabled:opacity-60 cursor-pointer">Reabrir (aún queda trabajo)</button>
            )}
          </div>
        </div>
      )}
    </article>
  );
}

function Bloque({ titulo, icono, children }: { titulo: string; icono?: React.ReactNode; children: React.ReactNode }) {
  return (
    <section>
      <h3 className="text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1 flex items-center gap-1">{icono}{titulo}</h3>
      <p className="text-sm text-slate-700 whitespace-pre-line">{children}</p>
    </section>
  );
}
