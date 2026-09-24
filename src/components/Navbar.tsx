import React from 'react';
import { useClub } from '../context/ClubContext';
import { TeamShield } from './TeamShield';
import { AppTab } from '../types';
import {
  BarChart3,
  Calendar,
  Users,
  Shield,
  ClipboardList,
  Trophy,
  Settings,
  RefreshCw,
  Menu,
  User,
  Radio,
  ExternalLink,
  Dumbbell,
  LogOut
} from 'lucide-react';

// Compatibilidad: ActiveTab = AppTab (tipos unificados para permisos)
export type ActiveTab = AppTab;

interface NavbarProps {
  activeTab: ActiveTab;
  setActiveTab: (tab: ActiveTab) => void;
  onOpenGoogleConfig: () => void;
  onOpenSidePanel?: () => void;
  onOpenMoreMobile?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  setActiveTab,
  onOpenGoogleConfig,
  onOpenSidePanel,
  onOpenMoreMobile
}) => {
  const { currentUser, isOnlineConfigured, refreshAll, loading, clubConfig, allowedTabs, logout } = useClub();
  const handleOpenPanel = onOpenSidePanel || onOpenMoreMobile;

  const allNavItems: { id: ActiveTab; label: string; icon: React.FC<{ className?: string }> }[] = [
    { id: 'dashboard', label: 'Inicio', icon: BarChart3 },
    { id: 'partidos', label: 'Partidos', icon: Calendar },
    { id: 'entrenamientos', label: 'Entrenamientos', icon: Dumbbell },
    { id: 'equipos', label: 'Equipos', icon: Shield },
    { id: 'convocatorias', label: 'Convocatorias', icon: ClipboardList },
    { id: 'estadisticas', label: 'Estadísticas', icon: Trophy },
    { id: 'admin', label: 'Admin', icon: Settings }
  ];
  const navItems = allNavItems.filter(item => allowedTabs.includes(item.id));

  return (
    <header className="sticky top-0 z-40 bg-gray-950/98 backdrop-blur-md border-b border-gray-800 text-white shadow-md w-full shrink-0 select-none">
      <div className="w-full max-w-7xl 2xl:max-w-[1680px] mx-auto px-3 sm:px-6 lg:px-8 py-2 flex items-center justify-between gap-2 sm:gap-3 h-16">
        {/* Logo & Brand Personalizado del Club */}
        <div
          className="flex items-center gap-2 sm:gap-3 cursor-pointer min-w-0 shrink"
          onClick={() => setActiveTab('dashboard')}
          title="Ir al Inicio del Club"
        >
          <div className="w-10 h-10 rounded-xl bg-white/10 p-1 flex items-center justify-center shadow-md border border-white/20 ring-2 ring-orange-500/40 overflow-hidden shrink-0">
            <TeamShield
              escudoUrl={clubConfig?.escudo}
              teamName={clubConfig?.nombre || 'Club'}
              size="sm"
              className="w-full h-full"
            />
          </div>
          <div className="min-w-0">
            <h1 className="font-extrabold text-sm sm:text-base tracking-tight font-athletic text-white uppercase truncate leading-tight">
              {clubConfig?.nombre || 'CLUB FÚTBOL PRO'}
            </h1>
            <div className="flex items-center gap-1.5 text-[11px] text-gray-400 truncate">
              <span className="text-orange-400 font-semibold">{clubConfig?.temporada || '2025/2026'}</span>
              <span>•</span>
              <span className="truncate max-w-[140px] sm:max-w-[200px]">{clubConfig?.lema || 'Gestión Deportiva'}</span>
            </div>
          </div>
        </div>

        {/* Desktop Navigation Links con Espaciado Óptimo de Iconos (Expandido en PC) */}
        <nav className="hidden lg:flex items-center gap-1 xl:gap-1.5 flex-1 justify-center px-2">
          {navItems.map(item => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;

            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`flex items-center gap-2 px-3 xl:px-3.5 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
                  isActive
                    ? 'bg-orange-500 text-white shadow-md shadow-orange-500/25 scale-[1.02]'
                    : 'text-gray-300 hover:text-white hover:bg-gray-900 active:scale-95'
                }`}
              >
                <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-white' : 'text-gray-400 group-hover:text-white'}`} />
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>

        {/* Acciones Rápidas con Espaciado Consistente */}
        <div className="flex items-center gap-1.5 sm:gap-2.5 shrink-0">
          {/* Botón Sincronizar (en móvil vive en el panel "Más") */}
          <button
            onClick={() => refreshAll()}
            disabled={loading}
            title={loading ? 'Sincronizando...' : 'Sincronizar con Supabase'}
            className="hidden sm:flex h-10 px-2.5 sm:px-3 text-gray-300 hover:text-white hover:bg-gray-900 border border-transparent hover:border-gray-800 rounded-xl transition-all items-center gap-2 active:scale-95"
          >
            <RefreshCw className={`w-4 h-4 shrink-0 ${loading ? 'animate-spin text-orange-400' : ''}`} />
            <span className="hidden xl:inline text-xs font-semibold">Sincronizar</span>
          </button>

          {/* Indicador de Estado Conexión Sheets (en móvil vive en el panel "Más") */}
          <button
            onClick={onOpenGoogleConfig}
            title={isOnlineConfigured ? 'Conectado a Supabase' : 'Modo Local / Configurar Supabase'}
            className={`hidden sm:flex h-10 px-2.5 sm:px-3 rounded-xl text-xs font-semibold border transition-all items-center gap-2 active:scale-95 ${
              isOnlineConfigured
                ? 'bg-emerald-950/40 border-emerald-700/60 text-emerald-300 hover:bg-emerald-900/50'
                : 'bg-orange-950/30 border-orange-700/60 text-orange-300 hover:bg-orange-900/40'
            }`}
          >
            <div className="relative flex items-center justify-center">
              <Radio className="w-4 h-4 shrink-0" />
              <span
                className={`absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full ${
                  isOnlineConfigured ? 'bg-emerald-400 animate-pulse' : 'bg-orange-500'
                }`}
              />
            </div>
            <span className="hidden sm:inline text-xs">
              {isOnlineConfigured ? 'Supabase Online' : 'Modo Local'}
            </span>
          </button>

          {/* User Profile Chip (solo visual: la creación de usuarios es exclusiva del Admin) */}
          <div
            id="user-profile-button"
            title={currentUser ? `${currentUser.nombre} (${currentUser.rol})` : ''}
            className="h-10 pl-2 pr-2.5 sm:pr-3 bg-gray-900 rounded-full border border-gray-700/80 flex items-center gap-2.5 shadow-sm"
          >
            <div
              className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold text-white shadow-xs shrink-0 ${
                currentUser?.rol === 'admin'
                  ? 'bg-red-600 ring-2 ring-red-500/30'
                  : currentUser?.rol === 'entrenador'
                  ? 'bg-blue-600 ring-2 ring-blue-500/30'
                  : currentUser?.rol === 'directiva'
                  ? 'bg-purple-600 ring-2 ring-purple-500/30'
                  : 'bg-orange-500 ring-2 ring-orange-500/30'
              }`}
            >
              {currentUser?.nombre ? currentUser.nombre.charAt(0).toUpperCase() : <User className="w-3.5 h-3.5" />}
            </div>
            <div className="hidden md:flex flex-col text-left leading-tight">
              <span className="text-xs font-bold text-gray-200 truncate max-w-[100px] xl:max-w-[130px]">
                {currentUser?.nombre || 'Acceder'}
              </span>
              <span className="text-[10px] text-gray-400 capitalize">
                {currentUser?.rol || 'Invitado'}
              </span>
            </div>
          </div>

          {/* Cerrar Sesión */}
          <button
            onClick={logout}
            title="Cerrar sesión"
            aria-label="Cerrar sesión"
            className="h-10 px-2.5 sm:px-3 flex items-center gap-1.5 text-gray-300 hover:text-white hover:bg-red-950/60 rounded-xl transition-colors shrink-0 border border-gray-800 hover:border-red-800/70 active:scale-95"
          >
            <LogOut className="w-4 h-4 text-red-400 shrink-0" />
            <span className="hidden xl:inline text-xs font-semibold">Salir</span>
          </button>

          {/* Botón de Menú Panel Lateral Ocultable (disponible tanto en móvil como en PC) */}
          <button
            onClick={handleOpenPanel}
            className="h-10 px-2.5 sm:px-3 flex items-center gap-1.5 text-gray-300 hover:text-white hover:bg-gray-800 rounded-xl transition-colors shrink-0 border border-gray-800"
            title="Abrir panel lateral completo"
            aria-label="Abrir panel lateral"
          >
            <Menu className="w-5 h-5 text-orange-400 shrink-0" />
            <span className="hidden sm:inline text-xs font-semibold text-gray-300">Menú</span>
          </button>
        </div>
      </div>
    </header>
  );
};

