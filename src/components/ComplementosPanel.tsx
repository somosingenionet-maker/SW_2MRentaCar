import { InputPrecio } from './InputPrecio';
import { useState } from 'react';
import { Package, Plus, Edit2, Trash2, Check } from 'lucide-react';
import type { Complemento } from '../types';
import { genId } from '../utils/id';
import { etiquetaPrecioComplemento } from '../utils/complementos';

interface Props {
  complementos: Complemento[];
  onAdd: (c: Complemento) => void;
  onUpdate: (c: Complemento) => void;
  onDelete: (id: string) => void;
}

interface Formulario { nombre: string; precio: string; porDia: boolean; activo: boolean; error: string }

/** Catálogo de complementos que se pueden añadir a una reserva manual: precio por día o precio fijo. */
export default function ComplementosPanel({ complementos, onAdd, onUpdate, onDelete }: Props) {
  const [form, setForm] = useState<Formulario | null>(null);
  const [editandoId, setEditandoId] = useState<string | null>(null);
  const [borrar, setBorrar] = useState<string | null>(null);
  const ordenados = [...complementos].sort((a, b) => a.orden - b.orden || a.nombre.localeCompare(b.nombre));

  const abrir = (c?: Complemento) => {
    setEditandoId(c?.id ?? null);
    setForm({ nombre: c?.nombre ?? '', precio: c ? String(c.precio) : '', porDia: c?.porDia ?? true, activo: c?.activo ?? true, error: '' });
  };

  const guardar = () => {
    if (!form) return;
    const nombre = form.nombre.trim();
    const precio = Number(form.precio.replace(',', '.'));
    if (!nombre) { setForm({ ...form, error: 'Escribe el nombre del complemento.' }); return; }
    if (form.precio.trim() === '' || !Number.isFinite(precio) || precio < 0) { setForm({ ...form, error: 'Indica un precio válido (0 o más).' }); return; }
    if (complementos.some(c => c.id !== editandoId && c.nombre.trim().toLowerCase() === nombre.toLowerCase())) {
      setForm({ ...form, error: 'Ya hay un complemento con ese nombre.' });
      return;
    }
    const datos = { nombre, precio: Math.round(precio * 100) / 100, porDia: form.porDia, activo: form.activo };
    const existente = editandoId ? complementos.find(c => c.id === editandoId) : undefined;
    if (existente) onUpdate({ ...existente, ...datos });
    else onAdd({ id: genId('comp'), orden: Math.max(0, ...complementos.map(c => c.orden)) + 1, ...datos });
    setForm(null);
    setEditandoId(null);
  };

  return (
    <div className="p-5 space-y-3" data-testid="panel-complementos">
      <div className="flex items-center justify-between">
        <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
          <Package className="w-3.5 h-3.5 text-orange-500" /> Complementos de alquiler
        </h3>
        <button type="button" onClick={() => abrir()} className="flex items-center gap-1 px-2.5 py-1.5 bg-orange-500 hover:bg-orange-600 text-white text-xs font-bold rounded-lg transition cursor-pointer">
          <Plus className="w-3 h-3" /> Añadir
        </button>
      </div>

      {form && (
        <div className="bg-orange-50 border border-orange-200 rounded-xl p-3 space-y-2">
          <input type="text" value={form.nombre} onChange={e => setForm({ ...form, nombre: e.target.value, error: '' })} placeholder="Nombre *" aria-label="Nombre del complemento"
            className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400" />
          <div className="grid grid-cols-2 gap-2">
            <InputPrecio value={form.precio} onChange={e => setForm({ ...form, precio: e.target.value, error: '' })} placeholder="Precio en € *" aria-label="Precio en euros"
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400" />
            <select value={form.porDia ? 'dia' : 'fijo'} onChange={e => setForm({ ...form, porDia: e.target.value === 'dia' })} aria-label="Cómo se cobra"
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-orange-400">
              <option value="dia">Por día</option>
              <option value="fijo">Precio fijo</option>
            </select>
          </div>
          <label className="flex items-center gap-2 text-xs font-semibold text-slate-600 cursor-pointer">
            <input type="checkbox" checked={form.activo} onChange={e => setForm({ ...form, activo: e.target.checked })} />
            Disponible al crear reservas
          </label>
          {form.error && <p role="alert" className="text-xs font-semibold text-rose-600">{form.error}</p>}
          <div className="flex gap-2 justify-end">
            <button type="button" onClick={() => { setForm(null); setEditandoId(null); }} className="px-3 py-1.5 text-xs font-semibold text-slate-600 border border-slate-200 rounded-lg hover:bg-slate-100 transition cursor-pointer">Cancelar</button>
            <button type="button" onClick={guardar} className="px-3 py-1.5 text-xs font-bold text-white bg-orange-500 hover:bg-orange-600 rounded-lg transition flex items-center gap-1 cursor-pointer"><Check className="w-3 h-3" /> Guardar</button>
          </div>
        </div>
      )}

      {ordenados.length === 0 ? (
        <p className="text-xs text-slate-400 italic text-center py-3">Sin complementos. Añade el primero.</p>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-2">
          {ordenados.map(c => (
            <div key={c.id} data-testid="fila-complemento" className={`flex items-center justify-between gap-2 border rounded-xl px-3 py-2.5 ${c.activo ? 'bg-slate-50 border-slate-100' : 'bg-slate-50/50 border-slate-100 opacity-70'}`}>
              <div className="min-w-0">
                <p className="text-sm font-semibold text-slate-700 truncate">{c.nombre}{!c.activo && <span className="ml-2 text-[10px] font-bold text-slate-400 uppercase">No disponible</span>}</p>
                <p className="text-xs text-slate-500">{etiquetaPrecioComplemento(c)}</p>
              </div>
              {borrar === c.id ? (
                <div className="flex items-center gap-1.5 text-[11px] shrink-0">
                  <span className="font-semibold text-amber-700">¿Eliminar?</span>
                  <button type="button" onClick={() => { onDelete(c.id); setBorrar(null); }} className="px-2 py-1 rounded-md bg-rose-600 text-white font-bold cursor-pointer">Sí</button>
                  <button type="button" onClick={() => setBorrar(null)} className="px-2 py-1 rounded-md border border-slate-300 text-slate-600 font-bold cursor-pointer">No</button>
                </div>
              ) : (
                <div className="flex gap-1 shrink-0">
                  <button type="button" onClick={() => abrir(c)} aria-label={`Editar ${c.nombre}`} className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition cursor-pointer"><Edit2 className="w-3.5 h-3.5" /></button>
                  <button type="button" onClick={() => setBorrar(c.id)} aria-label={`Eliminar ${c.nombre}`} className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition cursor-pointer"><Trash2 className="w-3.5 h-3.5" /></button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
      <p className="text-[11px] text-slate-400">Eliminar un complemento no cambia las reservas que ya lo llevan. Si solo quieres dejar de ofrecerlo, desmarca «Disponible».</p>
    </div>
  );
}
