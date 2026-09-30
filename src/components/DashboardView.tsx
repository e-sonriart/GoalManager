import React, { useEffect, useMemo, useState } from 'react';
import { useClub } from '../context/ClubContext';
import { TeamShield } from './TeamShield';
import { resolveVisitorShield } from '../utils/shieldPresets';
import { fetchResumenClasificaciones } from '../utils/ffcvClasificacion';
import { openResumenClasificacionesPopup } from '../utils/standingsPopup';
import {
  Calendar,
  Trophy,
  ArrowRight,
  Clock,
  Sparkles,
  ChevronLeft,
  ChevronRight,
  Dumbbell
} from 'lucide-react';
import { ActiveTab } from './Navbar';

interface DashboardViewProps {
  onNavigate: (tab: ActiveTab) => void;
}

const dayKeyFmt = (d: Date): string =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

const parseEventTime = (fecha?: string, hora?: string): number | null => {
  const f = (fecha || '').trim();
  if (!f) return null;
  if (f.includes('T') && f.length >= 16) {
    const t = new Date(f).getTime();
    return isNaN(t) ? null : t;
  }
  if (f.length === 10) {
    const [y, m, d] = f.split('-').map(Number);
    if (!y || !m || !d) return null;
    if (hora && hora.length >= 5) {
      const t = new Date(y, m - 1, d, Number(hora.slice(0, 2)), Number(hora.slice(3, 5))).getTime();
      return isNaN(t) ? null : t;
    }
    return new Date(y, m, d, 23, 59, 59).getTime();
  }
  const t = new Date(f).getTime();
  return isNaN(t) ? null : t;
};

const fmtDay = (ms: number): string =>
  new Date(ms).toLocaleDateString('es-ES', { weekday: 'short', day: 'numeric', month: 'short' });

const fmtHour = (ms: number): string =>
  new Date(ms).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });

