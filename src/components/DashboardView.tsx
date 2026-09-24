import React, { useMemo, useState } from 'react';
import { useClub } from '../context/ClubContext';
import { TeamShield } from './TeamShield';
import { TeamStatusModal } from './TeamStatusModal';
import { LiveResultsModal } from './LiveResultsModal';
import { resolveVisitorShield } from '../utils/shieldPresets';
import {
  Calendar,
  Trophy,
  ArrowRight,
  Shield,
  Clock,
  Sparkles,
  Award,
  ChevronRight,
  Radio
} from 'lucide-react';
import { ActiveTab } from './Navbar';

interface DashboardViewProps {
  onNavigate: (tab: ActiveTab) => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({ onNavigate }) => {
  const {
    jugadores,
    partidos,
    estadisticas,
    equipos,
    currentUser,
    clubConfig,
    getTeamEscudo,
    can,
    allowedTabs
  } = useClub();

  const [isStatusOpen, setIsStatusOpen] = useState(false);
  const [isLiveOpen, setIsLiveOpen] = useState(false);

  const canManagePartidos = can('manage:partidos');

  // Métricas calculadas (memorizadas para evitar recálculo en cada render)
  const metrics = useMemo(() => {
    const partidosPendientes = partidos.filter(p => !p.finalizado).length;
    return { partidosPendientes };
  }, [partidos]);

  const { partidosPendientes } = metrics;

  // Pichichi (Máximo Goleador)
  const estadisticasOrdenadas = useMemo(
    () => [...estadisticas].sort((a, b) => (Number(b.goles) || 0) - (Number(a.goles) || 0)),
    [estadisticas]
  );
  const topScorerStat = estadisticasOrdenadas[0];
  const topScorerPlayer = useMemo(
    () => (topScorerStat ? jugadores.find(j => j.id === topScorerStat.jugadorId) : null),
    [jugadores, topScorerStat]
  );

  // Próximos partidos ordenados por fecha
  const proximosPartidos = useMemo(
    () => partidos
      .filter(p => !p.finalizado)
      .sort((a, b) => new Date(a.fecha).getTime() - new Date(b.fecha).getTime())
      .slice(0, 3),
    [partidos]
  );

  // Datos para gráfico de máximos goleadores
  const topGoleadoresData = useMemo(
    () => estadisticasOrdenadas
      .slice(0, 5)
      .map(st => {
        const player = jugadores.find(j => j.id === st.jugadorId);
        return {
          nombre: player ? player.nombre : 'Desconocido',
          dorsal: player ? player.dorsal : '-',
          goles: Number(st.goles) || 0,
          asistencias: Number(st.asistencias) || 0
        };
      }),
    [estadisticasOrdenadas, jugadores]
  );

  const maxGoles = Math.max(...topGoleadoresData.map(d => d.goles), 1);

  const canGo = (tab: ActiveTab) => allowedTabs.includes(tab);

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Top Banner con Escudo del Club */}
      <div className="relative overflow-hidden bg-gradient-to-r from-gray-950 via-gray-900 to-black text-white p-6 sm:p-8 rounded-3xl border border-gray-800 shadow-xl">
        <div className="absolute top-0 right-0 w-96 h-96 bg-orange-500/10 rounded-full blur-3xl -mr-20 -mt-20 pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-start sm:items-center gap-4">
            <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-white/10 p-2 flex items-center justify-center border border-white/20 shadow-inner shrink-0 ring-2 ring-orange-500/30">
              <TeamShield
                escudoUrl={clubConfig?.escudo}
                teamName={clubConfig?.nombre || 'Club'}
                size="xl"
                className="w-full h-full"
              />
            </div>
            <div className="space-y-1 max-w-xl">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-orange-500/20 text-orange-400 border border-orange-500/30 text-xs font-bold uppercase tracking-wider">
                <Sparkles className="w-3.5 h-3.5" /> Temporada {clubConfig?.temporada || '2025/2026'}
              </div>
              <h1 className="text-2xl sm:text-4xl font-extrabold font-athletic tracking-tight text-white uppercase">
                {clubConfig?.nombre || 'PANEL DEL CLUB'}
              </h1>
              <p className="text-gray-300 text-xs sm:text-sm leading-relaxed">
                {clubConfig?.lema || 'Control centralizado de plantillas, calendario de encuentros, asistencias y rendimiento competitivo.'}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={() => setIsLiveOpen(true)}
              className="px-4 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-bold tracking-wide transition-all shadow-md shadow-red-600/20 flex items-center gap-2"
            >
              <span className="relative flex items-center justify-center">
                <Radio className="w-4 h-4" />
                <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-white animate-pulse" />
              </span>
              Resultados en Directo
            </button>
            {canGo('partidos') && (
              <button
                onClick={() => onNavigate('partidos')}
                className="px-4 py-2.5 bg-orange-500 hover:bg-orange-600 text-white rounded-xl text-xs font-bold tracking-wide transition-all shadow-md shadow-orange-500/20 flex items-center gap-2"
              >
                <Calendar className="w-4 h-4" />
                {canManagePartidos ? 'Gestionar Partidos' : 'Ver Calendario'}
              </button>
            )}
            {canGo('equipos') && (
              <button
                onClick={() => onNavigate('equipos')}
                className="px-4 py-2.5 bg-white/10 hover:bg-white/20 text-white border border-white/20 rounded-xl text-xs font-bold tracking-wide transition-all flex items-center gap-2"
              >
                <Shield className="w-4 h-4 text-orange-400" />
                Ver Equipos
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Tarjeta de Equipo Asignado (para entrenador y jugador) */}
      {currentUser?.equipo && (currentUser.rol === 'entrenador' || currentUser.rol === 'jugador') && (
        <div className="bg-gradient-to-r from-orange-500/10 via-orange-500/5 to-transparent border border-orange-200/90 rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-xs animate-in fade-in duration-300">
          <div className="flex items-center gap-3.5">
            <div className="w-14 h-14 rounded-2xl bg-white p-1 flex items-center justify-center shadow-md border border-orange-200 shrink-0 ring-2 ring-orange-400/20">
              <TeamShield
                escudoUrl={getTeamEscudo(currentUser.equipo)}
                teamName={currentUser.equipo}
                size="lg"
                className="w-full h-full"
              />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-[10px] font-bold uppercase tracking-wider bg-orange-100 text-orange-800 px-2.5 py-0.5 rounded-full border border-orange-200">
                  {currentUser.rol === 'entrenador' ? 'Míster / Entrenador' : 'Jugador Oficial'}
                </span>
                <span className="text-xs text-gray-500 font-medium">Equipo asignado:</span>
              </div>
              <h3 className="text-lg font-black text-gray-900 font-athletic tracking-tight mt-0.5">
                {currentUser.equipo}
              </h3>
              {(() => {
                const eq = equipos.find(e => e.nombre === currentUser.equipo);
                const meta = eq ? [eq.division, eq.grupo].filter(Boolean) : [];
                if (!meta.length) return null;
                return (
                  <div className="flex flex-wrap gap-1.5 mt-1">
                    {eq?.division && (
                      <span className="px-2 py-0.5 bg-blue-50 text-blue-700 border border-blue-200 rounded text-[11px] font-semibold">
                        {eq.division}
                      </span>
                    )}
                    {eq?.grupo && (
                      <span className="px-2 py-0.5 bg-purple-50 text-purple-700 border border-purple-200 rounded text-[11px] font-semibold">
                        {eq.grupo}
                      </span>
                    )}
                  </div>
                );
              })()}
              <p className="text-xs text-gray-600">
                {currentUser.rol === 'entrenador'
                  ? `Hola ${currentUser.nombre}, tienes acceso directo para convocar y pasar lista a los jugadores de ${currentUser.equipo}.`
                  : `Hola ${currentUser.nombre}, estás vinculado a la plantilla y seguimiento competitivo de ${currentUser.equipo}.`}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0 w-full sm:w-auto">
            {canGo('equipos') && (
              <button
                onClick={() => onNavigate('equipos')}
                className="flex-1 sm:flex-initial px-4 py-2 bg-white hover:bg-orange-50 text-gray-800 border border-orange-200 rounded-xl text-xs font-bold transition-all shadow-xs"
              >
                Ver Plantilla
              </button>
            )}
            <button
              onClick={() => onNavigate(currentUser.rol === 'entrenador' && canGo('entrenamientos') ? 'entrenamientos' : 'partidos')}
              className="flex-1 sm:flex-initial px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-xl text-xs font-bold transition-all shadow-xs shadow-orange-500/20"
            >
              {currentUser.rol === 'entrenador' && canGo('entrenamientos') ? 'Pasar Asistencia' : 'Ver Calendario'}
            </button>
          </div>
        </div>
      )}

      {/* Metric Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
        <div className="bg-white p-3.5 sm:p-5 rounded-2xl border border-gray-150 shadow-xs flex flex-col sm:flex-row items-center sm:items-start gap-2.5 sm:gap-4">
          <div className="p-2 sm:p-3.5 rounded-xl sm:rounded-2xl bg-blue-100 text-blue-600 shrink-0">
            <Calendar className="w-5 h-5 sm:w-6 sm:h-6" />
          </div>
          <div className="text-center sm:text-left min-w-0">
            <p className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-gray-500 truncate">Por Jugar</p>
            <h3 className="text-xl sm:text-2xl font-black text-gray-900 font-athletic">{partidosPendientes}</h3>
            <p className="hidden sm:block text-[11px] text-gray-400">{partidos.length} partidos totales</p>
          </div>
        </div>

        <button
          onClick={() => setIsStatusOpen(true)}
          className="group text-left bg-white p-3.5 sm:p-5 rounded-2xl border border-gray-150 shadow-xs hover:border-orange-300 hover:shadow-md transition-all flex flex-col sm:flex-row items-center sm:items-start gap-2.5 sm:gap-4 cursor-pointer"
        >
          <div className="p-2 sm:p-3.5 rounded-xl sm:rounded-2xl bg-orange-100 text-orange-600 shrink-0">
            <Trophy className="w-5 h-5 sm:w-6 sm:h-6" />
          </div>
          <div className="text-center sm:text-left min-w-0 flex-1">
            <p className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-gray-500 truncate">Estado de los Equipos</p>
            <h3 className="text-xl sm:text-2xl font-black text-gray-900 font-athletic">Ver Clasificación</h3>
            <p className="hidden sm:block text-[11px] text-gray-400">
              Jugados, ganados, empatados, perdidos, goles y clasificación
            </p>
          </div>
          <ChevronRight className="hidden sm:block w-5 h-5 text-gray-300 group-hover:text-orange-500 transition-colors shrink-0 self-center" />
        </button>
      </div>

      {/* Main Grid: Pichichi Banner + Upcoming Matches */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Pichichi & Chart */}
        <div className="lg:col-span-2 space-y-6">
          {/* Pichichi Spotlight */}
          {topScorerPlayer && (
            <div className="bg-gradient-to-r from-orange-500 to-orange-600 rounded-3xl p-5 sm:p-6 text-white shadow-lg relative overflow-hidden flex flex-col sm:flex-row items-center justify-between gap-5 sm:gap-6">
              <div className="flex items-center gap-4 z-10">
                <div className="w-16 h-16 rounded-2xl bg-black/20 backdrop-blur border border-white/20 flex items-center justify-center text-3xl font-black font-athletic shadow-inner">
                  #{topScorerPlayer.dorsal}
                </div>
                <div>
                  <span className="inline-flex items-center gap-1 text-[11px] font-bold uppercase tracking-wider bg-black/25 px-2.5 py-0.5 rounded-full text-orange-100">
                    <Award className="w-3.5 h-3.5 text-amber-300" /> Pichichi del Club
                  </span>
                  <h3 className="text-2xl font-bold font-athletic tracking-tight mt-1">{topScorerPlayer.nombre}</h3>
                  <p className="text-xs text-orange-100">
                    {topScorerPlayer.posicion} • {topScorerPlayer.equipo}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-3 sm:flex items-center gap-1 sm:gap-6 z-10 bg-black/20 backdrop-blur px-3 sm:px-6 py-3 rounded-2xl border border-white/10 w-full sm:w-auto">
                <div className="text-center">
                  <p className="text-[9px] sm:text-[10px] uppercase font-bold text-orange-200">Goles</p>
                  <p className="text-2xl sm:text-3xl font-black font-athletic">{topScorerStat.goles}</p>
                </div>
                <div className="hidden sm:block w-px h-8 bg-white/20" />
                <div className="text-center">
                  <p className="text-[9px] sm:text-[10px] uppercase font-bold text-orange-200">Asistencias</p>
                  <p className="text-xl sm:text-2xl font-bold font-athletic">{topScorerStat.asistencias}</p>
                </div>
                <div className="hidden sm:block w-px h-8 bg-white/20" />
                <div className="text-center">
                  <p className="text-[9px] sm:text-[10px] uppercase font-bold text-orange-200">Partidos</p>
                  <p className="text-xl sm:text-2xl font-bold font-athletic">{topScorerStat.partidosJugados}</p>
                </div>
              </div>
            </div>
          )}

          {/* Gráfico Máximos Goleadores */}
          <div className="bg-white p-6 rounded-3xl border border-gray-150 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-gray-900 font-athletic tracking-wide">
                  Top Goleadores del Club
                </h3>
                <p className="text-xs text-gray-500">Distribución de goles y asistencias</p>
              </div>
              {canGo('estadisticas') && (
                <button
                  onClick={() => onNavigate('estadisticas')}
                  className="text-xs font-bold text-orange-600 hover:text-orange-700 flex items-center gap-1"
                >
                  Ver Ranking Completo <ArrowRight className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            <div className="space-y-3 pt-2">
              {topGoleadoresData.map((jug, idx) => {
                const pct = Math.round((jug.goles / maxGoles) * 100);
                return (
                  <div key={idx} className="space-y-1">
                    <div className="flex items-center justify-between gap-2 text-xs">
                      <span className="font-semibold text-gray-800 flex items-center gap-2 min-w-0">
                        <span className="w-5 h-5 rounded-full bg-gray-100 text-gray-700 text-[10px] font-bold flex items-center justify-center shrink-0">
                          {idx + 1}
                        </span>
                        <span className="truncate">{jug.nombre}</span>
                        <span className="text-gray-400 text-[11px] shrink-0">(#{jug.dorsal})</span>
                      </span>
                      <div className="flex items-center gap-2 sm:gap-3 shrink-0">
                        <span className="font-bold text-orange-600 font-athletic text-sm whitespace-nowrap">{jug.goles} Goles</span>
                        <span className="hidden sm:inline text-gray-400 text-[11px] whitespace-nowrap">{jug.asistencias} Asist.</span>
                      </div>
                    </div>
                    <div className="w-full bg-gray-100 h-2.5 rounded-full overflow-hidden">
                      <div
                        className="bg-gradient-to-r from-orange-400 to-orange-500 h-full rounded-full transition-all duration-500"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Right Col: Próximos Partidos & Sección de Equipos del Club */}
        <div className="space-y-6">
          {/* Próximos Partidos con Escudos */}
          <div className="bg-white p-6 rounded-3xl border border-gray-150 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-gray-900 font-athletic tracking-wide flex items-center gap-2">
                <Calendar className="w-4 h-4 text-orange-500" /> Próximos Partidos
              </h3>
              <button
                onClick={() => onNavigate('partidos')}
                className="text-xs font-semibold text-gray-500 hover:text-gray-900"
              >
                Ver todos
              </button>
            </div>

            <div className="space-y-3">
              {proximosPartidos.length === 0 ? (
                <p className="text-xs text-gray-400 text-center py-6">No hay partidos programados próximamente.</p>
              ) : (
                proximosPartidos.map(partido => {
                  const clubTeam = partido.equipo || (equipos.some(e => e.nombre === partido.local) ? partido.local : partido.visitante);
                  const dateObj = new Date(partido.fecha);
                  const formattedDate = !isNaN(dateObj.getTime())
                    ? dateObj.toLocaleDateString('es-ES', { weekday: 'short', day: 'numeric', month: 'short' })
                    : partido.fecha;
                  const formattedTime = !isNaN(dateObj.getTime())
                    ? dateObj.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })
                    : '';

                  return (
                    <div
                      key={partido.id}
                      className="p-3.5 bg-gray-50 rounded-2xl border border-gray-100 hover:border-orange-200 transition-colors space-y-2.5"
                    >
                      <div className="flex items-center justify-between text-[11px] text-gray-500">
                        <span className="font-semibold text-orange-600 bg-orange-50 px-2 py-0.5 rounded-md">
                          {partido.categoria}
                        </span>
                        <span className="flex items-center gap-1 font-medium">
                          <Clock className="w-3 h-3 text-gray-400" />
                          {formattedDate} {formattedTime}
                        </span>
                      </div>

                      {/* Equipos con escudos */}
                      <div className="flex items-center justify-between gap-2 py-1">
                        <div className="flex items-center gap-2 min-w-0 flex-1">
                          <div className="w-7 h-7 rounded-lg bg-white border border-gray-200 p-0.5 flex items-center justify-center shrink-0">
                            <TeamShield
                              escudoUrl={partido.local === clubTeam ? getTeamEscudo(partido.local) : resolveVisitorShield(partido)}
                              teamName={partido.local}
                              size="xs"
                              className="w-full h-full"
                            />
                          </div>
                          <span className="font-bold text-xs text-gray-900 truncate font-athletic" title={partido.local}>
                            {partido.local}
                          </span>
                        </div>

                        <span className="px-2 py-0.5 bg-gray-200 rounded text-[10px] font-bold text-gray-600 shrink-0">
                          VS
                        </span>

                        <div className="flex items-center justify-end gap-2 min-w-0 flex-1 text-right">
                          <span className="font-bold text-xs text-gray-900 truncate font-athletic" title={partido.visitante}>
                            {partido.visitante}
                          </span>
                          <div className="w-7 h-7 rounded-lg bg-white border border-gray-200 p-0.5 flex items-center justify-center shrink-0">
                            <TeamShield
                              escudoUrl={partido.visitante === clubTeam ? getTeamEscudo(partido.visitante) : resolveVisitorShield(partido)}
                              teamName={partido.visitante}
                              size="xs"
                              className="w-full h-full"
                            />
                          </div>
                        </div>
                      </div>

                      <div className="pt-1 border-t border-gray-200/60">
                        <button
                          onClick={() => onNavigate('partidos')}
                          className="w-full text-[11px] font-bold py-1.5 bg-gray-900 hover:bg-black text-white rounded-lg text-center transition-colors flex items-center justify-center gap-1.5"
                        >
                          <Calendar className="w-3 h-3 text-orange-400" />
                          Ver Detalles y Marcador
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>


        </div>
      </div>

      {/* Modal de Estado y Clasificación de los Equipos (visible para visitantes) */}
      <TeamStatusModal isOpen={isStatusOpen} onClose={() => setIsStatusOpen(false)} />

      {/* Modal de Resultados en Directo */}
      <LiveResultsModal isOpen={isLiveOpen} onClose={() => setIsLiveOpen(false)} />
    </div>
  );
};
