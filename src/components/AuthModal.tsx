import React, { useState, useEffect } from 'react';
import { Modal } from './Modal';
import { useClub } from '../context/ClubContext';
import { UserCheck, UserPlus, Shield, User as UserIcon, Award, Briefcase, ShieldCheck } from 'lucide-react';
import { RolUsuario } from '../types';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({ isOpen, onClose }) => {
  const { currentUser, users, equipos, loginAs, registerUser } = useClub();
  const [tab, setTab] = useState<'switch' | 'register'>('switch');

  const [nombre, setNombre] = useState('');
  const [email, setEmail] = useState('');
  const [rol, setRol] = useState<RolUsuario>('entrenador');
  const [equipo, setEquipo] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (equipos.length > 0 && !equipo) {
      setEquipo(equipos[0].nombre);
    }
  }, [equipos, equipo]);

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nombre.trim() || !email.trim()) return;

    const assignedTeam = (rol === 'entrenador' || rol === 'jugador')
      ? (equipo || equipos[0]?.nombre || '')
      : undefined;

    setSubmitting(true);
    const success = await registerUser(nombre.trim(), email.trim(), rol, assignedTeam);
    setSubmitting(false);

    if (success) {
      setNombre('');
      setEmail('');
      onClose();
    }
  };

  const getRoleBadge = (userRol: string) => {
    if (userRol === 'admin') {
      return {
        label: 'Administrador',
        avatarBg: 'bg-red-600 text-white',
        badgeClass: 'bg-red-50 text-red-700 border border-red-200'
      };
    }
    if (userRol === 'entrenador') {
      return {
        label: 'Entrenador',
        avatarBg: 'bg-blue-600 text-white',
        badgeClass: 'bg-blue-50 text-blue-700 border border-blue-200'
      };
    }
    if (userRol === 'coordinador' || userRol === 'coordinador_f8') {
      return {
        label: 'Coordinador F8',
        avatarBg: 'bg-emerald-600 text-white',
        badgeClass: 'bg-emerald-50 text-emerald-700 border border-emerald-200'
      };
    }
    if (userRol === 'coordinador_f11') {
      return {
        label: 'Coordinador F11',
        avatarBg: 'bg-teal-600 text-white',
        badgeClass: 'bg-teal-50 text-teal-700 border border-teal-200'
      };
    }
    if (userRol === 'autorizado') {
      return {
        label: 'Autorizado',
        avatarBg: 'bg-amber-600 text-white',
        badgeClass: 'bg-amber-50 text-amber-700 border border-amber-200'
      };
    }
    if (userRol === 'direccion' || userRol === 'directiva') {
      return {
        label: 'Dirección deportiva',
        avatarBg: 'bg-purple-600 text-white',
        badgeClass: 'bg-purple-50 text-purple-700 border border-purple-200'
      };
    }
    if (userRol === 'jugador') {
      return {
        label: 'Jugador',
        avatarBg: 'bg-orange-500 text-white',
        badgeClass: 'bg-orange-50 text-orange-700 border border-orange-200'
      };
    }
    return {
      label: 'Aficionado',
      avatarBg: 'bg-gray-600 text-white',
      badgeClass: 'bg-gray-100 text-gray-700 border border-gray-200'
    };
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Acceso de Usuarios y Perfiles"
      subtitle="Perfiles para Dirección, Entrenadores, Jugadores y Administradores"
      maxWidth="max-w-md"
    >
      <div className="space-y-4">
        <div className="flex border-b border-gray-200">
          <button
            onClick={() => setTab('switch')}
            className={`flex-1 py-2.5 font-semibold text-sm border-b-2 text-center transition-colors flex items-center justify-center gap-2 ${
              tab === 'switch' ? 'border-orange-500 text-orange-600' : 'border-transparent text-gray-500'
            }`}
          >
            <UserCheck className="w-4 h-4" />
            Cambiar Usuario ({users.length})
          </button>
          <button
            onClick={() => setTab('register')}
            className={`flex-1 py-2.5 font-semibold text-sm border-b-2 text-center transition-colors flex items-center justify-center gap-2 ${
              tab === 'register' ? 'border-orange-500 text-orange-600' : 'border-transparent text-gray-500'
            }`}
          >
            <UserPlus className="w-4 h-4" />
            Nuevo Usuario
          </button>
        </div>

        {tab === 'switch' ? (
          <div className="space-y-2 max-h-80 overflow-y-auto">
            {users.map(u => {
              const isSelected = currentUser?.id === u.id;
              const roleInfo = getRoleBadge(u.rol);
              return (
                <button
                  key={u.id}
                  onClick={() => {
                    loginAs(u.id);
                    onClose();
                  }}
                  className={`w-full text-left p-3 rounded-xl border flex items-center justify-between transition-all ${
                    isSelected
                      ? 'border-orange-500 bg-orange-50/60 ring-2 ring-orange-500/20 shadow-sm'
                      : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold shadow-sm ${roleInfo.avatarBg}`}
                    >
                      {u.nombre.charAt(0)}
                    </div>
                    <div>
                      <h4 className="font-semibold text-gray-900 text-sm flex items-center gap-1.5">
                        {u.nombre}
                        {isSelected && <span className="text-[10px] text-orange-600 font-bold">(Activo)</span>}
                      </h4>
                      <p className="text-xs text-gray-500">{u.email}</p>
                      {u.equipo && (u.rol === 'entrenador' || u.rol === 'jugador') && (
                        <p className="text-[11px] font-bold text-orange-600 flex items-center gap-1 mt-0.5">
                          <span>⚽</span>
                          <span>{u.equipo}</span>
                        </p>
                      )}
                    </div>
                  </div>
                  <span
                    className={`text-[11px] px-2.5 py-0.5 rounded-full font-bold uppercase tracking-wider ${roleInfo.badgeClass}`}
                  >
                    {roleInfo.label}
                  </span>
                </button>
              );
            })}
          </div>
        ) : (
          <form onSubmit={handleRegister} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                Nombre y Apellidos *
              </label>
              <input
                type="text"
                required
                placeholder="Ej: Daniel Sánchez"
                value={nombre}
                onChange={e => setNombre(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-orange-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                Correo Electrónico *
              </label>
              <input
                type="email"
                required
                placeholder="daniel@clubfutbol.com"
                value={email}
                onChange={e => setEmail(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-orange-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                Rol en el Club
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setRol('entrenador')}
                  className={`p-2.5 rounded-lg border text-xs font-bold flex items-center justify-center gap-1.5 transition-all ${
                    rol === 'entrenador'
                      ? 'border-blue-500 bg-blue-50 text-blue-700 ring-2 ring-blue-500/20'
                      : 'border-gray-200 text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  <Award className="w-4 h-4 text-blue-600" />
                  Entrenador
                </button>

                <button
                  type="button"
                  onClick={() => setRol('coordinador_f8')}
                  className={`p-2.5 rounded-lg border text-xs font-bold flex items-center justify-center gap-1.5 transition-all ${
                    rol === 'coordinador_f8'
                      ? 'border-emerald-500 bg-emerald-50 text-emerald-700 ring-2 ring-emerald-500/20'
                      : 'border-gray-200 text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  <ShieldCheck className="w-4 h-4 text-emerald-600" />
                  Coordinador F8
                </button>

                <button
                  type="button"
                  onClick={() => setRol('coordinador_f11')}
                  className={`p-2.5 rounded-lg border text-xs font-bold flex items-center justify-center gap-1.5 transition-all ${
                    rol === 'coordinador_f11'
                      ? 'border-teal-500 bg-teal-50 text-teal-700 ring-2 ring-teal-500/20'
                      : 'border-gray-200 text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  <ShieldCheck className="w-4 h-4 text-teal-600" />
                  Coordinador F11
                </button>

                <button
                  type="button"
                  onClick={() => setRol('jugador')}
                  className={`p-2.5 rounded-lg border text-xs font-bold flex items-center justify-center gap-1.5 transition-all ${
                    rol === 'jugador'
                      ? 'border-orange-500 bg-orange-50 text-orange-700 ring-2 ring-orange-500/20'
                      : 'border-gray-200 text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  <UserIcon className="w-4 h-4 text-orange-600" />
                  Jugador
                </button>

                <button
                  type="button"
                  onClick={() => setRol('autorizado')}
                  className={`p-2.5 rounded-lg border text-xs font-bold flex items-center justify-center gap-1.5 transition-all ${
                    rol === 'autorizado'
                      ? 'border-amber-500 bg-amber-50 text-amber-700 ring-2 ring-amber-500/20'
                      : 'border-gray-200 text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  <UserCheck className="w-4 h-4 text-amber-600" />
                  Autorizado
                </button>

                <button
                  type="button"
                  onClick={() => setRol('direccion')}
                  className={`col-span-2 p-2.5 rounded-lg border text-xs font-bold flex items-center justify-center gap-1.5 transition-all ${
                    rol === 'direccion' || rol === 'directiva'
                      ? 'border-purple-500 bg-purple-50 text-purple-700 ring-2 ring-purple-500/20'
                      : 'border-gray-200 text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  <Briefcase className="w-4 h-4 text-purple-600" />
                  Dirección deportiva
                </button>
              </div>
            </div>

            {/* Asignación obligatoria de equipo para jugador o entrenador */}
            {(rol === 'entrenador' || rol === 'jugador') && (
              <div className="p-3.5 bg-orange-50/80 rounded-xl border border-orange-200 space-y-2 animate-in fade-in duration-200">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-bold text-gray-900 uppercase tracking-wider">
                    Equipo Asignado *
                  </label>
                  <span className="text-[10px] font-bold text-orange-700 bg-orange-100 px-2.5 py-0.5 rounded-full border border-orange-300">
                    Obligatorio ({rol})
                  </span>
                </div>
                <select
                  value={equipo}
                  onChange={e => setEquipo(e.target.value)}
                  required
                  className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg text-sm font-semibold text-gray-900 focus:ring-2 focus:ring-orange-500 focus:outline-none"
                >
                  {equipos.length === 0 ? (
                    <option value="">No hay equipos creados</option>
                  ) : (
                    equipos.map(eq => (
                      <option key={eq.id} value={eq.nombre}>
                        {eq.nombre} ({eq.categoria})
                      </option>
                    ))
                  )}
                </select>
                <p className="text-[11px] text-gray-600 leading-tight">
                  {rol === 'entrenador'
                    ? 'El entrenador gestionará las convocatorias, asistencias y alineaciones de este equipo.'
                    : 'El jugador quedará vinculado a la plantilla y ficha deportiva oficial de este equipo.'}
                </p>
              </div>
            )}

            <button
              type="submit"
              disabled={submitting || ((rol === 'entrenador' || rol === 'jugador') && !equipo && equipos.length === 0)}
              className="w-full py-2.5 bg-orange-500 hover:bg-orange-600 text-white font-bold rounded-xl text-sm transition-colors shadow-sm disabled:opacity-50"
            >
              {submitting ? 'Creando...' : 'Crear y Acceder'}
            </button>
          </form>
        )}
      </div>
    </Modal>
  );
};