export const DashboardView: React.FC<DashboardViewProps> = ({ onNavigate }) => {
  const {
    jugadores,
    partidos,
    sesiones,
    estadisticas,
    equipos,
    categorias,
    currentUser,
    clubConfig,
    getTeamEscudo,
    can,
    allowedTabs
  } = useClub();

  const [isFetchingClasif, setIsFetchingClasif] = useState(false);
  const [weekOffset, setWeekOffset] = useState(0);
  const [selectedDay, setSelectedDay] = useState<string | null>(null);

  const canManagePartidos = can('manage:partidos');

  const handleVerClasificaciones = async () => {
    setIsFetchingClasif(true);
    try {
      const sections = await fetchResumenClasificaciones(equipos, categorias);
      openResumenClasificacionesPopup({
        sections,
        highlightNames: [clubConfig?.nombre, ...equipos.map(e => e.nombre)].filter(
          (n): n is string => Boolean(n && n.trim())
        ),
        clubName: clubConfig?.nombre,
        temporada: clubConfig?.temporada
      });
    } finally {
      setIsFetchingClasif(false);
    }
  };

  // Top goleadores/asistencias (del equipo asignado; selector si hay varios)
  const misEquipos = useMemo(() => {
    const asignados = (currentUser?.equipo || '')
      .split(',')
      .map(s => s.trim())
      .filter(Boolean);
    if (asignados.length) return asignados;
    return ['Todos', ...equipos.map(e => e.nombre)];
  }, [currentUser?.equipo, equipos]);

  const [statsTeam, setStatsTeam] = useState('');
  const [statsMetric, setStatsMetric] = useState<'goles' | 'asistencias'>('goles');

  useEffect(() => {
    if (!statsTeam || !misEquipos.includes(statsTeam)) setStatsTeam(misEquipos[0] || '');
  }, [misEquipos, statsTeam]);

  // Próximos partidos ordenados por fecha
  const proximosPartidos = useMemo(
    () => partidos
      .filter(p => !p.finalizado)
      .sort((a, b) => new Date(a.fecha).getTime() - new Date(b.fecha).getTime())
      .slice(0, 3),
    [partidos]
  );

  interface ProxEvento {
    tipo: 'partido' | 'entrenamiento';
    when: number;
    equipo: string;
    titulo: string;
    detalle: string;
    fechaLabel: string;
    horaLabel: string;
  }

  // Próximo evento más cercano (partido o entrenamiento) del equipo del entrenador
  const proximoEvento = useMemo<ProxEvento | null>(() => {
    const now = Date.now();
    const eq = (currentUser?.equipo || '').trim().toLowerCase();
    const evs: ProxEvento[] = [];
    for (const p of partidos) {
      if (p.finalizado) continue;
      if (eq && (p.equipo || '').trim().toLowerCase() !== eq) continue;
      const when = parseEventTime(p.fecha, p.hora);
      if (when === null || when < now) continue;
      evs.push({
        tipo: 'partido',
        when,
        equipo: p.equipo || (equipos.some(e => e.nombre === p.local) ? p.local : p.visitante),
        titulo: `${p.local} vs ${p.visitante}`,
        detalle: `${p.categoria}${p.campo ? ` · ${p.campo}` : ''}`,
        fechaLabel: fmtDay(when),
        horaLabel: fmtHour(when)
      });
    }
    for (const s of sesiones) {
      if (eq && (s.equipo || '').trim().toLowerCase() !== eq) continue;
      const when = parseEventTime(s.fecha, s.hora);
      if (when === null || when < now) continue;
      evs.push({
        tipo: 'entrenamiento',
        when,
        equipo: s.equipo,
        titulo: s.titulo || s.objetivo,
        detalle: `${s.equipo}${s.lugar ? ` · ${s.lugar}` : ''}`,
        fechaLabel: fmtDay(when),
        horaLabel: (s.hora && s.hora.length >= 5) ? s.hora : ((s.fecha || '').includes('T') ? fmtHour(when) : '')
      });
    }
    evs.sort((a, b) => a.when - b.when);
    return evs[0] || null;
  }, [partidos, sesiones, currentUser?.equipo, equipos]);

  // Calendario de la semana (lunes a domingo) con eventos E/P
  const weekStart = useMemo(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    const dow = (d.getDay() + 6) % 7;
    d.setDate(d.getDate() - dow + weekOffset * 7);
    return d;
  }, [weekOffset]);

  const weekDays = useMemo(
    () => Array.from({ length: 7 }, (_, i) => {
      const d = new Date(weekStart);
      d.setDate(d.getDate() + i);
      return d;
    }),
    [weekStart]
  );

  const weekLabel = useMemo(() => {
    const end = new Date(weekStart);
    end.setDate(end.getDate() + 6);
    const opts = { month: 'short' } as const;
    const m1 = weekStart.toLocaleDateString('es-ES', opts);
    const m2 = end.toLocaleDateString('es-ES', opts);
    return m1 === m2
      ? `${weekStart.getDate()}–${end.getDate()} ${m1}`
      : `${weekStart.getDate()} ${m1} – ${end.getDate()} ${m2}`;
  }, [weekStart]);

  const weekEventsByDay = useMemo(() => {
    const map = new Map<string, { tipo: 'E' | 'P'; titulo: string; hora: string; detalle: string }[]>();
    const push = (key: string, ev: { tipo: 'E' | 'P'; titulo: string; hora: string; detalle: string }) => {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(key)) return;
      const list = map.get(key) || [];
      list.push(ev);
      map.set(key, list);
    };
    for (const s of sesiones) {
      push((s.fecha || '').slice(0, 10), {
        tipo: 'E',
        titulo: s.titulo || s.objetivo,
        hora: (s.hora && s.hora.length >= 5) ? s.hora : '',
        detalle: `${s.equipo}${s.lugar ? ` · ${s.lugar}` : ''}`
      });
    }
    for (const p of partidos) {
      if (p.finalizado) continue;
      const fecha = String(p.fecha || '');
      push(fecha.slice(0, 10), {
        tipo: 'P',
        titulo: `${p.local} vs ${p.visitante}`,
        hora: fecha.includes('T') ? fecha.slice(11, 16) : ((p.hora && p.hora.length >= 5) ? p.hora : ''),
        detalle: `${p.equipo || ''}${p.campo ? ` · ${p.campo}` : ''}`
      });
    }
    return map;
  }, [sesiones, partidos]);

  // Ranking de goles/asistencias filtrado por equipo y métrica
  const topJugadoresData = useMemo(() => {
    const list = estadisticas.map(st => {
      const player = jugadores.find(j => j.id === st.jugadorId);
      return {
        nombre: player ? player.nombre : 'Desconocido',
        dorsal: player ? player.dorsal : '-',
        equipo: (player?.equipo || '').trim(),
        goles: Number(st.goles) || 0,
        asistencias: Number(st.asistencias) || 0
      };
    });
    const filtered =
      statsTeam && statsTeam !== 'Todos'
        ? list.filter(d => d.equipo.toLowerCase() === statsTeam.toLowerCase())
        : list;
    const metricVal = (d: { goles: number; asistencias: number }) =>
      statsMetric === 'goles' ? d.goles : d.asistencias;
    return filtered.sort((a, b) => metricVal(b) - metricVal(a)).slice(0, 5);
  }, [estadisticas, jugadores, statsTeam, statsMetric]);

  const maxVal = Math.max(
    ...topJugadoresData.map(d => (statsMetric === 'goles' ? d.goles : d.asistencias)),
    1
  );

  const canGo = (tab: ActiveTab) => allowedTabs.includes(tab);

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Top Banner con Escudo del Club */}
      <div className="relative overflow-hidden bg-gradient-to-r from-gray-950 via-gray-900 to-black text-white p-6 sm:p-8 rounded-3xl border border-gray-800 shadow-xl">
        <div className="absolute top-0 right-0 w-96 h-96 bg-orange-500/10 rounded-full blur-3xl -mr-20 -mt-20 pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-start sm:items-center gap-4 sm:gap-5">
            <div className="w-24 h-24 sm:w-32 sm:h-32 rounded-2xl bg-white/10 p-2 flex items-center justify-center border border-white/20 shadow-inner shrink-0 ring-2 ring-orange-500/30">
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
        </div>
      </div>

      {/* Acciones rápidas (fuera de la tarjeta del club) */}
      <div className="flex flex-wrap items-center justify-center gap-3">
        {canGo('partidos') && (
          <button
            onClick={() => onNavigate('partidos')}
            className="px-4 py-2.5 bg-orange-500 hover:bg-orange-600 text-white rounded-xl text-xs font-bold tracking-wide transition-all shadow-md shadow-orange-500/20 flex items-center gap-2"
          >
            <Calendar className="w-4 h-4" />
            {canManagePartidos ? 'Gestionar Partidos' : 'Ver Calendario'}
          </button>
        )}
        {canGo('entrenamientos') && (
          <button
            onClick={() => onNavigate('entrenamientos')}
            className="px-4 py-2.5 bg-white hover:bg-gray-50 text-gray-800 border border-gray-200 rounded-xl text-xs font-bold tracking-wide transition-all flex items-center gap-2 shadow-xs"
          >
            <Dumbbell className="w-4 h-4 text-orange-500" />
            Entrenamientos
          </button>
        )}
      </div>

      {/* Próximo evento (solo entrenadores): lo primero bajo el escudo y la temporada */}
      {currentUser?.rol === 'entrenador' && (
        <div className="bg-white rounded-2xl border border-gray-150 shadow-xs p-4 sm:p-5 space-y-3 animate-in fade-in duration-300">
          <div className="flex items-center justify-between gap-2">
            <p className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-gray-500 flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-orange-500" /> Próximo Evento
            </p>
            {proximoEvento && (
              <span
                className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border ${
                  proximoEvento.tipo === 'partido'
                    ? 'bg-blue-50 text-blue-700 border-blue-200'
                    : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                }`}
              >
                {proximoEvento.tipo === 'partido' ? '⚽ Partido' : '🏋️ Entrenamiento'}
              </span>
            )}
          </div>

          {proximoEvento ? (
            <>
              <div className="flex items-start gap-3">
                <div
                  className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 ${
                    proximoEvento.tipo === 'partido'
                      ? 'bg-blue-100 text-blue-600'
                      : 'bg-emerald-100 text-emerald-600'
                  }`}
                >
                  {proximoEvento.tipo === 'partido' ? (
                    <Calendar className="w-6 h-6" />
                  ) : (
                    <Dumbbell className="w-6 h-6" />
                  )}
                </div>
                <div className="min-w-0">
                  <h3 className="text-lg font-black text-gray-900 font-athletic tracking-tight truncate">
                    {proximoEvento.titulo}
                  </h3>
                  <p className="text-xs text-gray-500 truncate">{proximoEvento.equipo}</p>
                  <p className="text-[11px] text-gray-400 truncate">{proximoEvento.detalle}</p>
                </div>
              </div>

              <div className="flex items-center justify-between gap-3 pt-2 border-t border-gray-100">
                <span className="text-xs font-bold text-orange-600 capitalize flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5" />
                  {proximoEvento.fechaLabel} {proximoEvento.horaLabel && `· ${proximoEvento.horaLabel}`}
                </span>
                {canGo(proximoEvento.tipo === 'partido' ? 'partidos' : 'entrenamientos') && (
                  <button
                    onClick={() => onNavigate(proximoEvento.tipo === 'partido' ? 'partidos' : 'entrenamientos')}
                    className="px-3 py-1.5 bg-gray-900 hover:bg-black text-white rounded-lg text-[11px] font-bold transition-colors flex items-center gap-1.5 shrink-0"
                  >
                    Ver <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </>
          ) : (
            <p className="text-xs text-gray-400">No hay eventos programados próximamente para tu equipo.</p>
          )}
        </div>
      )}

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
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 sm:gap-4">
        <div
          role="button"
          tabIndex={0}
          onClick={() => {
            if (canGo('partidos')) onNavigate('partidos');
          }}
          onKeyDown={e => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              if (canGo('partidos')) onNavigate('partidos');
            }
          }}
          className="group text-left bg-white p-3.5 sm:p-5 rounded-2xl border border-gray-150 shadow-xs hover:border-orange-300 hover:shadow-md transition-all cursor-pointer lg:col-span-2"
        >
          <div className="flex flex-col sm:flex-row items-center sm:items-start gap-2.5 sm:gap-4">
            <div className="p-2 sm:p-3.5 rounded-xl sm:rounded-2xl bg-blue-100 text-blue-600 shrink-0 group-hover:bg-blue-200 transition-colors">
              <Calendar className="w-5 h-5 sm:w-6 sm:h-6" />
            </div>
            <div className="text-center sm:text-left min-w-0 flex-1">
              <p className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-gray-500 truncate">Calendario semanal</p>
            </div>
            {canGo('partidos') && (
              <ChevronRight className="hidden sm:block w-5 h-5 text-gray-300 group-hover:text-orange-500 transition-colors shrink-0 self-center" />
            )}
          </div>

          {/* Calendario de la semana: E = entrenamiento, P = partido */}
          <div className="mt-3 pt-3 border-t border-gray-100 space-y-2" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <button
                type="button"
                onClick={() => {
                  setWeekOffset(o => o - 1);
                  setSelectedDay(null);
                }}
                className="w-6 h-6 rounded-md bg-gray-100 hover:bg-gray-200 text-gray-600 flex items-center justify-center transition-colors"
                aria-label="Semana anterior"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
              </button>
              <span className="text-[10px] font-bold uppercase tracking-wider text-gray-500">{weekLabel}</span>
              <button
                type="button"
                onClick={() => {
                  setWeekOffset(o => o + 1);
                  setSelectedDay(null);
                }}
                className="w-6 h-6 rounded-md bg-gray-100 hover:bg-gray-200 text-gray-600 flex items-center justify-center transition-colors"
                aria-label="Semana siguiente"
              >
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="grid grid-cols-7 gap-1">
              {weekDays.map((d, i) => {
                const key = dayKeyFmt(d);
                const evs = weekEventsByDay.get(key) || [];
                const hasE = evs.some(ev => ev.tipo === 'E');
                const hasP = evs.some(ev => ev.tipo === 'P');
                const isToday = key === dayKeyFmt(new Date());
                const isSelected = selectedDay === key;
                return (
                  <button
                    type="button"
                    key={key}
                    disabled={!evs.length}
                    onClick={() => setSelectedDay(isSelected ? null : key)}
                    className={`rounded-lg border py-1 flex flex-col items-center gap-0.5 transition-all ${
                      isSelected
                        ? 'bg-orange-500 border-orange-500 text-white shadow-sm'
                        : evs.length
                        ? `bg-white border-gray-200 hover:border-orange-400 ${isToday ? 'ring-1 ring-orange-400' : ''}`
                        : 'bg-gray-50 border-transparent'
                    }`}
                  >
                    <span className={`text-[9px] font-bold uppercase ${isSelected ? 'text-orange-100' : 'text-gray-400'}`}>
                      {['L', 'M', 'X', 'J', 'V', 'S', 'D'][i]}
                    </span>
                    <span className={`text-xs font-black leading-none ${evs.length || isSelected ? '' : 'text-gray-400'}`}>
                      {d.getDate()}
                    </span>
                    <span className="flex gap-0.5 justify-center min-h-[12px]">
                      {hasE && (
                        <span
                          className={`px-1 rounded text-[9px] font-black leading-tight ${
                            isSelected ? 'bg-white/25 text-white' : 'bg-emerald-100 text-emerald-700'
                          }`}
                        >
                          E
                        </span>
                      )}
                      {hasP && (
                        <span
                          className={`px-1 rounded text-[9px] font-black leading-tight ${
                            isSelected ? 'bg-white/25 text-white' : 'bg-blue-100 text-blue-700'
                          }`}
                        >
                          P
                        </span>
                      )}
                    </span>
                  </button>
                );
              })}
            </div>

            {selectedDay && (
              <div className="space-y-1.5">
                {(weekEventsByDay.get(selectedDay) || []).map((ev, idx) => (
                  <div key={idx} className="flex items-start gap-2 p-2 rounded-xl bg-gray-50 border border-gray-100">
                    <span
                      className={`shrink-0 w-5 h-5 rounded-md text-[10px] font-black flex items-center justify-center ${
                        ev.tipo === 'E' ? 'bg-emerald-100 text-emerald-700' : 'bg-blue-100 text-blue-700'
                      }`}
                    >
                      {ev.tipo}
                    </span>
                    <div className="min-w-0">
                      <p className="text-[11px] font-bold text-gray-900 truncate">
                        {ev.hora && <span className="text-orange-600 mr-1">{ev.hora}</span>}
                        {ev.titulo}
                      </p>
                      <p className="text-[10px] text-gray-500 truncate">{ev.detalle}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <button
          onClick={handleVerClasificaciones}
          disabled={isFetchingClasif}
          className="group text-left bg-white p-3.5 sm:p-5 rounded-2xl border border-gray-150 shadow-xs hover:border-orange-300 hover:shadow-md transition-all flex flex-col sm:flex-row items-center sm:items-start gap-2.5 sm:gap-4 cursor-pointer disabled:opacity-60 disabled:cursor-wait"
        >
          <div className="p-2 sm:p-3.5 rounded-xl sm:rounded-2xl bg-orange-100 text-orange-600 shrink-0">
            <Trophy className="w-5 h-5 sm:w-6 sm:h-6" />
          </div>
          <div className="text-center sm:text-left min-w-0 flex-1">
            <p className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-gray-500 truncate">Estado de los Equipos</p>
            <h3 className="text-xl sm:text-2xl font-black text-gray-900 font-athletic">
              {isFetchingClasif ? 'Extrayendo…' : 'Ver Clasificación'}
            </h3>
            <p className="hidden sm:block text-[11px] text-gray-400">
              Por categoría: tu equipo con el anterior y el posterior
            </p>
          </div>
          <ChevronRight className="hidden sm:block w-5 h-5 text-gray-300 group-hover:text-orange-500 transition-colors shrink-0 self-center" />
        </button>
      </div>

      {/* Main Grid: Ranking de Jugadores + Upcoming Matches */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Ranking */}
        <div className="lg:col-span-2 space-y-6">
          {/* Ranking goles/asistencias por equipo asignado */}
          <div className="bg-white p-6 rounded-3xl border border-gray-150 shadow-sm space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h3 className="text-base font-bold text-gray-900 font-athletic tracking-wide">
                  {statsMetric === 'goles' ? 'Top Goleadores' : 'Top Asistencias'}
                </h3>
                <p className="text-xs text-gray-500">
                  {statsTeam && statsTeam !== 'Todos' ? statsTeam : 'Todos los equipos'} · goles y asistencias
                </p>
              </div>
              <div className="flex items-center gap-2">
                {misEquipos.length > 1 && (
                  <select
                    value={statsTeam}
                    onChange={e => setStatsTeam(e.target.value)}
                    className="px-2.5 py-1.5 border border-gray-200 rounded-lg text-xs font-bold text-gray-700 bg-white focus:ring-2 focus:ring-orange-500 focus:outline-none max-w-[160px]"
                  >
                    {misEquipos.map(t => (
                      <option key={t} value={t}>{t}</option>
                    ))}
                  </select>
                )}
                <div className="flex bg-gray-100 rounded-lg p-0.5">
                  {(['goles', 'asistencias'] as const).map(m => (
                    <button
                      key={m}
                      type="button"
                      onClick={() => setStatsMetric(m)}
                      className={`px-2.5 py-1 rounded-md text-[11px] font-bold transition-colors ${
                        statsMetric === m
                          ? 'bg-white text-gray-900 shadow-sm'
                          : 'text-gray-500 hover:text-gray-700'
                      }`}
                    >
                      {m === 'goles' ? 'Goles' : 'Asist.'}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="space-y-3 pt-2">
              {topJugadoresData.length === 0 && (
                <p className="text-xs text-gray-400 text-center py-6">Sin datos de este equipo.</p>
              )}
              {topJugadoresData.map((jug, idx) => {
                const metricVal = statsMetric === 'goles' ? jug.goles : jug.asistencias;
                const pct = Math.round((metricVal / maxVal) * 100);
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
                        <span className="font-bold text-orange-600 font-athletic text-sm whitespace-nowrap">
                          {metricVal} {statsMetric === 'goles' ? 'Goles' : 'Asist.'}
                        </span>
                        <span className="hidden sm:inline text-gray-400 text-[11px] whitespace-nowrap">
                          {statsMetric === 'goles' ? `${jug.asistencias} Asist.` : `${jug.goles} Goles`}
                        </span>
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

            {canGo('estadisticas') && (
              <button
                onClick={() => onNavigate('estadisticas')}
                className="w-full text-xs font-bold text-orange-600 hover:text-orange-700 flex items-center justify-center gap-1 pt-2 border-t border-gray-100"
              >
                Ver Ranking Completo <ArrowRight className="w-3.5 h-3.5" />
              </button>
            )}
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
    </div>
  );
};
