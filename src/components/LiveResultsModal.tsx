import React, { useEffect, useMemo, useState } from 'react';
import { Modal } from './Modal';
import { useClub } from '../context/ClubContext';
import { TeamShield } from './TeamShield';
import { resolveVisitorShield } from '../utils/shieldPresets';
import { MatchHighlights } from './MatchHighlights';
import { eventsForPartido } from '../utils/matchHighlights';
import { useRemoteClocks } from '../hooks/useRemoteClocks';
import { Partido, Categoria } from '../types';
import {
  FASE_LABEL,
  elapsedMsOf,
  fmtTime,
  isClockActive,
  listClocks,
  loadClock,
  minuteLabelOf,
  scoreFromClock,
  type MatchClock
} from '../utils/matchClock';
import { CheckCircle2, Clock, Radio, RefreshCw, Timer } from 'lucide-react';

interface LiveResultsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const toScore = (value: number | string | undefined): number | null => {
  if (value === undefined || value === null || value === '') return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
};

const isFinalizado = (value: boolean | string | undefined): boolean => {
  if (typeof value === 'boolean') return value;
  if (typeof value === 'string') {
    return ['true', 'si', 'sí', 'final', 'finalizado', '1'].includes(value.trim().toLowerCase());
  }
  return false;
};

const hasScore = (p: Partido) => toScore(p.golesLocal) !== null && toScore(p.golesVisitante) !== null;

/** En directo: reloj en juego O kickoff dentro de las próximas 24 h */
const LIVE_LOOKAHEAD_MS = 24 * 60 * 60 * 1000;

const kickMs = (fecha: string): number => {
  const t = new Date(fecha).getTime();
  return Number.isFinite(t) ? t : NaN;
};

const formatFecha = (fecha: string): string => {
  const dateObj = new Date(fecha);
  if (isNaN(dateObj.getTime())) return fecha;
  return dateObj.toLocaleDateString('es-ES', { weekday: 'short', day: 'numeric', month: 'short' });
};

const formatHora = (fecha: string): string => {
  const dateObj = new Date(fecha);
  if (isNaN(dateObj.getTime())) return '';
  return dateObj.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
};

