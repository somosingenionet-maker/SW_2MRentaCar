import { useCallback, useEffect, useRef, useState } from 'react';
import { PenTool, Eraser, X } from 'lucide-react';
import ContratoAlquiler from './ContratoAlquiler';
import { IDIOMAS_CONTRATO, TEXTOS_CONTRATO, type IdiomaContrato } from '../utils/contratoTextos';
import { firmaSuficiente, type Punto } from '../utils/firmaContrato';
import type { SnapshotContrato } from '../types';

/** Proporción ancho / alto del recuadro de firma. */
const RELACION = 3;
/** Grosor del trazo, como fracción del ancho: así la firma se ve igual al dibujarla y al guardarla. */
const GROSOR = 0.008;

/** Los puntos van normalizados: x de 0 a 1 sobre el ancho, y en las mismas unidades (alto = 1 / RELACION). */
function pintar(ctx: CanvasRenderingContext2D, trazos: Punto[][], ancho: number) {
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.strokeStyle = '#0f172a';
  ctx.fillStyle = '#0f172a';
  ctx.lineWidth = GROSOR * ancho;
  for (const t of trazos) {
    if (t.length === 0) continue;
    if (t.length === 1) {
      ctx.beginPath();
      ctx.arc(t[0].x * ancho, t[0].y * ancho, (GROSOR * ancho) / 2, 0, Math.PI * 2);
      ctx.fill();
      continue;
    }
    ctx.beginPath();
    ctx.moveTo(t[0].x * ancho, t[0].y * ancho);
    for (let i = 1; i < t.length - 1; i++) {
      const mx = ((t[i].x + t[i + 1].x) / 2) * ancho;
      const my = ((t[i].y + t[i + 1].y) / 2) * ancho;
      ctx.quadraticCurveTo(t[i].x * ancho, t[i].y * ancho, mx, my);
    }
    const u = t[t.length - 1];
    ctx.lineTo(u.x * ancho, u.y * ancho);
    ctx.stroke();
  }
}

/** PNG transparente de la firma, con tamaño fijo para que pese poco y se vea igual en cualquier aparato. */
function exportarPng(trazos: Punto[][]): string {
  const ancho = 1000;
  const lienzo = document.createElement('canvas');
  lienzo.width = ancho;
  lienzo.height = Math.round(ancho / RELACION);
  const ctx = lienzo.getContext('2d');
  if (!ctx) throw new Error('El navegador no permite dibujar la firma.');
  pintar(ctx, trazos, ancho);
  return lienzo.toDataURL('image/png');
}

function Lienzo({ trazos, onTrazos, etiqueta }: { trazos: Punto[][]; onTrazos: (t: Punto[][]) => void; etiqueta: string }) {
  const caja = useRef<HTMLDivElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const trazosRef = useRef(trazos);
  const dibujando = useRef(false);
  trazosRef.current = trazos;

  const redibujar = useCallback(() => {
    const c = canvas.current;
    const b = caja.current;
    if (!c || !b) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const ancho = Math.max(1, Math.round(b.clientWidth * dpr));
    const alto = Math.max(1, Math.round(b.clientHeight * dpr));
    if (c.width !== ancho || c.height !== alto) { c.width = ancho; c.height = alto; }
    const ctx = c.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, c.width, c.height);
    pintar(ctx, trazosRef.current, c.width);
  }, []);

  // Se repinta al cambiar los trazos y al girar el aparato o cambiar el tamaño (los trazos guardan proporciones, no píxeles).
  useEffect(() => { redibujar(); }, [trazos, redibujar]);
  useEffect(() => {
    const b = caja.current;
    if (!b || typeof ResizeObserver === 'undefined') return;
    const o = new ResizeObserver(redibujar);
    o.observe(b);
    return () => o.disconnect();
  }, [redibujar]);

  const punto = (e: React.PointerEvent): Punto => {
    const r = (caja.current as HTMLDivElement).getBoundingClientRect();
    return { x: Math.min(1, Math.max(0, (e.clientX - r.left) / r.width)), y: Math.min(1 / RELACION, Math.max(0, (e.clientY - r.top) / r.width)) };
  };

  return (
    <div
      ref={caja}
      className="relative w-full max-w-xl mx-auto border-2 border-dashed rounded-xl bg-white select-none"
      style={{ aspectRatio: String(RELACION), borderColor: '#C48CD6', touchAction: 'none' }}
    >
      <canvas
        ref={canvas}
        data-testid="lienzo-firma"
        aria-label={etiqueta}
        className="absolute inset-0 w-full h-full cursor-crosshair"
        style={{ touchAction: 'none' }}
        onContextMenu={e => e.preventDefault()}
        onPointerDown={e => {
          e.preventDefault();
          (e.currentTarget as HTMLCanvasElement).setPointerCapture(e.pointerId);
          dibujando.current = true;
          onTrazos([...trazosRef.current, [punto(e)]]);
        }}
        onPointerMove={e => {
          if (!dibujando.current) return;
          e.preventDefault();
          const t = trazosRef.current;
          if (t.length === 0) return;
          onTrazos([...t.slice(0, -1), [...t[t.length - 1], punto(e)]]);
        }}
        onPointerUp={() => { dibujando.current = false; }}
        onPointerCancel={() => { dibujando.current = false; }}
      />
      {trazos.length === 0 && (
        <span className="absolute inset-0 flex items-center justify-center text-sm font-semibold text-slate-300 pointer-events-none">{etiqueta}</span>
      )}
    </div>
  );
}

