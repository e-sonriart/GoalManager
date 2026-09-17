import React from 'react';
import { ActiveTab } from './Navbar';
import { useClub } from '../context/ClubContext';
import { TeamShield } from './TeamShield';
import { PWAInstallButton } from './PWAInstallButton';
import {
  BarChart3,
  Calendar,
  Shield,
  Users,
  ClipboardList,
  CheckSquare,
  Trophy,
  Settings,
  X,
  Radio,
  RefreshCw,
  User,
  ChevronRight,
  Database
} from 'lucide-react';

interface SidePanelProps {
  isOpen: boolean;
  onClose: () => void;
  activeTab: ActiveTab;
  setActiveTab: (tab: ActiveTab) => void;
  onOpenAuth: () => void;
  onOpenGoogleConfig: () => void;
}

export const SidePanel: React.FC<SidePanelProps> = ({
  isOpen,
  onClose,
  activeTab,
  setActiveTab,
  onOpenAuth,
  onOpenGoogleConfig
}) => {
  const { currentUser, isOnlineConfigured, refreshAll, loading, clubConfig } = useClub();

  if (!isOpen) return null;

  const handleSelect = (tab: ActiveTab) => {
    setActiveTab(tab);
    onClose();
  };

  const navItems: {
    id: ActiveTab;
    label: string;
    desc: string;
    icon: React.FC<{ className?: string }>;
    badge?: string | null;
  }[] = [
    {
      id: 'dashboard',
      label: 'Inicio',
      desc: 'Resumen global y próximos partidos',
      icon: BarChart3
    },
    {
      id: 'partidos',
      label: 'Partidos',
      desc: 'Calendario y marcadores oficiales',
      icon: Calendar,
      badge: 'Protagonista'
    },
    {
      id: 'equipos',
      label: 'Equipos & Categorías',
      desc: 'Categoría + Letra y año F8',
      icon: Shield
    },
    {
      id: 'convocatorias',
      label: 'Convocatorias',
      desc: 'Listas para cada partido',
      icon: ClipboardList
    },
    {
      id: 'asistencias',
      label: 'Asistencias',
      desc: 'Control de entrenamientos',
      icon: CheckSquare
    },
    {
      id: 'estadisticas',
      label: 'Estadísticas & Ranking',
      desc: 'Goleadores y rendimiento',
      icon: Trophy
    },
    {
      id: 'admin',
      label: 'Administración',
      desc: 'Usuarios, roles y sincronización',
      icon: Settings,
      badge: currentUser?.rol === 'admin' ? 'Admin' : null
    }
  ];

  return (
    <div className="fixed inset-0 z-50 flex overflow-hidden">
      {/* Backdrop con desenfoque suave */}
      <div
        className="fixed inset-0 bg-black/65 backdrop-blur-xs transition-opacity duration-200"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Panel Lateral Desplegable */}
      <aside
        className="relative z-10 w-80 max-w-[85vw] h-full bg-gray-950 text-white flex flex-col shadow-2xl border-r border-gray-800 transition-transform duration-300 ease-out animate-in slide-in-from-left"
        aria-label="Panel de navegación lateral"
      >
        {/* Cabecera del Panel */}
        <div className="p-4 border-b border-gray-800 flex items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-white/10 p-1 flex items-center justify-center border border-white/20 ring-2 ring-orange-500/40 overflow-hidden shrink-0">
              <TeamShield
                escudoUrl={clubConfig?.escudo}
                teamName={clubConfig?.nombre || 'Club'}
                size="sm"
                className="w-full h-full"
              />
            </div>
            <div className="min-w-0">
              <h2 className="font-extrabold text-sm tracking-tight font-athletic text-white uppercase truncate">
                {clubConfig?.nombre || 'CLUB FÚTBOL PRO'}
              </h2>
              <p className="text-[11px] text-orange-400 font-semibold truncate">
                {clubConfig?.temporada || 'Temporada 2025/2026'}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-9 h-9 flex items-center justify-center rounded-xl bg-gray-900 hover:bg-gray-800 text-gray-400 hover:text-white border border-gray-800 transition-colors shrink-0"
            aria-label="Cerrar panel lateral"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Perfil del Usuario Activo */}
        <div className="p-3 border-b border-gray-800/80 bg-gray-900/50 shrink-0">
          <button
            onClick={() => {
              onOpenAuth();
              onClose();
            }}
            className="w-full p-2.5 rounded-xl bg-gray-900 hover:bg-gray-850 border border-gray-800 flex items-center justify-between gap-3 transition-colors text-left"
          >
            <div className="flex items-center gap-2.5 min-w-0">
              <div
                className={`w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold text-white shadow-xs shrink-0 ${
                  currentUser?.rol === 'admin'
                    ? 'bg-red-600 ring-2 ring-red-500/30'
                    : currentUser?.rol === 'entrenador'
                    ? 'bg-blue-600 ring-2 ring-blue-500/30'
                    : currentUser?.rol === 'direccion' || currentUser?.rol === 'directiva'
                    ? 'bg-purple-600 ring-2 ring-purple-500/30'
                    : 'bg-orange-500 ring-2 ring-orange-500/30'
                }`}
              >
                {currentUser?.nombre ? currentUser.nombre.charAt(0).toUpperCase() : <User className="w-4 h-4" />}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-bold text-gray-100 truncate">
                  {currentUser?.nombre || 'Acceso Club'}
                </p>
                <p className="text-[10px] text-gray-400 truncate capitalize">
                  {currentUser?.rol ? `Rol: ${currentUser.rol}` : 'Toca para iniciar sesión'}
                </p>
              </div>
            </div>
            <ChevronRight className="w-4 h-4 text-gray-500 shrink-0" />
          </button>
        </div>

        {/* Lista de Navegación con Scroll vertical suave y sin desbordamiento horizontal */}
        <div className="flex-1 overflow-y-auto px-3 py-3 space-y-1">
          <div className="px-2 pb-1.5 text-[10px] font-bold uppercase tracking-wider text-gray-400">
            Módulos del Club
          </div>
          {navItems.map(item => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;

            return (
              <button
                key={item.id}
                onClick={() => handleSelect(item.id)}
                className={`w-full flex items-center justify-between gap-3 px-3 py-2.5 rounded-xl text-left transition-all group ${
                  isActive
                    ? 'bg-orange-500 text-white shadow-md shadow-orange-500/25 font-bold'
                    : 'text-gray-300 hover:text-white hover:bg-gray-900 font-semibold'
                }`}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div
                    className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                      isActive ? 'bg-white/20 text-white' : 'bg-gray-900 text-gray-400 group-hover:text-orange-400'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs truncate leading-snug">{item.label}</p>
                    <p
                      className={`text-[10px] truncate leading-tight ${
                        isActive ? 'text-white/80' : 'text-gray-400'
                      }`}
                    >
                      {item.desc}
                    </p>
                  </div>
                </div>

                {item.badge && (
                  <span
                    className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase shrink-0 whitespace-nowrap ${
                      isActive
                        ? 'bg-white text-orange-600'
                        : 'bg-orange-950 border border-orange-700/60 text-orange-300'
                    }`}
                  >
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Acciones de Sincronización y Sheets en la Base del Panel */}
        <div className="p-3 border-t border-gray-800/80 bg-gray-950 space-y-2 shrink-0">
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => refreshAll()}
              disabled={loading}
              className="px-2.5 py-2 rounded-xl bg-gray-900 hover:bg-gray-800 text-gray-200 border border-gray-800 text-[11px] font-semibold flex items-center justify-center gap-1.5 transition-colors"
            >
              <RefreshCw className={`w-3.5 h-3.5 shrink-0 ${loading ? 'animate-spin text-orange-400' : ''}`} />
              <span className="truncate">Sincronizar</span>
            </button>

            <button
              onClick={() => {
                onOpenGoogleConfig();
                onClose();
              }}
              className={`px-2.5 py-2 rounded-xl border text-[11px] font-semibold flex items-center justify-center gap-1.5 transition-colors truncate ${
                isOnlineConfigured
                  ? 'bg-emerald-950/40 border-emerald-700/60 text-emerald-300 hover:bg-emerald-900/50'
                  : 'bg-orange-950/30 border-orange-700/60 text-orange-300 hover:bg-orange-900/40'
              }`}
            >
              <Radio className="w-3.5 h-3.5 shrink-0" />
              <span className="truncate">{isOnlineConfigured ? 'Sheets Online' : 'Modo Local'}</span>
            </button>
          </div>

          <PWAInstallButton />
        </div>
      </aside>
    </div>
  );
};