export const LiveResultsModal: React.FC<LiveResultsModalProps> = ({ isOpen, onClose }) => {
  const { partidos, equipos, categorias, getTeamEscudo, refreshAll, loading } = useClub();

  /** Tick en vivo del reloj de pared (no depende de sesión ni de la vista de eventos) */
  const [now, setNow] = useState(() => Date.now());

  /** Relojes remotos: goles/tarjetas de partidos jugados en otro dispositivo */
  const remoteClocks = useRemoteClocks(isOpen);

  useEffect(() => {
    if (!isOpen) return;
    setNow(Date.now());
    const id = window.setInterval(() => setNow(Date.now()), 500);
    const onClock = () => setNow(Date.now());
    const onStorage = (e: StorageEvent) => {
      if (e.key && e.key.startsWith('cf_match_clock_')) setNow(Date.now());
    };
    window.addEventListener('cf_match_clock_updated', onClock);
    window.addEventListener('storage', onStorage);
    return () => {
      window.clearInterval(id);
      window.removeEventListener('cf_match_clock_updated', onClock);
      window.removeEventListener('storage', onStorage);
    };
  }, [isOpen]);

  const clocksById = useMemo(() => {
    const map = new Map<string, MatchClock>();
    listClocks().forEach(({ partidoId, clock }) => map.set(partidoId, clock));
    partidos.forEach(p => {
      if (!map.has(p.id)) map.set(p.id, loadClock(p.id, isFinalizado(p.finalizado)));
    });
    return map;
    // now solo fuerza relectura al refrescar; los datos vienen de localStorage
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [partidos, now]);

  const { enDirecto, ultimos } = useMemo(() => {
    // En directo: no finalizado y (reloj en juego O kickoff en las próximas 24 h)
    const enDirecto = partidos
      .filter(p => {
        if (isFinalizado(p.finalizado)) return false;
        const clock = clocksById.get(p.id);
        if (isClockActive(clock)) return true;
        const kick = kickMs(p.fecha);
        if (!Number.isFinite(kick)) return false;
        return kick >= now && kick <= now + LIVE_LOOKAHEAD_MS;
      })
      .sort((a, b) => kickMs(a.fecha) - kickMs(b.fecha));

    // Últimos: finalizados en las últimas 24 h (se ocultan los de más de 24 h)
    const ultimos = partidos
      .filter(p => {
        if (!isFinalizado(p.finalizado) || !hasScore(p)) return false;
        const kick = kickMs(p.fecha);
        if (!Number.isFinite(kick)) return false;
        return kick >= now - LIVE_LOOKAHEAD_MS;
      })
      .sort((a, b) => kickMs(b.fecha) - kickMs(a.fecha))
      .slice(0, 20);

    return { enDirecto, ultimos };
  }, [partidos, clocksById, now]);

  const porParteMinOf = (p: Partido): number => {
    const cat = categorias.find((c: Categoria) => c.nombre === p.categoria);
    return Number(cat?.tiempojuego || cat?.tiempoJuego) || (cat?.tipo === 'F8' ? 25 : 45);
  };

  const esClubLocalOf = (p: Partido): boolean => {
    if (p.equipo) return p.local === p.equipo;
    return equipos.some(e => e.nombre === p.local);
  };

  const renderMarcador = (p: Partido) => {
    const clock = clocksById.get(p.id) || loadClock(p.id, isFinalizado(p.finalizado));
    const finalizado = isFinalizado(p.finalizado);
    const esClubLocal = esClubLocalOf(p);
    const baseLocal = toScore(p.golesLocal) ?? 0;
    const baseVisit = toScore(p.golesVisitante) ?? 0;
    const finalScore = scoreFromClock(undefined, baseLocal, baseVisit, esClubLocal);
    const liveScore = scoreFromClock(clock, baseLocal, baseVisit, esClubLocal);
    const showLive = !finalizado && isClockActive(clock);
    const gl = showLive ? liveScore.golLocal : finalScore.golLocal;
    const gv = showLive ? liveScore.golVisitante : finalScore.golVisitante;
    const hasAnyScore = showLive || (toScore(p.golesLocal) !== null && toScore(p.golesVisitante) !== null);
    const clubTeam =
      p.equipo || (equipos.some(e => e.nombre === p.local) ? p.local : p.visitante);
    const enJuego = showLive || (!finalizado && hasAnyScore && isClockActive(clock));
    const elapsedSec = Math.floor(elapsedMsOf(clock, now) / 1000);
    const porParte = porParteMinOf(p);
    const porParteSec = porParte * 60;
    const overSec = Math.max(0, elapsedSec - porParteSec);
    const timerOn = !finalizado && clock.running && (clock.fase === 'p1' || clock.fase === 'p2');
    const minute = showLive ? minuteLabelOf(clock, porParte, now) : null;

    return (
      <div key={p.id} className="bg-white rounded-2xl border border-gray-150 shadow-xs overflow-hidden">
        {/* Cabecera */}
        <div className="flex items-center justify-between gap-2 px-3.5 py-2 bg-gray-50 border-b border-gray-100">
          <div className="flex items-center gap-2 min-w-0">
            <span className="text-[10px] font-bold uppercase tracking-wider bg-orange-100 text-orange-800 px-2 py-0.5 rounded-md border border-orange-200 shrink-0">
              {p.categoria}
            </span>
            {p.tipo && (
              <span className="text-[10px] font-semibold text-gray-500 truncate">{p.tipo}</span>
            )}
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <span className="text-[10px] text-gray-500 font-medium flex items-center gap-1">
              <Clock className="w-3 h-3" />
              {formatFecha(p.fecha)} {formatHora(p.fecha)}
            </span>
            {finalizado ? (
              <span className="text-[9px] font-bold uppercase tracking-wider bg-emerald-50 text-emerald-700 border border-emerald-200 px-1.5 py-0.5 rounded flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3" /> Final
              </span>
            ) : enJuego || showLive ? (
              <span className="text-[9px] font-bold uppercase tracking-wider bg-red-50 text-red-600 border border-red-200 px-1.5 py-0.5 rounded flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" /> En juego
              </span>
            ) : (
              <span className="text-[9px] font-bold uppercase tracking-wider bg-blue-50 text-blue-600 border border-blue-200 px-1.5 py-0.5 rounded">
                Próximo
              </span>
            )}
          </div>
        </div>

        {/* Reloj en vivo del partido (wall-clock; sigue tras logout) */}
        {showLive && clock && (
          <div className="flex items-center justify-between gap-2 px-3.5 py-1.5 bg-gray-900 border-b border-gray-800 text-white">
            <span className="text-[10px] font-bold uppercase tracking-wider text-orange-400 flex items-center gap-1.5">
              <Timer className={`w-3.5 h-3.5 ${timerOn ? 'text-emerald-400' : 'text-gray-400'}`} />
              {FASE_LABEL[clock.fase]}
              {minute !== null && (
                <span className="text-gray-400 normal-case tracking-normal font-semibold">
                  · {minute}′
                </span>
              )}
            </span>
            <span
              className={`text-sm font-black font-athletic tabular-nums ${
                timerOn && overSec > 0
                  ? 'text-red-400'
                  : timerOn
                    ? 'text-emerald-400'
                    : 'text-gray-300'
              }`}
            >
              {timerOn && overSec > 0 ? `+${fmtTime(overSec)}` : fmtTime(elapsedSec)}
            </span>
          </div>
        )}

        {/* Marcador oscuro */}
        <div className="bg-gray-950 px-3.5 py-3 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0 flex-1">
            <div className="w-8 h-8 rounded-lg bg-white/10 border border-white/15 p-0.5 flex items-center justify-center shrink-0">
              <TeamShield
                escudoUrl={p.local === clubTeam ? getTeamEscudo(p.local) : resolveVisitorShield(p)}
                teamName={p.local}
                size="xs"
                className="w-full h-full"
              />
            </div>
            <span className="font-bold text-xs text-white truncate font-athletic" title={p.local}>
              {p.local}
            </span>
          </div>

          <div className="px-3 py-1 rounded-xl bg-black/40 border border-white/10 shrink-0 text-center min-w-[72px]">
            {hasAnyScore ? (
              <span className="text-lg font-black font-athletic text-orange-400 tracking-wider">
                {gl} - {gv}
              </span>
            ) : (
              <span className="text-sm font-bold text-gray-500">VS</span>
            )}
          </div>

          <div className="flex items-center justify-end gap-2 min-w-0 flex-1 text-right">
            <span className="font-bold text-xs text-white truncate font-athletic" title={p.visitante}>
              {p.visitante}
            </span>
            <div className="w-8 h-8 rounded-lg bg-white/10 border border-white/15 p-0.5 flex items-center justify-center shrink-0">
              <TeamShield
                escudoUrl={p.visitante === clubTeam ? getTeamEscudo(p.visitante) : resolveVisitorShield(p)}
                teamName={p.visitante}
                size="xs"
                className="w-full h-full"
              />
            </div>
          </div>
        </div>

        {/* Acciones destacadas bajo el resultado (goles/tarjetas cronológicos) */}
        <MatchHighlights events={eventsForPartido(p, remoteClocks)} tone="dark" />

        {p.campo && (
          <p className="px-3.5 py-1.5 text-[10px] text-gray-400 bg-gray-50 border-t border-gray-100 truncate">
            📍 {p.campo}
          </p>
        )}
      </div>
    );
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Resultados en Directo"
      subtitle="Marcadores oficiales del club en tiempo real"
      maxWidth="max-w-lg"
    >
      <div className="space-y-5">
        {/* Cabecera en directo */}
        <div className="flex items-center justify-between gap-3 p-3 bg-gray-950 rounded-2xl border border-gray-800">
          <div className="flex items-center gap-2.5 min-w-0">
            <span className="relative flex items-center justify-center w-8 h-8 rounded-full bg-red-500/15 border border-red-500/40 shrink-0">
              <Radio className="w-4 h-4 text-red-500" />
              <span className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse border border-gray-950" />
            </span>
            <div className="min-w-0">
              <p className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
                En directo
                <span className="text-[10px] font-semibold text-red-400 normal-case tracking-normal">
                  {enDirecto.length} partido{enDirecto.length === 1 ? '' : 's'}
                </span>
              </p>
              <p className="text-[10px] text-gray-500 truncate">En juego o en las próximas 24 h</p>
            </div>
          </div>
          <button
            onClick={() => refreshAll()}
            disabled={loading}
            title="Actualizar resultados"
            className="h-8 px-2.5 rounded-lg bg-gray-900 hover:bg-gray-800 border border-gray-800 text-gray-300 text-[11px] font-bold flex items-center gap-1.5 transition-colors shrink-0 disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-orange-400' : ''}`} />
            Actualizar
          </button>
        </div>

        {/* Sección: ahora / en juego */}
        <div className="space-y-3">
          <h4 className="text-[11px] font-bold text-gray-500 uppercase tracking-wider flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
            Ahora en el campo
          </h4>
          {enDirecto.length === 0 ? (
            <p className="text-xs text-gray-400 text-center py-5 bg-gray-50 rounded-2xl border border-gray-100">
              No hay partidos en juego ni programados en las próximas 24 h.
            </p>
          ) : (
            enDirecto.map(renderMarcador)
          )}
        </div>

        {/* Sección: últimos resultados */}
        <div className="space-y-3">
          <h4 className="text-[11px] font-bold text-gray-500 uppercase tracking-wider flex items-center gap-1.5">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
            Últimos resultados
          </h4>
          {ultimos.length === 0 ? (
            <p className="text-xs text-gray-400 text-center py-5 bg-gray-50 rounded-2xl border border-gray-100">
              No hay resultados finalizados en las últimas 24 h.
            </p>
          ) : (
            ultimos.map(renderMarcador)
          )}
        </div>
      </div>
    </Modal>
  );
};
