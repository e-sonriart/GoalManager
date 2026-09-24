import React, { useState, useEffect, useRef, Suspense, lazy } from 'react';
import { ClubProvider, useClub } from './context/ClubContext';
import { Navbar, ActiveTab } from './components/Navbar';
import { LoginScreen } from './components/LoginScreen';
import { GoogleScriptModal } from './components/GoogleScriptModal';
import { ToastContainer } from './components/ToastContainer';
import { PWABanner } from './components/PWABanner';
import { SidePanel } from './components/SidePanel';
import { MobileTabBar } from './components/MobileTabBar';
import { OfflineIndicator } from './components/OfflineIndicator';
import { ErrorBoundary } from './components/ErrorBoundary';
import { TeamShield } from './components/TeamShield';
import { useIsDesktop } from './hooks/useMediaQuery';
import { Loader2, Radio, RefreshCw, TriangleAlert } from 'lucide-react';

// Carga diferida de vistas (code splitting): reduce el JS inicial y acelera la primera carga
const DashboardView = lazy(() => import('./components/DashboardView').then(m => ({ default: m.DashboardView })));
const EquiposClubView = lazy(() => import('./components/EquiposClubView').then(m => ({ default: m.EquiposClubView })));
const PartidosView = lazy(() => import('./components/PartidosView').then(m => ({ default: m.PartidosView })));
const EntrenamientosView = lazy(() => import('./components/EntrenamientosView').then(m => ({ default: m.EntrenamientosView })));
const ConvocatoriasView = lazy(() => import('./components/ConvocatoriasView').then(m => ({ default: m.ConvocatoriasView })));
const AlineacionView = lazy(() => import('./components/AlineacionView').then(m => ({ default: m.AlineacionView })));
const EventosPartidoView = lazy(() => import('./components/EventosPartidoView').then(m => ({ default: m.EventosPartidoView })));
const EstadisticasRankingView = lazy(() => import('./components/EstadisticasRankingView').then(m => ({ default: m.EstadisticasRankingView })));
const AdminPanel = lazy(() => import('./components/AdminPanel').then(m => ({ default: m.AdminPanel })));

const VIEW_FALLBACK: React.FC<{ label?: string }> = ({ label }) => (
  <div className="flex flex-col items-center justify-center py-20 text-gray-400">
    <Loader2 className="w-8 h-8 animate-spin text-orange-500 mb-3" />
    <p className="text-sm font-semibold">{label || 'Cargando mÃ³dulo...'}</p>
  </div>
);

