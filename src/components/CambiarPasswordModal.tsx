import { useState } from 'react';
import { KeyRound, Check } from 'lucide-react';
import ModalShell from './ModalShell';
import { cambiarPassword } from '../lib/auth';
import { validarCambioPassword, PASSWORD_MIN } from '../utils/cambioPassword';

interface Props {
  email: string;
  onClose: () => void;
}

const INPUT = 'w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500';

/** Cambio de contraseña de la propia cuenta. */
export default function CambiarPasswordModal({ email, onClose }: Props) {
  const [form, setForm] = useState({ actual: '', nueva: '', repetir: '' });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [ok, setOk] = useState(false);

  const set = (campo: keyof typeof form, valor: string) => {
    setForm(f => ({ ...f, [campo]: valor }));
    if (error) setError('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const fallo = validarCambioPassword(form);
    if (fallo) { setError(fallo); return; }
    setBusy(true);
    try {
      await cambiarPassword(email, form.actual, form.nueva);
      setOk(true);
      setTimeout(onClose, 1800);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo actualizar la contraseña.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <ModalShell
      id="cambiar-password-modal"
      ancho="max-w-sm"
      titulo="Cambiar contraseña"
      icono={<KeyRound className="w-4 h-4 text-blue-600" />}
      onClose={onClose}
    >
      {ok ? (
        <div className="p-8 text-center space-y-2">
          <div className="mx-auto w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center">
            <Check className="w-5 h-5 text-emerald-600" />
          </div>
          <p className="text-sm font-bold text-slate-800">Contraseña actualizada</p>
          <p className="text-xs text-slate-500">Úsala la próxima vez que inicies sesión.</p>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="p-6 space-y-4" noValidate>
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">Contraseña actual</label>
            <input type="password" autoComplete="current-password" className={INPUT} value={form.actual}
              onChange={e => set('actual', e.target.value)} autoFocus />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">Nueva contraseña</label>
            <input type="password" autoComplete="new-password" className={INPUT} value={form.nueva}
              onChange={e => set('nueva', e.target.value)} placeholder={`Mínimo ${PASSWORD_MIN} caracteres`} />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">Repite la nueva contraseña</label>
            <input type="password" autoComplete="new-password" className={INPUT} value={form.repetir}
              onChange={e => set('repetir', e.target.value)} />
          </div>
          {error && <p role="alert" className="text-xs font-semibold text-rose-600 bg-rose-50 border border-rose-100 rounded-lg px-3 py-2">{error}</p>}
          <div className="flex justify-end gap-2 pt-1">
            <button type="button" onClick={onClose} className="px-4 py-2 text-xs font-bold text-slate-500 hover:bg-slate-100 rounded-lg transition cursor-pointer">
              Cancelar
            </button>
            <button type="submit" disabled={busy}
              className="px-4 py-2 text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition cursor-pointer disabled:opacity-60">
              {busy ? 'Guardando…' : 'Cambiar contraseña'}
            </button>
          </div>
        </form>
      )}
    </ModalShell>
  );
}
