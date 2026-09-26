import React, { useState } from 'react';
import { useClub } from '../context/ClubContext';
import { TeamShield } from './TeamShield';
import { ToastContainer } from './ToastContainer';
import { LiveResultsModal } from './LiveResultsModal';
import { Eye, EyeOff, Lock, LogIn, Mail, Radio } from 'lucide-react';

export const LoginScreen: React.FC = () => {
  const { login, clubConfig, loading } = useClub();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [isLiveOpen, setIsLiveOpen] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!email.trim() || !password) {
      setError('Introduce tu correo o tu usuario y tu contraseña.');
      return;
    }
    setSubmitting(true);
    const ok = await login(email, password);
    setSubmitting(false);
    if (!ok) {
      setError('Correo, usuario o contraseña incorrectos.');
    }
  };

  return (
    <div className="min-h-screen w-full bg-gray-950 flex items-center justify-center px-4 py-8 font-sans selection:bg-orange-500 selection:text-white">
      <div className="w-full max-w-md">
        {/* Cabecera / Identidad del Club */}
        <div className="flex flex-col items-center text-center mb-6">
          <div className="w-20 h-20 rounded-2xl bg-white/10 p-1.5 flex items-center justify-center border border-white/20 ring-2 ring-orange-500/40 overflow-hidden shadow-2xl mb-4">
            <TeamShield
              escudoUrl={clubConfig?.escudo}
              teamName={clubConfig?.nombre || 'Club'}
              size="2xl"
              className="w-full h-full"
            />
          </div>
          <h1 className="font-athletic font-extrabold text-xl sm:text-2xl text-white uppercase tracking-tight leading-tight">
            {clubConfig?.nombre || 'Club de Fútbol'}
          </h1>
          <p className="text-xs text-gray-400 mt-1">
            {clubConfig?.temporada || '2025/2026'} · Gestión deportiva oficial
          </p>
        </div>

        {/* Resultados en directo accesible SIN iniciar sesión */}
        <button
          type="button"
          onClick={() => setIsLiveOpen(true)}
          className="w-full mb-4 py-3 bg-red-600 hover:bg-red-700 text-white rounded-xl text-sm font-bold tracking-wide transition-all shadow-lg shadow-red-600/25 flex items-center justify-center gap-2"
        >
          <span className="relative flex items-center justify-center">
            <Radio className="w-4 h-4" />
            <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-white animate-pulse" />
          </span>
          Resultados en Directo
        </button>

        {/* Tarjeta de acceso */}
        <div className="bg-gray-900 border border-gray-800 rounded-2xl shadow-2xl p-5 sm:p-6">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-8 h-8 rounded-lg bg-orange-500/15 border border-orange-500/30 flex items-center justify-center">
              <Lock className="w-4 h-4 text-orange-400" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-white">Iniciar sesión</h2>
              <p className="text-[11px] text-gray-400">Acceso seguro con tu cuenta del club</p>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-1.5">
                Correo o Usuario
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 pointer-events-none" />
                <input
                  type="text"
                  autoFocus
                  autoComplete="username"
                  placeholder="tu@clubfutbol.com o sergio.21"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  className="w-full pl-9 pr-3 py-2.5 bg-gray-950 border border-gray-800 rounded-xl text-sm text-white placeholder-gray-600 focus:ring-2 focus:ring-orange-500 focus:border-orange-500 focus:outline-none"
                />
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-1.5">
                Contraseña
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 pointer-events-none" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  placeholder="••••••"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  className="w-full pl-9 pr-10 py-2.5 bg-gray-950 border border-gray-800 rounded-xl text-sm text-white placeholder-gray-600 focus:ring-2 focus:ring-orange-500 focus:border-orange-500 focus:outline-none"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(prev => !prev)}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300 transition-colors"
                  aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {error && (
              <div className="p-2.5 bg-red-950/50 border border-red-800/60 rounded-lg text-[11px] font-semibold text-red-400">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={submitting || loading}
              className="w-full py-2.5 bg-orange-500 hover:bg-orange-600 text-white font-bold rounded-xl text-sm transition-colors shadow-lg shadow-orange-500/20 disabled:opacity-50 flex items-center justify-center gap-2"
            >
              <LogIn className="w-4 h-4" />
              {submitting ? 'Entrando...' : 'Entrar'}
            </button>
          </form>

        </div>

        {/* Credenciales de demostración */}
        <p className="text-center text-[10px] text-gray-600 mt-4 leading-relaxed">
          Demo: admin@clubfutbol.com · contraseña 123456
          <br />
          Jugadores: usuario = nombre.dorsal (ej: sergio.21) · contraseña 123456
        </p>
      </div>

      {/* Resultados en directo (accesible para todos, sin credenciales) */}
      <LiveResultsModal isOpen={isLiveOpen} onClose={() => setIsLiveOpen(false)} />

      {/* Notificaciones */}
      <ToastContainer />
    </div>
  );
};