const MainContent: React.FC = () => {
  const { isConfigModalOpen, setIsConfigModalOpen, googleScriptUrl, currentUser, clubConfig, isOnlineConfigured, refreshAll, loading, allowedTabs, isTeamScoped, assignedTeams } = useClub();

  const [activeTab, setActiveTab] = useState<ActiveTab>('dashboard');
  const [selectedPartidoForConvocatoria, setSelectedPartidoForConvocatoria] = useState<string | undefined>(undefined);
  const [selectedPartidoForAlineacion, setSelectedPartidoForAlineacion] = useState<string | undefined>(undefined);
  const [selectedPartidoForEventos, setSelectedPartidoForEventos] = useState<string | undefined>(undefined);
  const [isSidePanelOpen, setIsSidePanelOpen] = useState(false);
  // Detección auto móvil/PC: >=1024px = Vista PC; se reajusta al redimensionar
  const isDesktop = useIsDesktop();
  const [vistaPC, setVistaPC] = useState<boolean>(isDesktop);

  useEffect(() => {
    setVistaPC(isDesktop);
  }, [isDesktop]);

  const toggleVistaPC = () => setVistaPC(prev => !prev);

  const mainScrollRef = useRef<HTMLElement>(null);

  // Sincronizar tÃ­tulo de pestaÃ±a con la personalizaciÃ³n del club
  useEffect(() => {
    if (clubConfig?.nombre) {
      document.title = `${clubConfig.nombre} | GestiÃ³n Oficial`;
    }
  }, [clubConfig?.nombre]);

  // Guardia de acceso: si el rol no puede ver la pestaÃ±a actual, ir al Dashboard (o a la primera permitida)
  useEffect(() => {
    if (allowedTabs.length > 0 && !allowedTabs.includes(activeTab)) {
      setActiveTab(allowedTabs.includes('dashboard') ? 'dashboard' : allowedTabs[0]);
    }
  }, [activeTab, allowedTabs]);

  // Al cambiar de pestaÃ±a, resetear scroll suavemente
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' });
    mainScrollRef.current?.scrollTo({ top: 0, behavior: 'instant' });
  }, [activeTab]);

  const handleNavigateToConvocatoria = (partidoId: string) => {
    setSelectedPartidoForConvocatoria(partidoId);
    setActiveTab('convocatorias');
  };

  const handleNavigateToAlineacion = (partidoId: string) => {
    setSelectedPartidoForAlineacion(partidoId);
    setActiveTab('alineacion');
  };

  const handleStartMatch = (partidoId: string) => {
    setSelectedPartidoForEventos(partidoId);
    setActiveTab('eventos');
  };

  // Pantalla de carga inicial (solo antes de la primera sesión; no interrumpe sincronizaciones)
  if (loading && !currentUser) {
    return (
      <div className="min-h-screen w-full bg-gray-950 flex items-center justify-center">
        <VIEW_FALLBACK label="Cargando aplicación..." />
      </div>
    );
  }

  // Guardia de sesión: sin usuario activo se muestra la pantalla de login
  if (!currentUser) {
    return <LoginScreen />;
  }

  return (
    <div className="min-h-screen bg-gray-950 flex justify-center font-sans text-gray-900 antialiased selection:bg-orange-500 selection:text-white overflow-x-hidden w-full">
      <div className={`${vistaPC ? 'w-full max-w-[1400px] mx-auto' : 'w-full max-w-[430px] min-h-screen bg-[#F8FAFC] flex flex-col shadow-2xl relative mx-auto'}`}>
      {/* Barra de NavegaciÃ³n Principal */}
      <Navbar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onOpenGoogleConfig={() => setIsConfigModalOpen(true)}
        onOpenSidePanel={() => setIsSidePanelOpen(true)}
        offsetForSidePanel={vistaPC}
      />

      {/* Contenedor Principal Expandido al MÃ¡ximo y Contenido sin Scroll Horizontal */}
      <main
        ref={mainScrollRef}
        id="main-app-content"
        className={`flex-1 w-full max-w-7xl 2xl:max-w-[1680px] mx-auto px-4 sm:px-6 lg:px-8 xl:px-10 py-6 sm:py-8 pb-[calc(4.75rem+env(safe-area-inset-bottom))] lg:pb-12 overflow-x-hidden space-y-6 ${
          vistaPC ? 'lg:ml-80' : ''
        }`}
      >
        {/* Banner PWA para instalaciÃ³n */}
        <PWABanner />

        {/* Aviso: rol con acceso limitado por equipo pero sin equipo asignado */}
        {isTeamScoped && assignedTeams.length === 0 && (
          <div className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-amber-800">
            <TriangleAlert className="w-5 h-5 shrink-0 mt-0.5 text-amber-500" />
            <div className="text-sm">
              <p className="font-semibold">No tienes ningÃºn equipo asignado</p>
              <p className="text-amber-700">
                Tu rol solo puede ver la informaciÃ³n de los equipos que tenga asignados. Contacta con
                administraciÃ³n para que te asigne uno, mientras tanto las secciones aparecerÃ¡n vacÃ­as.
              </p>
            </div>
          </div>
        )}

        {/* Vistas DinÃ¡micas (con carga diferida y transiciÃ³n suave) */}
        <div key={activeTab} className="animate-in fade-in duration-300">
          <ErrorBoundary label={activeTab}>
          <Suspense fallback={<VIEW_FALLBACK />}>
            {activeTab === 'dashboard' && (
              <DashboardView onNavigate={setActiveTab} />
            )}

            {activeTab === 'equipos' && (
              <EquiposClubView />
            )}

            {activeTab === 'partidos' && (
              <PartidosView
                onNavigateToConvocatoria={handleNavigateToConvocatoria}
                onNavigateToAlineacion={handleNavigateToAlineacion}
              />
            )}

            {activeTab === 'entrenamientos' && (
              <EntrenamientosView />
            )}

            {activeTab === 'convocatorias' && (
              <ConvocatoriasView
                initialPartidoId={selectedPartidoForConvocatoria}
                onBack={() => setActiveTab('partidos')}
              />
            )}

            {activeTab === 'alineacion' && (
              <AlineacionView
                initialPartidoId={selectedPartidoForAlineacion}
                onBack={() => setActiveTab('partidos')}
                onStartMatch={handleStartMatch}
              />
            )}

            {activeTab === 'eventos' && (
              <EventosPartidoView
                initialPartidoId={selectedPartidoForEventos}
                onBack={() => setActiveTab('alineacion')}
              />
            )}

            {activeTab === 'estadisticas' && (
              <EstadisticasRankingView />
            )}

            {activeTab === 'admin' && (
              <AdminPanel />
            )}
          </Suspense>
          </ErrorBoundary>
        </div>
      </main>

      {/* Footer Expandido en PC */}
      <footer className={`hidden lg:block bg-gray-950 border-t border-gray-800 text-gray-400 py-8 px-6 mt-auto ${vistaPC ? 'lg:ml-80' : ''}`}>
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
                {clubConfig?.nombre || 'CLUB FÃšTBOL PRO'} â€¢ {clubConfig?.temporada || '2025/2026'}
              </p>
              <p className="text-xs text-gray-400">
                {clubConfig?.lema || 'Software integral para la gestiÃ³n y seguimiento deportivo de clubes.'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-4 text-xs">
            <button
              onClick={() => setIsConfigModalOpen(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gray-900 hover:bg-gray-800 text-gray-300 transition-colors border border-gray-800"
            >
              <Radio className={`w-3.5 h-3.5 ${isOnlineConfigured ? 'text-emerald-400' : 'text-orange-400'}`} />
              <span>{isOnlineConfigured ? 'Supabase Conectado' : 'Configurar Supabase'}</span>
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
        isOpen={isSidePanelOpen || vistaPC}
        onClose={() => {
          setIsSidePanelOpen(false);
          if (vistaPC) setVistaPC(false);
        }}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onOpenGoogleConfig={() => setIsConfigModalOpen(true)}
        vistaPC={vistaPC}
        onToggleVistaPC={toggleVistaPC}
      />

      {/* Barra de NavegaciÃ³n Inferior para MÃ³vil (oculta en Vista PC) */}
      {!vistaPC && (
        <MobileTabBar
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          onOpenMore={() => setIsSidePanelOpen(true)}
        />
      )}

      {/* Indicador de ConexiÃ³n Offline PWA */}
      <OfflineIndicator />

      {/* Modales Globales */}
      <GoogleScriptModal
        isOpen={isConfigModalOpen}
        onClose={() => setIsConfigModalOpen(false)}
      />

      {/* Notificaciones Toast */}
      <ToastContainer />
      </div>
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
