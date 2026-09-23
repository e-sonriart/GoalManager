import React from 'react';
import { ActiveTab } from './Navbar';
import { useClub } from '../context/ClubContext';
import { PWAInstallButton } from './PWAInstallButton';
import { TeamShield } from './TeamShield';
import {
  Users,
  Shield,
  Trophy,
  Settings,
  Database,
  UserCheck,
  X,
  ChevronRight,
  ExternalLink,
  Sparkles,
  RefreshCw,
  Dumbbell,
  LogOut
} from 'lucide-react';

interface MobileMoreDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  activeTab: ActiveTab;
  setActiveTab: (tab: ActiveTab) => void;
  onOpenGoogleConfig: () => void;
}

export const MobileMoreDrawer: React.FC<MobileMoreDrawerProps> = ({
  isOpen,
  onClose,
  activeTab,
  setActiveTab,
  onOpenGoogleConfig
}) => {
  const { currentUser, isOnlineConfigured, refreshAll, loading, clubConfig, logout } = useClub();

  if (!isOpen) return null;

  const handleSelect = (tab: ActiveTab) => {
    setActiveTab(tab);
    onClose();
  };

  const sections = [
    {
      title: 'Plantilla & Club',
      items: [
        {
          id: 'equipos' as ActiveTab,
          label: 'Equipos & Categorías',
          desc: 'Estructura por divisiones y entrenadores',
          icon: Shield,
          badge: null
        }
      ]
    },
    {
      title: 'Rendimiento & Competición',
      items: [
        {
          id: 'entrenamientos' as ActiveTab,
          label: 'Entrenamientos',
          desc: 'Sesiones planificadas por equipo',
          icon: Dumbbell,
          badge: null
        },
        {
          id: 'estadisticas' as ActiveTab,
          label: 'Estadísticas & Ranking',
          desc: 'Pichichi, asistencias, tarjetas y valoración',
          icon: Trophy,
          badge: 'Top'
        }
      ]
    },
    {
      title: 'Administración & Sistema',
      items: [
        {
          id: 'admin' as ActiveTab,
          label: 'Panel de Administración',
          desc: 'Gestión de usuarios, roles y base de datos',
          icon: Settings,
          badge: currentUser?.rol === 'admin' ? 'Gestor' : null
        }
      ]
    }
  ];

  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-end bg-black/75 backdrop-blur-xs animate-in fade-in duration-200">
      {/* Backdrop tap to close */}
      <div className="flex-1" onClick={onClose} />

      {/* Sheet Content (centralizado y contenido en formato móvil) */}
      <div className="w-full max-w-md mx-auto bg-gray-950 border-t border-x border-gray-800 rounded-t-3xl max-h-[88vh] overflow-y-auto p-4 pb-10 text-white shadow-2xl space-y-4 animate-in slide-in-from-bottom duration-300">
        {/* Handle bar decorativo */}
        <div className="w-12 h-1 bg-gray-700 rounded-full mx-auto mb-1" />

        {/* Header */}
        <div className="flex items-center justify-between pb-2 border-b border-gray-800/80">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-white/10 p-0.5 flex items-center justify-center font-bold text-white shadow-sm border border-white/20 overflow-hidden shrink-0">
              <TeamShield
                escudoUrl={clubConfig?.escudo}
                teamName={clubConfig?.nombre || 'Club'}
                size="xs"
                className="w-full h-full"
              />
            </div>
            <div>
              <h3 className="font-extrabold text-sm font-athletic tracking-wide text-white uppercase truncate max-w-[200px]">
                {clubConfig?.nombre || 'MENÚ DEL CLUB'}
              </h3>
              <p className="text-[11px] text-gray-400">Todas las secciones y accesos</p>
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label="Cerrar menú"
            className="p-2 text-gray-400 hover:text-white rounded-xl bg-gray-900 border border-gray-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* User Card */}
        <div className="p-3 bg-gray-900/90 rounded-2xl border border-gray-800 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div
              className={`w-11 h-11 rounded-xl flex items-center justify-center text-sm font-bold shadow-sm ${
                currentUser?.rol === 'admin'
                  ? 'bg-red-600 text-white'
                  : currentUser?.rol === 'entrenador'
                  ? 'bg-blue-600 text-white'
                  : currentUser?.rol === 'directiva'
                  ? 'bg-purple-600 text-white'
                  : 'bg-orange-500 text-white'
              }`}
            >
              {currentUser?.nombre ? currentUser.nombre.charAt(0) : 'U'}
            </div>
            <div>
              <p className="text-xs font-bold text-white">{currentUser?.nombre || 'Usuario Invitado'}</p>
              <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                <span
                  className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider ${
                    currentUser?.rol === 'admin'
                      ? 'bg-red-500/20 text-red-400 border border-red-500/30'
                      : currentUser?.rol === 'entrenador'
                      ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                      : currentUser?.rol === 'directiva'
                      ? 'bg-purple-500/20 text-purple-400 border border-purple-500/30'
                      : 'bg-orange-500/20 text-orange-400 border border-orange-500/30'
                  }`}
                >
                  {currentUser?.rol === 'directiva'
                    ? 'Dirección'
                    : currentUser?.rol || 'Jugador'}
                </span>
                <span className="text-[10px] text-gray-400 truncate max-w-[120px]">{currentUser?.email}</span>
              </div>
              {currentUser?.equipo && (currentUser.rol === 'entrenador' || currentUser.rol === 'jugador') && (
                <p className="text-[11px] text-orange-400 font-semibold flex items-center gap-1 mt-1">
                  <span>⚽</span>
                  <span className="truncate">{currentUser.equipo}</span>
                </p>
              )}
            </div>
          </div>

          <button
            onClick={() => {
              onClose();
              logout();
            }}
            className="px-3 py-1.5 bg-red-950/50 hover:bg-red-900/60 text-xs font-semibold text-red-300 border border-red-900/60 rounded-xl transition-colors shrink-0 flex items-center gap-1.5"
          >
            <LogOut className="w-3.5 h-3.5" />
            Salir
          </button>
        </div>

        {/* PWA Mobile Install Banner / Button */}
        <div className="p-3 bg-gradient-to-r from-orange-950/40 via-gray-900 to-gray-900 rounded-2xl border border-orange-500/30 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-orange-400 uppercase tracking-wider flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5" /> Instalación App Móvil
            </span>
            <span className="text-[10px] text-gray-400">PWA Offline</span>
          </div>
          <PWAInstallButton variant="full" />
        </div>

        {/* Sections */}
        <div className="space-y-3">
          {sections.map(sec => (
            <div key={sec.title} className="space-y-1.5">
              <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider px-1">
                {sec.title}
              </p>
              <div className="grid grid-cols-1 gap-2">
                {sec.items.map(item => {
                  const Icon = item.icon;
                  const isActive = activeTab === item.id;
                  return (
                    <button
                      key={item.id}
                      onClick={() => handleSelect(item.id)}
                      className={`w-full p-3 rounded-2xl border flex items-center justify-between transition-all ${
                        isActive
                          ? 'bg-orange-500/15 border-orange-500/50 text-white shadow-sm'
                          : 'bg-gray-900/70 border-gray-800 text-gray-300 hover:border-gray-700 hover:bg-gray-900'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className={`p-2 rounded-xl ${
                            isActive
                              ? 'bg-orange-500 text-white'
                              : 'bg-gray-800 text-gray-300'
                          }`}
                        >
                          <Icon className="w-5 h-5" />
                        </div>
                        <div className="text-left">
                          <p className="text-xs font-bold text-white flex items-center gap-2">
                            {item.label}
                            {item.badge && (
                              <span className="text-[9px] px-1.5 py-0.2 rounded-full bg-orange-500/20 text-orange-400 font-bold">
                                {item.badge}
                              </span>
                            )}
                          </p>
                          <p className="text-[11px] text-gray-400">{item.desc}</p>
                        </div>
                      </div>
                      <ChevronRight className="w-4 h-4 text-gray-500" />
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        {/* Quick Tools: Sync & Sheets config */}
        <div className="pt-2 border-t border-gray-800 grid grid-cols-2 gap-2">
          <button
            onClick={() => {
              refreshAll();
            }}
            disabled={loading}
            className="p-3 bg-gray-900 hover:bg-gray-800 rounded-xl border border-gray-800 text-left flex items-center gap-2.5 transition-all"
          >
            <RefreshCw className={`w-4 h-4 text-orange-400 ${loading ? 'animate-spin' : ''}`} />
            <div>
              <p className="text-xs font-bold text-gray-200">Sincronizar</p>
              <p className="text-[10px] text-gray-500">Actualizar datos</p>
            </div>
          </button>

          <button
            onClick={() => {
              onClose();
              onOpenGoogleConfig();
            }}
            className="p-3 bg-gray-900 hover:bg-gray-800 rounded-xl border border-gray-800 text-left flex items-center gap-2.5 transition-all"
          >
            <Database className="w-4 h-4 text-emerald-400" />
            <div>
              <p className="text-xs font-bold text-gray-200">Supabase</p>
              <p className="text-[10px] text-emerald-400 font-medium">
                {isOnlineConfigured ? 'Conectado' : 'Configurar'}
              </p>
            </div>
          </button>
        </div>
      </div>
    </div>
  );
};
