import React, { useState } from 'react';
import { LogIn, Eye, EyeOff, Mail, Lock } from 'lucide-react';
import { Usuario } from '../types';
import { getEmpresaConfig } from '../data/mockData';
import { signIn, resetPassword } from '../lib/auth';

interface LoginScreenProps {
  onLogin: (user: Usuario) => void;
}

// Paleta de marca (lilas del cliente). El texto sobre los lilas claros va en
// morado oscuro para contraste; el botón usa un morado profundo de la misma
// familia para que el texto blanco se lea bien.
const BRAND = {
  lilaClaro: '#DCBAE8',
  lilaOscuro: '#C38DD6',
  tinta: '#3A1D4A',      // texto principal sobre el panel
  tintaSuave: '#5E4072', // texto secundario sobre el panel
  profundo: '#7A4A93',   // fondo de botones / acentos con texto blanco
  profundoHover: '#693E80',
};

export default function LoginScreen({ onLogin }: LoginScreenProps) {
  const empresaConfig = getEmpresaConfig();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [resetMsg, setResetMsg] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const user = await signIn(email, password);
      onLogin(user);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo iniciar sesión.');
    } finally {
      setLoading(false);
    }
  };

  const handleReset = async () => {
    setResetMsg('');
    if (!email.trim()) {
      setResetMsg('Escribe tu correo arriba y vuelve a pulsar el enlace.');
      return;
    }
    try {
      await resetPassword(email);
      setResetMsg('Si el correo existe, recibirás un enlace para restablecer tu contraseña.');
    } catch {
      setResetMsg('No se pudo enviar el correo. Inténtalo de nuevo o contacta con el administrador.');
    }
  };

  const initials = empresaConfig.nombre
    .split(' ')
    .slice(0, 2)
    .map(w => w[0])
    .join('')
    .toUpperCase() || 'E';

  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-white">

      {/* Panel de marca (degradado entre los dos lilas) */}
      <div
        className="relative md:w-1/2 px-8 py-10 md:p-12 flex flex-col justify-between overflow-hidden"
        style={{ backgroundImage: `linear-gradient(155deg, ${BRAND.lilaOscuro} 0%, ${BRAND.lilaClaro} 100%)` }}
      >
        {/* Textura de trama cruzada (estilo carbono) + brillos suaves */}
        <div
          className="pointer-events-none absolute inset-0"
          style={{
            backgroundImage: `
              repeating-linear-gradient(45deg, rgba(255,255,255,0.10) 0 1px, transparent 1px 9px),
              repeating-linear-gradient(-45deg, rgba(255,255,255,0.10) 0 1px, transparent 1px 9px),
              radial-gradient(ellipse at 15% 20%, rgba(255,255,255,0.28) 0%, transparent 55%),
              radial-gradient(ellipse at 85% 90%, rgba(255,255,255,0.16) 0%, transparent 50%)
            `,
          }}
        />

        {/* Logo + nombre */}
        <div className="relative flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-white/95 shadow-md flex items-center justify-center overflow-hidden shrink-0">
            {empresaConfig.logoBase64 ? (
              <img src={empresaConfig.logoBase64} alt="logo" className="w-full h-full object-contain" />
            ) : (
              <span className="font-black text-xl tracking-tighter" style={{ color: BRAND.profundo }}>{initials}</span>
            )}
          </div>
          <span className="font-bold text-lg tracking-tight" style={{ color: BRAND.tinta }}>{empresaConfig.nombre}</span>
        </div>

        {/* Titular */}
        <div className="relative my-10 md:my-0">
          <h1 className="font-bold text-2xl md:text-3xl leading-tight" style={{ color: BRAND.tinta }}>
            {empresaConfig.tagline}
          </h1>
          <p className="text-sm mt-3 max-w-xs" style={{ color: BRAND.tintaSuave }}>
            Gestiona tu flota, el taller y el rent a car desde un único panel, en cualquier momento y dispositivo.
          </p>
        </div>

        {/* Pie del panel */}
        <p className="relative text-xs font-medium" style={{ color: BRAND.tintaSuave }}>
          Entorno privado · acceso solo para personal autorizado
        </p>
      </div>

      {/* Panel de formulario */}
      <div className="md:w-1/2 flex flex-col items-center justify-center px-6 py-12 md:px-12">
        <div className="w-full max-w-sm">
          <h2 className="text-xl font-bold tracking-tight" style={{ color: BRAND.tinta }}>Acceso al sistema</h2>
          <p className="text-sm text-slate-500 mt-1 mb-7">Introduce tus credenciales para continuar.</p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1.5">
                Correo electrónico
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  autoComplete="email"
                  required
                  placeholder="usuario@empresa.net"
                  className="w-full pl-9 pr-3 py-2.5 border border-slate-200 rounded-lg text-sm transition focus:outline-none focus:ring-2 focus:ring-[#C38DD6]/40 focus:border-[#C38DD6]"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1.5">
                Contraseña
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  autoComplete="current-password"
                  required
                  placeholder="••••••••"
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

            <div className="flex justify-end">
              <button
                type="button"
                onClick={handleReset}
                className="text-xs font-semibold transition cursor-pointer hover:underline"
                style={{ color: BRAND.profundo }}
              >
                ¿Olvidaste tu contraseña?
              </button>
            </div>

            {resetMsg && (
              <div className="bg-violet-50 border border-violet-200 text-violet-800 text-xs px-4 py-2.5 rounded-lg">
                {resetMsg}
              </div>
            )}

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
                <LogIn className="w-4 h-4" />
              )}
              {loading ? 'Verificando...' : 'Iniciar sesión'}
            </button>
          </form>

          <p className="text-slate-400 text-xs mt-10 text-center">
            Desarrollado por{' '}
            <a
              href="https://somosingenio.net"
              target="_blank"
              rel="noopener noreferrer"
              className="font-semibold hover:underline"
              style={{ color: BRAND.profundo }}
            >
              Somos inGenio
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}
