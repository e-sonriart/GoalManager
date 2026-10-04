import React, { useEffect, useState } from 'react';
import { Modal } from './Modal';
import { useClub } from '../context/ClubContext';
import { isValidPassword } from '../utils/validation';
import { Eye, EyeOff, KeyRound, User } from 'lucide-react';

interface MiCuentaModalProps {
  isOpen: boolean;
  onClose: () => void;
}

/** Mi cuenta: el usuario en sesión cambia su propia contraseña de acceso. */
export const MiCuentaModal: React.FC<MiCuentaModalProps> = ({ isOpen, onClose }) => {
  const { currentUser, cambiarPassword } = useClub();
  const [actual, setActual] = useState('');
  const [nueva, setNueva] = useState('');
  const [repetir, setRepetir] = useState('');
  const [verClaves, setVerClaves] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState('');
  const [exito, setExito] = useState('');

  useEffect(() => {
    if (isOpen) {
      setActual('');
      setNueva('');
      setRepetir('');
      setError('');
      setExito('');
      setVerClaves(false);
      setEnviando(false);
    }
  }, [isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setExito('');
    if (!actual || !nueva || !repetir) {
      setError('Rellena los tres campos.');
      return;
    }
    if (!isValidPassword(nueva)) {
      setError('La nueva contraseña debe tener al menos 6 caracteres.');
      return;
    }
    if (nueva !== repetir) {
      setError('Las contraseñas nuevas no coinciden.');
      return;
    }
    setEnviando(true);
    const res = await cambiarPassword(actual, nueva);
    setEnviando(false);
    if (!res.ok) {
      setError(res.message);
      return;
    }
    setExito(res.message);
    setActual('');
    setNueva('');
    setRepetir('');
  };

  const campoClave = (
    etiqueta: string,
    valor: string,
    onChange: (v: string) => void,
    autoComplete: string,
    placeholder: string
  ) => (
    <div>
      <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
        {etiqueta}
      </label>
      <div className="relative">
        <input
          type={verClaves ? 'text' : 'password'}
          autoComplete={autoComplete}
          placeholder={placeholder}
          value={valor}
          onChange={e => onChange(e.target.value)}
          className="w-full px-3 pr-10 py-2 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-orange-500 focus:outline-none"
        />
        <button
          type="button"
          onClick={() => setVerClaves(v => !v)}
          aria-label={verClaves ? 'Ocultar contraseñas' : 'Mostrar contraseñas'}
          className="absolute right-2 top-1/2 -translate-y-1/2 w-7 h-7 flex items-center justify-center text-gray-400 hover:text-gray-700 rounded-lg"
        >
          {verClaves ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
        </button>
      </div>
    </div>
  );

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Mi cuenta"
      subtitle="Cambia tu contraseña de acceso"
      maxWidth="max-w-md"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="flex items-center gap-3 p-3 bg-gray-50 border border-gray-200 rounded-xl">
          <div
            className={`w-11 h-11 rounded-full flex items-center justify-center text-sm font-bold text-white shadow-xs shrink-0 ${
              currentUser?.rol === 'admin'
                ? 'bg-red-600 ring-2 ring-red-500/30'
                : currentUser?.rol === 'entrenador'
                ? 'bg-blue-600 ring-2 ring-blue-500/30'
                : currentUser?.rol === 'directiva'
                ? 'bg-purple-600 ring-2 ring-purple-500/30'
                : 'bg-orange-500 ring-2 ring-orange-500/30'
            }`}
          >
            {currentUser?.nombre ? currentUser.nombre.charAt(0).toUpperCase() : <User className="w-5 h-5" />}
          </div>
          <div className="min-w-0">
            <p className="text-sm font-bold text-gray-900 truncate">{currentUser?.nombre || 'Sin sesión'}</p>
            <p className="text-xs text-gray-500 truncate capitalize">
              {currentUser?.rol || ''} · {currentUser?.email || ''}
            </p>
          </div>
        </div>

        {campoClave('Contraseña actual', actual, setActual, 'current-password', 'Tu contraseña de hoy')}
        {campoClave('Nueva contraseña', nueva, setNueva, 'new-password', 'Mínimo 6 caracteres')}
        {campoClave('Repetir contraseña nueva', repetir, setRepetir, 'new-password', 'Otra vez la nueva')}

        {error && (
          <p className="p-2.5 bg-red-50 border border-red-200 text-red-700 text-xs font-semibold rounded-xl">
            {error}
          </p>
        )}
        {exito && (
          <p className="p-2.5 bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-semibold rounded-xl">
            {exito} · La próxima vez entrarás con ella.
          </p>
        )}

        <div className="flex justify-end gap-2 pt-3 border-t border-gray-100">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 border border-gray-200 text-gray-700 rounded-xl text-xs font-semibold hover:bg-gray-50"
          >
            Cerrar
          </button>
          <button
            type="submit"
            disabled={enviando}
            className="px-5 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-xl text-xs font-bold transition-colors shadow-md shadow-orange-500/20 disabled:opacity-50 flex items-center gap-1.5"
          >
            <KeyRound className="w-3.5 h-3.5" />
            {enviando ? 'Guardando…' : 'Guardar contraseña'}
          </button>
        </div>
      </form>
    </Modal>
  );
};
