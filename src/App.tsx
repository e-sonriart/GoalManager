import React, { useState, useEffect, useRef } from 'react';
import { ClubProvider, useClub } from './context/ClubContext';
import { Navbar, ActiveTab } from './components/Navbar';
import { DashboardView } from './components/DashboardView';
import { EquiposClubView } from './components/EquiposClubView';
import { PartidosView } from './components/PartidosView';
import { ConvocatoriasView } from './components/ConvocatoriasView';
import { AsistenciasView } from './components/AsistenciasView';
import { EstadisticasRankingView } from './components/EstadisticasRankingView';
import { AdminPanel } from './components/AdminPanel';
import { AuthModal } from './components/AuthModal';
import { GoogleScriptModal } from './components/GoogleScriptModal';
import { ToastContainer } from './components/ToastContainer';
import { PWABanner } from './components/PWABanner';
import { SidePanel } from './components/SidePanel';
import { MobileTabBar } from './components/MobileTabBar';
import { OfflineIndicator } from './components/OfflineIndicator';
import { TeamShield } from './components/TeamShield';
import {
  Radio,
  RefreshCw
} from 'lucide-react';

const MainContent: React.FC = () => {
  const { isConfigModalOpen, setIsConfigModalOpen, googleScriptUrl, currentUser, clubConfig, isOnlineConfigured, refreshAll, loading } = useClub();

  const [activeTab, setActiveTab] = useState<ActiveTab>('equipos');
  const [selectedPartidoForConvocatoria, setSelectedPartidoForConvocatoria] = useState<string | undefined>(undefined);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [isSidePanelOpen, setIsSidePanelOpen] = useState(false);

  const mainScrollRef = useRef<HTMLElement>(null);

  // Sincronizar título de pestaña con la personalización del club
  useEffect(() => {
    if (clubConfig?.nombre) {
      document.title = `${clubConfig.nombre} | Gestión Oficial`;
    }
  }, [clubConfig?.nombre]);

  // Al cambiar de pestaña, resetear scroll suavemente
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' });
    mainScrollRef.current?.scrollTo({ top: 0, behavior: 'instant' });
  }, [activeTab]);

  const handleNavigateToConvocatoria = (partidoId: string) => {
    setSelectedPartidoForConvocatoria(partidoId);
    setActiveTab('convocatorias');
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex flex-col font-sans text-gray-900 antialiased selection:bg-orange-500 selection:text-white overflow-x-hidden w-full">
      {/* Barra de Navegación Principal */}
      <Navbar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onOpenAuth={() => setIsAuthModalOpen(true)}
        onOpenGoogleConfig={() => setIsConfigModalOpen(true)}
        onOpenSidePanel={() => setIsSidePanelOpen(true)}
      />

      {/* Contenedor Principal Expandido al Máximo y Contenido sin Scroll Horizontal */}
      <main
        ref={mainScrollRef}
        id="main-app-content"
        className="flex-1 w-full max-w-7xl 2xl:max-w-[1680px] mx-auto px-3 sm:px-6 lg:px-8 xl:px-10 py-5 sm:py-6 pb-12 overflow-x-hidden space-y-6"
      >
        {/* Banner PWA para instalación */}
        <PWABanner />

        {/* Vistas Dinámicas */}
        {activeTab === 'dashboard' && (
          <DashboardView onNavigate={setActiveTab} />
        )}

        {activeTab === 'equipos' && (
          <EquiposClubView />
        )}

        {activeTab === 'partidos' && (
          <PartidosView
            onNavigateToConvocatoria={handleNavigateToConvocatoria}
          />
        )}

        {activeTab === 'convocatorias' && (
          <ConvocatoriasView initialPartidoId={selectedPartidoForConvocatoria} />
        )}

        {activeTab === 'asistencias' && (
          <AsistenciasView />
        )}

        {activeTab === 'estadisticas' && (
          <EstadisticasRankingView />
        )}

        {activeTab === 'admin' && (
          <AdminPanel />
        )}
      </main>

      {/* Footer Expandido en PC */}
      <footer className="hidden lg:block bg-gray-950 border-t border-gray-800 text-gray-400 py-8 px-6 mt-auto">
        <div className="max-w-7xl 2xl:max-w-[1680px] mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-white/10 p-0.5 flex items-center justify-center border border-white/20">
              <TeamShield
                escudoUrl={clubConfig?.escudo}
                teamName={clubConfig?.nombre || 'Club'}
                size="xs"
                className="w-full h-full"
              />
            </div>
            <div>
              <p className="font-athletic font-bold uppercase tracking-wider text-white text-sm">
                {clubConfig?.nombre || 'CLUB FÚTBOL PRO'} • {clubConfig?.temporada || '2025/2026'}
              </p>
              <p className="text-xs text-gray-400">
                {clubConfig?.lema || 'Software integral para la gestión y seguimiento deportivo de clubes.'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-4 text-xs">
            <button
              onClick={() => setIsConfigModalOpen(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gray-900 hover:bg-gray-800 text-gray-300 transition-colors border border-gray-800"
            >
              <Radio className={`w-3.5 h-3.5 ${isOnlineConfigured ? 'text-emerald-400' : 'text-orange-400'}`} />
              <span>{isOnlineConfigured ? 'Google Sheets Conectado' : 'Configurar Google Sheets'}</span>
            </button>

            <button
              onClick={() => refreshAll()}
              disabled={loading}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gray-900 hover:bg-gray-800 text-gray-300 transition-colors border border-gray-800"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-orange-400' : ''}`} />
              <span>Sincronizar Datos</span>
            </button>
          </div>
        </div>
      </footer>

      {/* Panel Lateral Ocultable */}
      <SidePanel
        isOpen={isSidePanelOpen}
        onClose={() => setIsSidePanelOpen(false)}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onOpenAuth={() => setIsAuthModalOpen(true)}
        onOpenGoogleConfig={() => setIsConfigModalOpen(true)}
      />

      {/* Barra de Navegación Inferior para Móvil */}
      <MobileTabBar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onOpenMore={() => setIsSidePanelOpen(true)}
      />

      {/* Indicador de Conexión Offline PWA */}
      <OfflineIndicator />

      {/* Modales Globales */}
      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
      />

      <GoogleScriptModal
        isOpen={isConfigModalOpen}
        onClose={() => setIsConfigModalOpen(false)}
      />

      {/* Notificaciones Toast */}
      <ToastContainer />
    </div>
  );
};

export default function App() {
  return (
    <ClubProvider>
      <MainContent />
    </ClubProvider>
  );
}
