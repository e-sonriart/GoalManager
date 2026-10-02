import React, { useState, useMemo, useEffect } from 'react';
import { useClub } from '../context/ClubContext';
import { Modal } from './Modal';
import { TeamShield } from './TeamShield';
import { WhatsAppIcon } from './WhatsAppIcon';
import { resolveVisitorShield } from '../utils/shieldPresets';
import { Jugador, Partido } from '../types';
import {
  ClipboardList,
  CheckCircle2,
  XCircle,
  Clock,
  ArrowLeft,
  Users,
  ListChecks,
  Ban,
  UserPlus,
  ChevronDown
} from 'lucide-react';
import { compareTeams, getCategoryOrder } from '../utils/teamOrder';
import { notifyTeam } from '../services/notifications';
import { isPartidoSuspendido } from '../utils/partidoEstado';

/** Mismos discos de color que la alineación (por posición). */
const POS_DISK: Record<string, string> = {
  Portero: 'bg-amber-400 text-amber-950 border-amber-200',
  Defensa: 'bg-emerald-500 text-white border-emerald-300',
  Centrocampista: 'bg-sky-500 text-white border-sky-300',
  Delantero: 'bg-rose-500 text-white border-rose-300'
};

/** Un partido sigue siendo convocable si su fecha es hoy o posterior (los pasados se ocultan). */
const isUpcomingPartido = (p: Partido): boolean => {
  const raw = (p.fecha || '').trim();
  if (!raw) return true;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const datePart = raw.slice(0, 10);
  const t = /^\d{4}-\d{2}-\d{2}$/.test(datePart)
    ? new Date(`${datePart}T00:00:00`).getTime()
    : Date.parse(raw);
  if (Number.isNaN(t)) return true;
  return t >= today.getTime();
};

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
    categorias,
    savePartido,
    getTeamEscudo,
    can
  } = useClub();

  const canManage = can('manage:convocatorias');

  const [selectedPartidoId, setSelectedPartidoId] = useState<string>(
    initialPartidoId || partidos[0]?.id || ''
  );
  // Lista corta: primero solo mi equipo; los refuerzos se muestran tras pulsar "Convocar más"
  const [showRefuerzos, setShowRefuerzos] = useState(false);

  // Selección local: NO se guarda hasta pulsar "Convocar" (aceptar)
  const [localConvocados, setLocalConvocados] = useState<Set<string>>(new Set());

  // Partidos seleccionables: solo los que aún no han pasado (fecha de hoy en adelante),
  // ordenados del más próximo al más lejano. Si no queda ninguno, se muestra la lista completa.
  const selectablePartidos = useMemo(() => {
    const upcoming = partidos.filter(isUpcomingPartido);
    if (upcoming.length === 0) return partidos;
    return [...upcoming].sort((a, b) => {
      const ta = Date.parse(a.fecha || '');
      const tb = Date.parse(b.fecha || '');
      if (Number.isNaN(ta) && Number.isNaN(tb)) return 0;
      if (Number.isNaN(ta)) return 1;
      if (Number.isNaN(tb)) return -1;
      return ta - tb;
    });
  }, [partidos]);

  // Si la selección actual no está disponible (p. ej. enlace a un partido pasado), cambiar al primero
  useEffect(() => {
    if (selectablePartidos.length === 0) return;
    if (!selectablePartidos.some(p => p.id === selectedPartidoId)) {
      setSelectedPartidoId(selectablePartidos[0].id);
    }
  }, [selectablePartidos, selectedPartidoId]);

  const selectedPartido = useMemo(() => {
    return partidos.find(p => p.id === selectedPartidoId) || partidos[0];
  }, [partidos, selectedPartidoId]);

  const selectedId = selectedPartido?.id;
  const suspendidoSelected = isPartidoSuspendido(selectedPartido);

  // Cargar la convocatoria guardada al entrar o cambiar de partido (descarta cambios pendientes)
  useEffect(() => {
    if (selectedId) {
      const stored = partidos.find(p => p.id === selectedId);
      setLocalConvocados(new Set(stored?.convocados || []));
      setShowRefuerzos(false);
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

  // Plantilla elegible: todo mi equipo + refuerzos SOLO de categorías contiguas
  // (inmediatamente superior e inferior a la del partido), agrupados por equipo.
  const { teamPlayers, groupKeys, groups, eligibleJugadores, supName, infName } = useMemo(() => {
    const pool = allJugadores.length > 0 ? allJugadores : jugadores;
    const teamLc = (clubTeamName || selectedPartido?.equipo || '').toLowerCase();
    const matchOrder = getCategoryOrder(selectedPartido?.categoria || '');

    // Órdenes de categoría existentes en el club: la más cercana por encima y por debajo
    let supOrder = Number.POSITIVE_INFINITY;
    let infOrder = Number.NEGATIVE_INFINITY;
    categorias.forEach(c => {
      const o = getCategoryOrder(c.nombre);
      if (o > matchOrder && o < supOrder) supOrder = o;
      if (o < matchOrder && o > infOrder) infOrder = o;
    });
    const supName = categorias.find(c => getCategoryOrder(c.nombre) === supOrder)?.nombre || '';
    const infName = categorias.find(c => getCategoryOrder(c.nombre) === infOrder)?.nombre || '';
    const isContiguous = (cat: string) => {
      const o = getCategoryOrder(cat);
      return o === supOrder || o === infOrder;
    };

    const byNameAsc = (a: (typeof pool)[number], b: (typeof pool)[number]) =>
      a.nombre.localeCompare(b.nombre, 'es');

    const mine = pool
      .filter(j => teamLc && (j.equipo || '').toLowerCase() === teamLc)
      .sort(byNameAsc);

    const mineIds = new Set(mine.map(j => j.id));
    const others = pool.filter(j => !mineIds.has(j.id) && isContiguous(j.categoria));

    const groups = new Map<string, typeof pool>();
    others.forEach(j => {
      const key = j.equipo || 'Sin equipo';
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key)!.push(j);
    });
    const groupKeys = Array.from(groups.keys()).sort((a, b) => {
      if (a === 'Sin equipo') return 1;
      if (b === 'Sin equipo') return -1;
      return compareTeams(a, b, equipos);
    });
    groupKeys.forEach(k => groups.get(k)!.sort(byNameAsc));

    const eligible = [...mine, ...groupKeys.flatMap(k => groups.get(k)!)];
    return { teamPlayers: mine, groupKeys, groups, eligibleJugadores: eligible, supName, infName };
  }, [allJugadores, jugadores, selectedPartido, clubTeamName, categorias, equipos]);

  const totalConvocados = useMemo(() => {
    const pool = allJugadores.length > 0 ? allJugadores : jugadores;
    const poolIds = new Set(pool.map(j => j.id));
    let count = 0;
    localConvocados.forEach(id => {
      if (poolIds.has(id)) count++;
    });
    return count;
  }, [allJugadores, jugadores, localConvocados]);

  const refuerzosCount = eligibleJugadores.length - teamPlayers.length;
  const refuerzosConvocados = useMemo(() => {
    const ids = new Set(teamPlayers.map(j => j.id));
    let n = 0;
    eligibleJugadores.forEach(j => {
      if (!ids.has(j.id) && localConvocados.has(j.id)) n++;
    });
    return n;
  }, [eligibleJugadores, teamPlayers, localConvocados]);

  const toggleLocal = (jugadorId: string) => {
    if (!canManage) return;
    setLocalConvocados(prev => {
      const next = new Set(prev);
      if (next.has(jugadorId)) next.delete(jugadorId);
      else next.add(jugadorId);
      return next;
    });
  };

  const handleSelectMyTeam = () => {
    if (!canManage) return;
    setLocalConvocados(prev => {
      const next = new Set(prev);
      teamPlayers.forEach(j => next.add(j.id));
      return next;
    });
  };

  const handleClear = () => {
    if (!canManage) return;
    setLocalConvocados(new Set());
  };

  // ACEPTAR: guarda la selección (el partido jugado se contabiliza al confirmar el acta)
  const handleAccept = async () => {
    if (!selectedPartido || !canManage) return;
    const next: string[] = Array.from(localConvocados).filter((id): id is string => typeof id === 'string');
    await savePartido({
      ...selectedPartido,
      convocados: next
    });
    // Aviso push a los convocados (+ staff del equipo); el ref cambia si cambia la lista
    if (next.length > 0) {
      const f = new Date(selectedPartido.fecha);
      const fechaTxt = Number.isNaN(f.getTime())
        ? selectedPartido.fecha
        : f.toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' });
      void notifyTeam({
        tipo: 'convocatoria',
        equipo: selectedPartido.equipo,
        refId: `${selectedPartido.id}_${[...next].sort().join('.')}`,
        jugadorIds: next,
        titulo: `📋 Convocatoria: ${selectedPartido.local} vs ${selectedPartido.visitante}`,
        cuerpo: `📅 ${fechaTxt}${
          selectedPartido.horaConvocatoria ? ` · recogida ${selectedPartido.horaConvocatoria}` : ''
        }${selectedPartido.campo ? ` · ${selectedPartido.campo}` : ''}`
      });
    }
    onBack?.(selectedPartido.id);
  };

  // CANCELAR: descarta cambios y vuelve a la tarjeta del partido
  const handleCancel = () => {
    if (selectedPartido) {
      setLocalConvocados(new Set(selectedPartido.convocados || []));
    }
    onBack?.(selectedPartido.id);
  };

  // Marcar / desmarcar el partido como suspendido (antes de montar la alineación)
  const handleToggleSuspendido = async () => {
    if (!selectedPartido || !canManage) return;
    const next = !isPartidoSuspendido(selectedPartido);
    await savePartido({ ...selectedPartido, suspendido: next });
    if (next) {
      const f = new Date(selectedPartido.fecha);
      const fechaTxt = Number.isNaN(f.getTime())
        ? selectedPartido.fecha
        : f.toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' });
      void notifyTeam({
        tipo: 'partido_suspendido',
        equipo: selectedPartido.equipo,
        refId: `susp_${selectedPartido.id}`,
        titulo: `⛔ Partido suspendido: ${selectedPartido.local} vs ${selectedPartido.visitante}`,
        cuerpo: `📅 ${fechaTxt}${selectedPartido.campo ? ` · ${selectedPartido.campo}` : ''} · El equipo será avisado si se reprograma`,
        url: '/?tab=partidos'
      });
    }
  };

  // Mensaje autogenerado de la convocatoria para enviarlo por WhatsApp
  const handleSendWhatsApp = () => {
    if (!selectedPartido) return;
    const f = new Date(selectedPartido.fecha);
    const valid = !Number.isNaN(f.getTime());
    const diaTxt = valid
      ? f.toLocaleDateString('es-ES', {
          weekday: 'long',
          day: 'numeric',
          month: 'long',
          year: 'numeric'
        })
      : selectedPartido.fecha;
    const horaDeFecha =
      valid && (f.getHours() !== 0 || f.getMinutes() !== 0)
        ? f.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })
        : '';
    const horaTxt = selectedPartido.hora || horaDeFecha;
    const appUrl = `${window.location.origin}/?tab=convocatorias&partido=${selectedPartido.id}`;

    const lineas = [
      '⚽ *CONVOCATORIA OFICIAL*',
      `🏟️ ${selectedPartido.local} vs ${selectedPartido.visitante}`,
      `🏆 Categoría: ${selectedPartido.categoria}${
        selectedPartido.jornada ? ` · Jornada ${selectedPartido.jornada}` : ''
      }`,
      `📅 Día: ${diaTxt}`,
      ...(horaTxt ? [`🕓 Horario: ${horaTxt}`] : []),
      ...(selectedPartido.horaConvocatoria ? [`🕐 Convocados: ${selectedPartido.horaConvocatoria}`] : []),
      ...(selectedPartido.campo ? [`📍 Lugar: ${selectedPartido.campo}`] : []),
      '',
      '👇 Entra a la app para ver la convocatoria y confirmar tu asistencia:',
      appUrl
    ];

    window.open(`https://wa.me/?text=${encodeURIComponent(lineas.join('\n'))}`, '_blank', 'noopener,noreferrer');
  };

  const renderRow = (jugador: Jugador) => {
    const isConvocado = localConvocados.has(jugador.id);
    const diskCls = POS_DISK[jugador.posicion] || 'bg-gray-200 text-gray-700 border-gray-200';

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
            className={`w-9 h-9 shrink-0 rounded-xl flex items-center justify-center font-black font-athletic text-sm border transition-all ${diskCls} ${
              isConvocado ? 'ring-2 ring-orange-500 ring-offset-1 shadow-sm shadow-orange-500/40' : ''
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
            onClick={handleToggleSuspendido}
            disabled={!canManage}
            title={canManage ? 'Marca el partido como suspendido (avisa al equipo)' : 'Solo lectura'}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all shadow-sm flex items-center gap-1.5 border disabled:opacity-40 disabled:cursor-not-allowed ${
              suspendidoSelected
                ? 'bg-red-600 hover:bg-red-700 text-white border-red-700'
                : 'bg-white hover:bg-red-50 text-red-600 border-red-200'
            }`}
          >
            <Ban className="w-4 h-4" />
            {suspendidoSelected ? 'Suspendido ✓' : 'Partido Suspendido'}
          </button>
        </div>
      </div>

      {/* Selector de Partido Activo */}
      <div className="bg-white p-5 rounded-2xl border border-gray-150 shadow-sm space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex-1">
            <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
              Seleccionar Partido a Convocar{' '}
              <span className="text-gray-400 normal-case font-medium">(solo fechas de hoy en adelante)</span>:
            </label>
            <select
              value={selectedPartidoId}
              onChange={e => setSelectedPartidoId(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm font-semibold text-gray-900 focus:ring-2 focus:ring-orange-500 focus:outline-none"
            >
              {selectablePartidos.map(p => (
                <option key={p.id} value={p.id}>
                  {p.local} vs {p.visitante} — {p.categoria} ({new Date(p.fecha).toLocaleDateString('es-ES')})
                </option>
              ))}
            </select>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={handleSelectMyTeam}
              disabled={!canManage}
              title={canManage ? 'Convoca a todos los jugadores de tu equipo (no de todo el club)' : 'Solo lectura'}
              className="px-3 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 rounded-xl text-xs font-bold transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1.5"
            >
              <Users className="w-3.5 h-3.5" />
              Convocar todo mi equipo
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
              <div className="flex items-center gap-2 min-w-0">
                <h3 className="font-bold text-sm sm:text-base font-athletic tracking-wide truncate">
                  {selectedPartido.local} <span className="text-orange-400">vs</span> {selectedPartido.visitante}
                </h3>
                {suspendidoSelected && (
                  <span className="px-2 py-0.5 rounded-full bg-red-600 text-white text-[10px] font-black uppercase tracking-wider shrink-0 flex items-center gap-1">
                    <Ban className="w-3 h-3" /> Suspendido
                  </span>
                )}
              </div>
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

      {/* Lista de Jugadores para Convocar (agrupada) */}
      <div className="bg-white rounded-2xl border border-gray-150 shadow-sm overflow-hidden">
        <div className="p-4 bg-gray-50 border-b border-gray-150">
          <div className="flex items-center justify-between gap-2">
            <h3 className="font-bold text-xs uppercase tracking-wider text-gray-700">
              Plantilla disponible ({eligibleJugadores.length}: {teamPlayers.length} de mi equipo +{' '}
              {eligibleJugadores.length - teamPlayers.length} refuerzos)
            </h3>
            <span className="text-xs text-gray-500">
              {canManage ? 'Haz clic para cambiar estado' : 'Modo solo lectura'}
            </span>
          </div>
          <p className="text-[11px] text-gray-500 mt-1">
            Refuerzos de otras categorías: solo <strong className="text-gray-700">{supName || '—'}</strong>{' '}
            (superior) e <strong className="text-gray-700">{infName || '—'}</strong> (inferior).
          </p>
        </div>

        <div className="divide-y divide-gray-100">
          {/* Cabecera: MI EQUIPO */}
          {teamPlayers.length > 0 && (
            <div className="px-4 py-2.5 bg-gray-900 flex items-center gap-2.5">
              <div className="w-6 h-6 rounded-md bg-white/10 border border-white/20 p-0.5 flex items-center justify-center overflow-hidden shrink-0">
                <TeamShield
                  escudoUrl={getTeamEscudo(clubTeamName)}
                  teamName={clubTeamName}
                  size="xs"
                  className="w-full h-full"
                />
              </div>
              <span className="text-xs font-bold font-athletic uppercase tracking-wider text-white truncate">
                Mi equipo — {clubTeamName}
              </span>
              <span className="px-1.5 py-0.5 bg-orange-500 text-white rounded text-[9px] font-black shrink-0">
                MI EQUIPO
              </span>
              <span className="ml-auto px-2 py-0.5 bg-white/10 border border-white/20 rounded-full text-[10px] font-bold text-gray-300 shrink-0">
                {teamPlayers.length}
              </span>
            </div>
          )}
          {teamPlayers.map(renderRow)}

          {/* Acción: mostrar los refuerzos de otras categorías (lista corta por defecto) */}
          {refuerzosCount > 0 && !showRefuerzos && (
            <div className="p-3 bg-gray-50">
              <button
                type="button"
                onClick={() => setShowRefuerzos(true)}
                className="w-full py-2.5 px-3 bg-white hover:bg-sky-50 text-sky-700 border border-sky-200 rounded-xl text-xs font-bold transition-colors flex items-center justify-center gap-1.5 shadow-sm"
              >
                <UserPlus className="w-4 h-4" />
                Convocar más ({refuerzosCount} refuerzos)
                {refuerzosConvocados > 0 && (
                  <span className="ml-1 px-1.5 py-0.5 bg-sky-600 text-white rounded text-[9px] font-black">
                    {refuerzosConvocados} ya citado{refuerzosConvocados === 1 ? '' : 's'}
                  </span>
                )}
              </button>
            </div>
          )}

          {/* Refuerzos: resto de jugadores agrupados por equipo (solo categorías contiguas) */}
          {showRefuerzos && groupKeys.map(key => {
            const isFree = key === 'Sin equipo';
            const team = equipos.find(e => e.nombre === key);
            const lista = groups.get(key)!;
            return (
              <React.Fragment key={key}>
                <div className="px-4 py-2.5 bg-gray-900 flex items-center gap-2.5">
                  <div className="w-6 h-6 rounded-md bg-white/10 border border-white/20 p-0.5 flex items-center justify-center overflow-hidden shrink-0">
                    {isFree ? (
                      <Users className="w-3.5 h-3.5 text-amber-400" />
                    ) : (
                      <TeamShield escudoUrl={team?.escudo} teamName={key} size="xs" className="w-full h-full" />
                    )}
                  </div>
                  <span className="text-xs font-bold font-athletic uppercase tracking-wider text-white truncate">
                    {key}
                  </span>
                  <span className="text-[10px] text-gray-400 shrink-0 hidden sm:inline">
                    {isFree ? 'Libre / cedido' : team?.categoria || ''}
                  </span>
                  <span className="ml-auto px-2 py-0.5 bg-sky-500/20 text-sky-300 border border-sky-400/40 rounded-full text-[10px] font-bold shrink-0">
                    Refuerzo · {lista.length}
                  </span>
                </div>
                {lista.map(renderRow)}
              </React.Fragment>
            );
          })}

          {/* Colapsar de nuevo para acortar la lista */}
          {refuerzosCount > 0 && showRefuerzos && (
            <div className="p-3 bg-gray-50">
              <button
                type="button"
                onClick={() => setShowRefuerzos(false)}
                className="w-full py-2.5 px-3 bg-white hover:bg-gray-100 text-gray-600 border border-gray-200 rounded-xl text-xs font-bold transition-colors flex items-center justify-center gap-1.5 shadow-sm"
              >
                <ChevronDown className="w-4 h-4" />
                Mostrar solo mi equipo
              </button>
            </div>
          )}

          {eligibleJugadores.length === 0 && (
            <div className="p-6 text-center text-sm text-gray-400">
              No hay jugadores elegibles para este partido.
            </div>
          )}
        </div>
      </div>

      {/* Acciones inferiores: Convocar (aceptar), Atrás y envío por WhatsApp */}
      <div className="space-y-3 pb-4">
        <div className="flex gap-3">
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
        {canManage && (
          <button
            onClick={handleSendWhatsApp}
            title="Abre WhatsApp con el mensaje de la convocatoria ya escrito (día, horario, lugar y enlace a la app)"
            className="w-full py-3.5 bg-[#25D366] hover:bg-[#1EBE5A] text-white rounded-xl text-sm font-black tracking-wide transition-all shadow-lg shadow-[#25D366]/30 active:scale-[0.99] flex items-center justify-center gap-2"
          >
            <WhatsAppIcon className="w-5 h-5" />
            Enviar convocatoria por WhatsApp
          </button>
        )}
      </div>
    </div>
  );
};
