import React, { useState } from 'react';
import { Lock, Eye, EyeOff, Check, ShieldCheck } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { getEmpresaConfig } from '../data/mockData';

const BRAND = {
  lilaClaro: '#DCBAE8',
  lilaOscuro: '#C38DD6',
  tinta: '#3A1D4A',
  tintaSuave: '#5E4072',
  profundo: '#7A4A93',
};

interface Props {
  onDone: () => void;
}

export default function ResetPasswordScreen({ onDone }: Props) {
  const empresa = getEmpresaConfig();
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [ok, setOk] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (password.length < 6) { setError('La contraseña debe tener al menos 6 caracteres.'); return; }
    if (password !== confirm) { setError('Las contraseñas no coinciden.'); return; }
    setLoading(true);
    const { error: updErr } = await supabase.auth.updateUser({ password });
    setLoading(false);
    if (updErr) {
      setError('No se pudo actualizar la contraseña. El enlace puede haber caducado; solicita otro desde «¿Olvidaste tu contraseña?».');
      return;
    }
    setOk(true);
    await supabase.auth.signOut();
    setTimeout(onDone, 2000);
  };

  return (
    <div
      className="min-h-screen flex items-center justify-center px-4"
      style={{ backgroundImage: `linear-gradient(155deg, ${BRAND.lilaOscuro} 0%, ${BRAND.lilaClaro} 100%)` }}
    >
      <div className="w-full max-w-sm bg-white rounded-2xl shadow-xl p-7">
        <div className="flex items-center gap-3 mb-5">
          <div className="w-11 h-11 rounded-2xl flex items-center justify-center shrink-0" style={{ backgroundColor: BRAND.profundo }}>
            <ShieldCheck className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="font-bold text-lg tracking-tight" style={{ color: BRAND.tinta }}>Nueva contraseña</h1>
            <p className="text-xs" style={{ color: BRAND.tintaSuave }}>{empresa.nombre}</p>
          </div>
        </div>

        {ok ? (
          <div className="text-center py-6">
            <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-3">
              <Check className="w-6 h-6 text-green-600" />
            </div>
            <p className="text-sm font-semibold text-slate-700">Contraseña actualizada.</p>
            <p className="text-xs text-slate-400 mt-1">Ya puedes iniciar sesión con tu nueva contraseña.</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <p className="text-xs text-slate-500">Escribe tu nueva contraseña para acceder a tu cuenta.</p>

            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1.5">Nueva contraseña</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  required
                  placeholder="mínimo 6 caracteres"
                  className="w-full pl-9 pr-10 py-2.5 border border-slate-200 rounded-lg text-sm transition focus:outline-none focus:ring-2 focus:ring-[#C38DD6]/40 focus:border-[#C38DD6]"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(p => !p)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition cursor-pointer"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1.5">Repite la contraseña</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={confirm}
                  onChange={e => setConfirm(e.target.value)}
                  required
                  placeholder="repite la contraseña"
                  className="w-full pl-9 pr-3 py-2.5 border border-slate-200 rounded-lg text-sm transition focus:outline-none focus:ring-2 focus:ring-[#C38DD6]/40 focus:border-[#C38DD6]"
                />
              </div>
            </div>

            {error && (
              <div className="bg-rose-50 border border-rose-200 text-rose-700 text-xs font-medium px-4 py-2.5 rounded-lg">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-bold text-white transition disabled:opacity-60 cursor-pointer bg-[#7A4A93] hover:bg-[#693E80]"
            >
              {loading ? (
                <span className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full" />
              ) : (
                <Check className="w-4 h-4" />
              )}
              {loading ? 'Guardando…' : 'Guardar contraseña'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
