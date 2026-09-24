import React, { useState, useMemo, useEffect } from 'react';
import { useClub } from '../context/ClubContext';
import { TeamShield } from './TeamShield';
import { resolveVisitorShield } from '../utils/shieldPresets';
import { convocatoriaStatsDeltas } from '../utils/playerStatsFromEvents';
import {
  ClipboardList,
  CheckCircle2,
  XCircle,
  Clock,
  Check,
  Share2,
  ArrowLeft,
  Users,
  ListChecks
} from 'lucide-react';

interface ConvocatoriasViewProps {
  initialPartidoId?: string;
  onBack?: (partidoId: string) => void;
}

export const ConvocatoriasView: React.FC<ConvocatoriasViewProps> = ({ initialPartidoId, onBack }) => {
  const {
    partidos,
    jugadores,
    allJugadores,
    equipos,
    savePartido,
    applyEventStats,
    getTeamEscudo,
    can
  } = useClub();

  const canManage = can('manage:convocatorias');

  const [selectedPartidoId, setSelectedPartidoId] = useState<string>(
    initialPartidoId || partidos[0]?.id || ''
  );
  const [copied, setCopied] = useState(false);

  // Selección local: NO se guarda hasta pulsar "Convocar" (aceptar)
  const [localConvocados, setLocalConvocados] = useState<Set<string>>(new Set());

  const selectedPartido = useMemo(() => {
    return partidos.find(p => p.id === selectedPartidoId) || partidos[0];
  }, [partidos, selectedPartidoId]);

  const selectedId = selectedPartido?.id;

  // Cargar la convocatoria guardada al entrar o cambiar de partido (descarta cambios pendientes)
  useEffect(() => {
    if (selectedId) {
      const stored = partidos.find(p => p.id === selectedId);
      setLocalConvocados(new Set(stored?.convocados || []));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedId]);

  const clubTeamName = useMemo(() => {
    if (!selectedPartido) return '';
    return selectedPartido.equipo || (
      equipos.some(e => e.nombre === selectedPartido.local)
        ? selectedPartido.local
        : selectedPartido.visitante
    );
  }, [selectedPartido, equipos]);

  // Jugadores elegibles: todo el club (propio, otros equipos del club o sin equipo), ordenados por relevancia
  const eligibleJugadores = useMemo(() => {
    const pool = allJugadores.length > 0 ? allJugadores : jugadores;
    if (!selectedPartido) return pool;
    const teamLc = (clubTeamName || selectedPartido.equipo || '').toLowerCase();
    const catLc = (selectedPartido.categoria || '').toLowerCase();
    const rank = (j: (typeof pool)[number]) => {
      const eq = (j.equipo || '').toLowerCase();
      if (teamLc && eq === teamLc) return 0;
      if (catLc && (j.categoria || '').toLowerCase() === catLc) return 1;
      if (eq) return 2;
      return 3;
    };
    return [...pool].sort((a, b) => {
      const ra = rank(a);
      const rb = rank(b);
      if (ra !== rb) return ra - rb;
      return a.nombre.localeCompare(b.nombre, 'es');
    });
  }, [allJugadores, jugadores, selectedPartido, clubTeamName]);

  const totalConvocados = useMemo(() => {
    let count = 0;
    eligibleJugadores.forEach(j => {
      if (localConvocados.has(j.id)) count++;
    });
    return count;
  }, [eligibleJugadores, localConvocados]);

  const toggleLocal = (jugadorId: string) => {
    if (!canManage) return;
    setLocalConvocados(prev => {
      const next = new Set(prev);
      if (next.has(jugadorId)) next.delete(jugadorId);
      else next.add(jugadorId);
      return next;
    });
  };

  const handleSelectAll = () => {
    if (!canManage) return;
    setLocalConvocados(new Set(eligibleJugadores.map(j => j.id)));
  };

  const handleClear = () => {
    if (!canManage) return;
    setLocalConvocados(new Set());
  };

  // ACEPTAR: guarda la selección y suma +1 partido jugado a cada convocado nuevo
  const handleAccept = async () => {
    if (!selectedPartido || !canManage) return;
    const prev: string[] = Array.isArray(selectedPartido.convocados)
      ? selectedPartido.convocados.filter((id): id is string => typeof id === 'string')
      : [];
    const next: string[] = Array.from(localConvocados).filter((id): id is string => typeof id === 'string');
    await savePartido({
      ...selectedPartido,
      convocados: next
    });
    const titulares: string[] = Array.isArray(selectedPartido.titulares)
      ? selectedPartido.titulares.filter((id): id is string => typeof id === 'string')
      : [];
    const deltas = convocatoriaStatsDeltas(prev, next, titulares);
    if (deltas.length) await applyEventStats(deltas, 1);
    onBack?.(selectedPartido.id);
  };

  // CANCELAR: descarta cambios y vuelve a la tarjeta del partido
  const handleCancel = () => {
    if (selectedPartido) {
      setLocalConvocados(new Set(selectedPartido.convocados || []));
    }
    onBack?.(selectedPartido.id);
  };

  const handleShareSquad = async () => {
    if (!selectedPartido) return;
    const convocadosList = eligibleJugadores
      .filter(j => localConvocados.has(j.id))
      .map(j => `• #${j.dorsal} ${j.nombre} (${j.posicion})`)
      .join('\n');

    const text = `📋 CONVOCATORIA OFICIAL\n⚽ ${selectedPartido.local} vs ${selectedPartido.visitante}\n🏆 Categoría: ${selectedPartido.categoria}\n📅 Fecha: ${new Date(selectedPartido.fecha).toLocaleDateString('es-ES')}\n\nJUGADORES CONVOCADOS (${totalConvocados}):\n${convocadosList || 'Ninguno aún'}\n\n¡A por los 3 puntos! ⚽🔥`;

    if (typeof navigator !== 'undefined' && navigator.share) {
      try {
        await navigator.share({
          title: `Convocatoria: ${selectedPartido.local} vs ${selectedPartido.visitante}`,
          text
        });
        return;
      } catch (err) {
        // Cancelado o fallback a portapapeles
      }
    }

    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      await navigator.clipboard.writeText(text);
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 3000);
  };

  if (!selectedPartido) {
    return (
      <div className="bg-white p-8 rounded-2xl border text-center text-gray-400">
        <ClipboardList className="w-8 h-8 mx-auto mb-2 text-gray-300" />
        <p className="font-semibold text-sm">No hay partidos creados para gestionar convocatorias.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 font-athletic tracking-tight">
            CONVOCATORIAS POR <span className="text-orange-600">PARTIDO</span>
          </h1>
          <p className="text-xs text-gray-500 mt-0.5">
            Selecciona el partido y confecciona la lista de citados para el encuentro.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={handleShareSquad}
            className="px-4 py-2 bg-gray-900 hover:bg-black text-white rounded-xl text-xs font-bold transition-all shadow-sm flex items-center gap-1.5"
          >
            {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Share2 className="w-4 h-4 text-orange-400" />}
            {copied ? '¡Copiado!' : 'Compartir Lista (WhatsApp)'}
          </button>
        </div>
      </div>

      {/* Selector de Partido Activo */}
      <div className="bg-white p-5 rounded-2xl border border-gray-150 shadow-sm space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex-1">
            <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
              Seleccionar Partido a Convocar:
            </label>
            <select
              value={selectedPartidoId}
              onChange={e => setSelectedPartidoId(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm font-semibold text-gray-900 focus:ring-2 focus:ring-orange-500 focus:outline-none"
            >
              {partidos.map(p => (
                <option key={p.id} value={p.id}>
                  {p.local} vs {p.visitante} — {p.categoria} ({new Date(p.fecha).toLocaleDateString('es-ES')})
                </option>
              ))}
            </select>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={handleSelectAll}
              disabled={!canManage}
              title={canManage ? 'Marcar a toda la plantilla elegible' : 'Solo lectura'}
              className="px-3 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 rounded-xl text-xs font-bold transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Seleccionar Todos
            </button>
            <button
              onClick={handleClear}
              disabled={!canManage}
              title={canManage ? 'Vaciar la selección actual' : 'Solo lectura'}
              className="px-3 py-2 bg-gray-100 hover:bg-gray-200 rounded-xl text-xs font-bold transition-colors disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-gray-100"
            >
              Limpiar Selección
            </button>
          </div>
        </div>

        {/* Info Banner del Partido con Escudos */}
        <div className="bg-gray-950 text-white p-4 sm:p-5 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-4 border border-gray-800 shadow-inner">
          <div className="flex items-center gap-3.5 flex-1 min-w-0">
            <div className="flex items-center gap-1.5 shrink-0">
              <div className="w-10 h-10 rounded-xl bg-white/10 p-1 flex items-center justify-center border border-white/20 overflow-hidden">
                <TeamShield
                  escudoUrl={selectedPartido.local === clubTeamName ? getTeamEscudo(selectedPartido.local) : resolveVisitorShield(selectedPartido)}
                  teamName={selectedPartido.local}
                  size="sm"
                  className="w-full h-full"
                />
              </div>
              <span className="text-xs font-bold text-orange-400 font-athletic">VS</span>
              <div className="w-10 h-10 rounded-xl bg-white/10 p-1 flex items-center justify-center border border-white/20 overflow-hidden">
                <TeamShield
                  escudoUrl={selectedPartido.visitante === clubTeamName ? getTeamEscudo(selectedPartido.visitante) : resolveVisitorShield(selectedPartido)}
                  teamName={selectedPartido.visitante}
                  size="sm"
                  className="w-full h-full"
                />
              </div>
            </div>
            <div className="truncate">
              <h3 className="font-bold text-sm sm:text-base font-athletic tracking-wide truncate">
                {selectedPartido.local} <span className="text-orange-400">vs</span> {selectedPartido.visitante}
              </h3>
              <p className="text-xs text-gray-400 flex items-center gap-2 mt-0.5 truncate">
                <span className="font-medium text-orange-300">{selectedPartido.categoria}</span>
                <span>•</span>
                <span className="flex items-center gap-1 text-gray-300">
                  <Clock className="w-3 h-3 text-orange-400" />
                  {new Date(selectedPartido.fecha).toLocaleString('es-ES', {
                    dateStyle: 'short',
                    timeStyle: 'short'
                  })}
                </span>
              </p>
            </div>
          </div>

          <div className="text-center sm:text-right bg-gray-900 px-5 py-2.5 rounded-xl border border-gray-800 shrink-0">
            <span className="text-[10px] uppercase font-bold text-gray-400">Total Convocados</span>
            <p className="text-2xl font-black font-athletic text-orange-400">
              {totalConvocados} <span className="text-xs text-gray-400">/ {eligibleJugadores.length}</span>
            </p>
          </div>
        </div>
      </div>

      {/* Lista de Jugadores para Convocar */}
      <div className="bg-white rounded-2xl border border-gray-150 shadow-sm overflow-hidden">
        <div className="p-4 bg-gray-50 border-b border-gray-150 flex items-center justify-between">
          <h3 className="font-bold text-xs uppercase tracking-wider text-gray-700">
            Plantilla disponible ({eligibleJugadores.length} futbolistas)
          </h3>
          <span className="text-xs text-gray-500">
            {canManage ? 'Haz clic para cambiar estado' : 'Modo solo lectura'}
          </span>
        </div>

        <div className="divide-y divide-gray-100">
          {eligibleJugadores.map(jugador => {
            const isConvocado = localConvocados.has(jugador.id);

            return (
              <div
                key={jugador.id}
                onClick={() => toggleLocal(jugador.id)}
                className={`p-3.5 sm:p-4 flex items-center justify-between gap-2 transition-all select-none ${
                  canManage ? 'cursor-pointer' : 'cursor-default'
                } ${
                  isConvocado
                    ? 'bg-orange-50/40 hover:bg-orange-50/70'
                    : 'hover:bg-gray-50'
                }`}
              >
                <div className="flex items-center gap-3 sm:gap-4 min-w-0 flex-1">
                  <span
                    className={`w-9 h-9 shrink-0 rounded-xl flex items-center justify-center font-black font-athletic text-sm transition-colors ${
                      isConvocado
                        ? 'bg-orange-500 text-white shadow-sm shadow-orange-500/30'
                        : 'bg-gray-200 text-gray-700'
                    }`}
                  >
                    #{jugador.dorsal || '-'}
                  </span>

                  <div className="min-w-0">
                    <h4 className="font-bold text-gray-900 text-sm flex items-center gap-2 min-w-0">
                      <span className="truncate">{jugador.nombre}</span>
                      <span className="shrink-0 text-[11px] font-normal text-gray-500 bg-gray-100 px-2 py-0.5 rounded-md">
                        {jugador.posicion}
                      </span>
                      {(() => {
                        const eq = (jugador.equipo || '').toLowerCase();
                        const teamLc = (clubTeamName || selectedPartido?.equipo || '').toLowerCase();
                        if (!eq) {
                          return (
                            <span className="shrink-0 text-[10px] font-bold uppercase tracking-wider text-amber-800 bg-amber-100 border border-amber-300 px-2 py-0.5 rounded-md">
                              Sin equipo
                            </span>
                          );
                        }
                        if (teamLc && eq !== teamLc) {
                          return (
                            <span
                              className="shrink-0 text-[10px] font-bold uppercase tracking-wider text-sky-800 bg-sky-100 border border-sky-300 px-2 py-0.5 rounded-md max-w-[140px] truncate"
                              title={`Refuerzo de ${jugador.equipo}`}
                            >
                              {jugador.equipo}
                            </span>
                          );
                        }
                        return null;
                      })()}
                    </h4>
                    <p className="text-xs text-gray-400 mt-0.5 truncate">
                      {jugador.equipo || 'Sin equipo'} • {jugador.categoria}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3 shrink-0">
                  <span
                    className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 transition-all ${
                      isConvocado
                        ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                        : 'bg-gray-100 text-gray-500 border border-gray-200'
                    }`}
                  >
                    {isConvocado ? (
                      <>
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                        Convocado
                      </>
                    ) : (
                      <>
                        <XCircle className="w-3.5 h-3.5 text-gray-400" />
                        No convocado
                      </>
                    )}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Acciones inferiores: Convocar (aceptar) y Atrás (cancelar) */}
      <div className="flex gap-3 pb-4">
        <button
          onClick={handleCancel}
          className="flex-1 py-3 bg-white hover:bg-gray-50 text-gray-800 border border-gray-200 rounded-xl text-sm font-bold transition-colors flex items-center justify-center gap-2 shadow-sm"
        >
          <ArrowLeft className="w-4 h-4 text-gray-500" />
          Atrás
        </button>
        <button
          onClick={handleAccept}
          disabled={!canManage}
          title={canManage ? 'Guardar convocatoria y volver a la tarjeta' : 'Solo lectura: no tienes permisos para convocar'}
          className="flex-1 py-3 bg-orange-500 hover:bg-orange-600 text-white rounded-xl text-sm font-bold transition-all shadow-md shadow-orange-500/20 flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <ListChecks className="w-4 h-4" />
          Convocar
        </button>
      </div>
    </div>
  );
};