interface Props {
  contrato: SnapshotContrato;
  logoBase64?: string;
  idiomaInicial: IdiomaContrato;
  onCancelar: () => void;
  onConfirmar: (datos: { firmaPng: string; idioma: IdiomaContrato }) => Promise<void>;
}

/** Pantalla completa en la que el cliente lee el contrato y firma con el dedo. */
export default function FirmaPantalla({ contrato, logoBase64, idiomaInicial, onCancelar, onConfirmar }: Props) {
  const [idioma, setIdioma] = useState<IdiomaContrato>(idiomaInicial);
  const [aceptado, setAceptado] = useState(false);
  const [trazos, setTrazos] = useState<Punto[][]>([]);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState('');
  const tx = TEXTOS_CONTRATO[idioma];
  const t = tx.pantallaFirma;
  const hayFirma = firmaSuficiente(trazos);

  const confirmar = async () => {
    if (!aceptado || guardando) return;
    if (!hayFirma) { setError(t.firmaCorta); return; }
    setGuardando(true);
    setError('');
    try {
      await onConfirmar({ firmaPng: exportarPng(trazos), idioma });
    } catch (err) {
      console.error('Error guardando la firma del contrato', err);
      setError(t.errorGuardar);
      setGuardando(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[60] bg-white flex flex-col print:hidden" role="dialog" aria-modal="true" aria-label={t.titulo} lang={idioma}>
      <header className="shrink-0 px-4 py-3 border-b border-slate-200 flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-2 min-w-0">
          <PenTool className="w-5 h-5 text-blue-600 shrink-0" />
          <h2 className="font-extrabold text-slate-900 text-sm truncate">{t.titulo}</h2>
        </div>
        <div className="flex items-center gap-2">
          <div className="inline-flex rounded-lg border border-slate-300 overflow-hidden text-xs font-bold" role="group" aria-label="Idioma / Language">
            {IDIOMAS_CONTRATO.map(i => (
              <button key={i.id} type="button" onClick={() => setIdioma(i.id)} aria-pressed={idioma === i.id} disabled={guardando}
                className={`px-3 py-1.5 transition cursor-pointer ${idioma === i.id ? 'bg-slate-800 text-white' : 'bg-white text-slate-600 hover:bg-slate-50'}`}>
                {i.etiqueta}
              </button>
            ))}
          </div>
          <button type="button" onClick={onCancelar} disabled={guardando}
            className="px-3 py-1.5 border border-slate-300 rounded-lg text-xs font-bold text-slate-600 hover:bg-slate-50 inline-flex items-center gap-1 cursor-pointer disabled:opacity-50">
            <X className="w-3.5 h-3.5" /> {t.cancelar}
          </button>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto bg-slate-100">
        <p className="px-4 pt-3 text-xs font-semibold text-slate-500 text-center">{t.instruccion}</p>
        <div className="max-w-3xl mx-auto my-3 bg-white shadow rounded-xl">
          <ContratoAlquiler
            reserva={contrato.reserva} cliente={contrato.cliente} vehiculo={contrato.vehiculo}
            empresa={{ ...contrato.empresa, logoBase64 }} idioma={idioma} solicitud={contrato.solicitud}
          />
        </div>
      </div>

      <footer className="shrink-0 border-t border-slate-200 bg-white p-3 space-y-2">
        <label className="flex items-start gap-2 text-xs font-semibold text-slate-700 cursor-pointer max-w-xl mx-auto">
          <input type="checkbox" checked={aceptado} onChange={e => setAceptado(e.target.checked)} disabled={guardando}
            className="mt-0.5 w-5 h-5 shrink-0 accent-blue-600" />
          <span>{t.aceptar}</span>
        </label>
        <Lienzo trazos={trazos} onTrazos={ts => { setTrazos(ts); if (error) setError(''); }} etiqueta={t.firmeAqui} />
        {error && <p role="alert" className="text-xs font-semibold text-rose-600 text-center">{error}</p>}
        <div className="flex gap-2 max-w-xl mx-auto">
          <button type="button" onClick={() => { setTrazos([]); setError(''); }} disabled={guardando || trazos.length === 0}
            className="px-4 py-3 border border-slate-300 rounded-xl text-sm font-bold text-slate-600 hover:bg-slate-50 inline-flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-40">
            <Eraser className="w-4 h-4" /> {t.borrar}
          </button>
          <button type="button" onClick={confirmar} disabled={!aceptado || !hayFirma || guardando}
            className="flex-1 px-4 py-3 rounded-xl text-sm font-extrabold text-white bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-300 disabled:text-white transition cursor-pointer disabled:cursor-not-allowed">
            {guardando ? t.guardando : t.confirmar}
          </button>
        </div>
      </footer>
    </div>
  );
}
