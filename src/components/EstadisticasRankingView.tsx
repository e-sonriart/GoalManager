import React, { useState, useMemo } from 'react';
import { useClub } from '../context/ClubContext';
import { Estadistica, Partido } from '../types';
import { Modal } from './Modal';
import { TeamShield } from './TeamShield';
import { HighlightIcon } from './MatchHighlights';
import { eventsForPartido, minutoNum } from '../utils/matchHighlights';
import { useRemoteClocks } from '../hooks/useRemoteClocks';
import type { MatchEvent, TipoEvento } from '../utils/matchClock';
import {
  Trophy,
  Medal,
  Award,
  BarChart2,
  TrendingUp,
  Download,
  Edit2,
  Shield,
  Zap,
  Target,
  RefreshCw,
  History
} from 'lucide-react';

const fmtFechaCorta = (fecha: string): string => {
  const d = new Date(fecha);
  if (isNaN(d.getTime())) return fecha || '—';
  return d.toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: '2-digit' });
};

export const EstadisticasRankingView: React.FC = () => {
  const { jugadores, estadisticas, partidos, saveEstadistica, recalcularEstadisticas, exportSheet, getTeamEscudo, can } = useClub();

  const canManage = can('manage:estadisticas');

  const [activeTab, setActiveTab] = useState<'pichichi' | 'asistencias' | 'general'>('pichichi');
  const [editingStat, setEditingStat] = useState<Estadistica | null>(null);

  /** Relojes remotos: eventos (goles/tarjetas) de partidos jugados en otro dispositivo */
  const remoteClocks = useRemoteClocks();

  const handleRecalc = async () => {
    const ok = window.confirm(
      'Recalcular TODAS las estadísticas desde los partidos finalizados con acta/eventos: goles, asistencias, tarjetas, partidos y titulares. Los datos de demostración desaparecerán y solo quedará lo registrado en los partidos. ¿Continuar?'
    );
    if (ok) await recalcularEstadisticas();
  };

  // Estadísticas completas vinculadas a jugadores
  const playerStatsList = useMemo(() => {
    return jugadores.map(jugador => {
      const stat = estadisticas.find(s => s.jugadorId === jugador.id) || {
        id: 'est_' + jugador.id,
        jugadorId: jugador.id,
        goles: 0,
        asistencias: 0,
        tarjetas: 0,
        partidosJugados: 0
      };

      const golesPorPartido = stat.partidosJugados > 0
        ? ((stat.goles / stat.partidosJugados)).toFixed(2)
        : '0.00';

      const contribucionTotal = (Number(stat.goles) || 0) + (Number(stat.asistencias) || 0);

      return {
        ...stat,
        jugador,
        golesPorPartido,
        contribucionTotal
      };
    });
  }, [jugadores, estadisticas]);

  // Rankings
  const rankingGoleadores = useMemo(() => {
    return [...playerStatsList].sort((a, b) => b.goles - a.goles || b.asistencias - a.asistencias);
  }, [playerStatsList]);

  const rankingAsistentes = useMemo(() => {
    return [...playerStatsList].sort((a, b) => b.asistencias - a.asistencias || b.goles - a.goles);
  }, [playerStatsList]);

  const top3Pichichi = rankingGoleadores.slice(0, 3);
  const currentRanking = activeTab === 'asistencias' ? rankingAsistentes : rankingGoleadores;

  /** Apartado activo → qué tipos de acción se desglosan en "¿cuándo ha sido?" */
  const breakdownTipos: TipoEvento[] =
    activeTab === 'pichichi'
      ? ['gol']
      : activeTab === 'asistencias'
        ? ['asistencia']
        : ['gol', 'gol_contra', 'asistencia', 'tarjeta'];

  const breakdownTitle =
    activeTab === 'pichichi'
      ? 'Goles — ¿cuándo han sido?'
      : activeTab === 'asistencias'
        ? 'Asistencias — ¿cuándo han sido?'
        : 'Todas las acciones — ¿cuándo han sido?';

  /** Cada apartado, al pulsarlo, filtra los datos y muestra CUÁNDO han sido (fecha, rival y minuto) */
  const breakdown = useMemo(() => {
    const rows: Array<{ key: string; evento: MatchEvent; partido: Partido }> = [];
    for (const p of partidos) {
      for (const e of eventsForPartido(p, remoteClocks)) {
        if (breakdownTipos.includes(e.tipo)) {
          rows.push({ key: `${p.id}_${e.id}`, evento: e, partido: p });
        }
      }
    }
    const fm = (v: string) => {
      const t = new Date(v).getTime();
      return Number.isFinite(t) ? t : 0;
    };
    rows.sort(
      (a, b) =>
        fm(b.partido.fecha) - fm(a.partido.fecha) ||
        minutoNum(a.evento.minuto) - minutoNum(b.evento.minuto)
    );
    return rows;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [partidos, remoteClocks, activeTab]);

  const handleUpdateStat = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingStat) return;
    await saveEstadistica(editingStat);
    setEditingStat(null);
  };

  const getRankBadge = (index: number) => {
    if (index === 0) {
      return (
        <span className="w-7 h-7 rounded-full bg-gradient-to-br from-amber-300 to-amber-500 text-gray-900 font-bold flex items-center justify-center text-xs shadow-md">
          🥇
        </span>
      );
    }
    if (index === 1) {
      return (
        <span className="w-7 h-7 rounded-full bg-gradient-to-br from-gray-200 to-gray-400 text-gray-900 font-bold flex items-center justify-center text-xs shadow-sm">
          🥈
        </span>
      );
    }
    if (index === 2) {
      return (
        <span className="w-7 h-7 rounded-full bg-gradient-to-br from-amber-600 to-amber-700 text-white font-bold flex items-center justify-center text-xs shadow-sm">
          🥉
        </span>
      );
    }
    return (
      <span className="w-7 h-7 rounded-full bg-gray-100 text-gray-700 font-bold flex items-center justify-center text-xs">
        {index + 1}
      </span>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 font-athletic tracking-tight">
            ESTADÍSTICAS Y <span className="text-orange-600">RANKING</span>
          </h1>
          <p className="text-xs text-gray-500 mt-0.5">
            Líderes de goleo (Pichichi), mejores asistentes y rendimiento individual del club.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {canManage && (
            <button
              onClick={handleRecalc}
              className="px-3.5 py-2 bg-white hover:bg-red-50 text-red-700 border border-red-200 rounded-xl text-xs font-bold transition-colors flex items-center gap-1.5 shadow-sm"
              title="Reconstruye goles, asistencias, tarjetas, partidos y titulares desde los partidos con acta/eventos"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              Recalcular estadísticas
            </button>
          )}
          <button
            onClick={() => exportSheet('estadisticas')}
            className="px-3.5 py-2 bg-white hover:bg-gray-50 text-gray-700 border border-gray-200 rounded-xl text-xs font-bold transition-colors flex items-center gap-1.5 shadow-sm"
          >
            <Download className="w-3.5 h-3.5 text-gray-500" />
            Exportar Estadísticas
          </button>
        </div>
      </div>

      {/* Top 3 Podium */}
      {top3Pichichi.length >= 3 && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Segundo Puesto */}
          <div className="bg-white p-5 rounded-3xl border border-gray-200 shadow-sm flex flex-col justify-between order-2 md:order-1">
            <div className="flex items-center justify-between">
              <span className="text-2xl">🥈 2º Puesto</span>
              <span className="px-2 py-0.5 bg-gray-100 text-gray-700 text-[11px] font-bold rounded-md">
                Plata
              </span>
            </div>
            <div className="my-4 text-center">
              <span className="inline-block w-12 h-12 rounded-2xl bg-gray-100 text-gray-800 font-black font-athletic text-xl leading-[48px]">
                #{top3Pichichi[1]?.jugador.dorsal}
              </span>
              <h3 className="font-bold text-base text-gray-900 mt-2 font-athletic">
                {top3Pichichi[1]?.jugador.nombre}
              </h3>
              <p className="text-xs text-gray-500 flex items-center justify-center gap-1.5 mt-1">
                <TeamShield
                  escudoUrl={getTeamEscudo(top3Pichichi[1]?.jugador.equipo)}
                  teamName={top3Pichichi[1]?.jugador.equipo}
                  size="xs"
                  className="w-3.5 h-3.5"
                />
                <span>{top3Pichichi[1]?.jugador.equipo}</span>
              </p>
            </div>
            <div className="bg-gray-50 p-3 rounded-2xl flex justify-around text-center">
              <div>
                <span className="text-[10px] text-gray-400 font-bold uppercase">Goles</span>
                <p className="text-xl font-bold font-athletic text-orange-600">{top3Pichichi[1]?.goles}</p>
              </div>
              <div className="w-px bg-gray-200" />
              <div>
                <span className="text-[10px] text-gray-400 font-bold uppercase">Asist.</span>
                <p className="text-xl font-bold font-athletic text-gray-800">{top3Pichichi[1]?.asistencias}</p>
              </div>
            </div>
          </div>

          {/* Primer Puesto (Oro - Pichichi) */}
          <div className="bg-gradient-to-b from-gray-950 to-gray-900 text-white p-6 rounded-3xl border border-orange-500/40 shadow-xl flex flex-col justify-between order-1 md:order-2 ring-2 ring-orange-500/30">
            <div className="flex items-center justify-between">
              <span className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-orange-400 bg-orange-500/20 px-3 py-1 rounded-full border border-orange-500/30">
                <Trophy className="w-3.5 h-3.5 text-amber-300" /> Pichichi Oficial
              </span>
              <span className="text-2xl">🥇</span>
            </div>
            <div className="my-4 text-center">
              <span className="inline-block w-14 h-14 rounded-2xl bg-orange-500 text-white font-black font-athletic text-2xl leading-[56px] shadow-lg shadow-orange-500/30">
                #{top3Pichichi[0]?.jugador.dorsal}
              </span>
              <h3 className="font-extrabold text-xl text-white mt-2 font-athletic tracking-wide">
                {top3Pichichi[0]?.jugador.nombre}
              </h3>
              <p className="text-xs text-orange-200 flex items-center justify-center gap-1.5 mt-1">
                <TeamShield
                  escudoUrl={getTeamEscudo(top3Pichichi[0]?.jugador.equipo)}
                  teamName={top3Pichichi[0]?.jugador.equipo}
                  size="xs"
                  className="w-3.5 h-3.5"
                />
                <span>{top3Pichichi[0]?.jugador.equipo}</span>
              </p>
            </div>
            <div className="bg-white/10 backdrop-blur p-3.5 rounded-2xl flex justify-around text-center border border-white/10">
              <div>
                <span className="text-[10px] text-orange-200 font-bold uppercase">Goles</span>
                <p className="text-3xl font-black font-athletic text-orange-400">{top3Pichichi[0]?.goles}</p>
              </div>
              <div className="w-px bg-white/20" />
              <div>
                <span className="text-[10px] text-orange-200 font-bold uppercase">Asist.</span>
                <p className="text-2xl font-bold font-athletic text-white">{top3Pichichi[0]?.asistencias}</p>
              </div>
              <div className="w-px bg-white/20" />
              <div>
                <span className="text-[10px] text-orange-200 font-bold uppercase">Partidos</span>
                <p className="text-2xl font-bold font-athletic text-white">{top3Pichichi[0]?.partidosJugados}</p>
              </div>
            </div>
          </div>

          {/* Tercer Puesto */}
          <div className="bg-white p-5 rounded-3xl border border-gray-200 shadow-sm flex flex-col justify-between order-3">
            <div className="flex items-center justify-between">
              <span className="text-2xl">🥉 3º Puesto</span>
              <span className="px-2 py-0.5 bg-amber-50 text-amber-800 text-[11px] font-bold rounded-md">
                Bronce
              </span>
            </div>
            <div className="my-4 text-center">
              <span className="inline-block w-12 h-12 rounded-2xl bg-amber-100 text-amber-900 font-black font-athletic text-xl leading-[48px]">
                #{top3Pichichi[2]?.jugador.dorsal}
              </span>
              <h3 className="font-bold text-base text-gray-900 mt-2 font-athletic">
                {top3Pichichi[2]?.jugador.nombre}
              </h3>
              <p className="text-xs text-gray-500 flex items-center justify-center gap-1.5 mt-1">
                <TeamShield
                  escudoUrl={getTeamEscudo(top3Pichichi[2]?.jugador.equipo)}
                  teamName={top3Pichichi[2]?.jugador.equipo}
                  size="xs"
                  className="w-3.5 h-3.5"
                />
                <span>{top3Pichichi[2]?.jugador.equipo}</span>
              </p>
            </div>
            <div className="bg-gray-50 p-3 rounded-2xl flex justify-around text-center">
              <div>
                <span className="text-[10px] text-gray-400 font-bold uppercase">Goles</span>
                <p className="text-xl font-bold font-athletic text-orange-600">{top3Pichichi[2]?.goles}</p>
              </div>
              <div className="w-px bg-gray-200" />
              <div>
                <span className="text-[10px] text-gray-400 font-bold uppercase">Asist.</span>
                <p className="text-xl font-bold font-athletic text-gray-800">{top3Pichichi[2]?.asistencias}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tabs Selector */}
      <div className="flex border-b border-gray-200 overflow-x-auto no-scrollbar whitespace-nowrap -mx-3 px-3 sm:mx-0 sm:px-0">
        <button
          onClick={() => setActiveTab('pichichi')}
          className={`px-3 sm:px-4 py-2.5 font-bold text-xs uppercase tracking-wider border-b-2 transition-all flex items-center gap-2 shrink-0 ${
            activeTab === 'pichichi'
              ? 'border-orange-500 text-orange-600'
              : 'border-transparent text-gray-500 hover:text-gray-900'
          }`}
        >
          <Target className="w-4 h-4" />
          Pichichi (Goles)
        </button>
        <button
          onClick={() => setActiveTab('asistencias')}
          className={`px-3 sm:px-4 py-2.5 font-bold text-xs uppercase tracking-wider border-b-2 transition-all flex items-center gap-2 shrink-0 ${
            activeTab === 'asistencias'
              ? 'border-orange-500 text-orange-600'
              : 'border-transparent text-gray-500 hover:text-gray-900'
          }`}
        >
          <Zap className="w-4 h-4" />
          Asistencias
        </button>
        <button
          onClick={() => setActiveTab('general')}
          className={`px-3 sm:px-4 py-2.5 font-bold text-xs uppercase tracking-wider border-b-2 transition-all flex items-center gap-2 shrink-0 ${
            activeTab === 'general'
              ? 'border-orange-500 text-orange-600'
              : 'border-transparent text-gray-500 hover:text-gray-900'
          }`}
        >
          <BarChart2 className="w-4 h-4" />
          Tabla Completa & Edición
        </button>
      </div>

      {/* Desglose: cada apartado filtra y muestra CUÁNDO han sido los datos */}
      <div className="bg-white rounded-2xl border border-gray-150 shadow-sm overflow-hidden">
        <div className="flex items-center justify-between gap-2 px-4 py-2.5 bg-gray-950 border-b border-gray-800">
          <div className="min-w-0">
            <p className="text-[11px] font-black uppercase tracking-wider text-orange-400 flex items-center gap-1.5">
              <History className="w-3.5 h-3.5 shrink-0" />
              {breakdownTitle}
            </p>
            <p className="text-[10px] text-gray-400 mt-0.5">
              {breakdown.length} acción{breakdown.length === 1 ? '' : 'es'} con fecha, rival y minuto
              {breakdown.length > 80 && ' · últimas 80'}
            </p>
          </div>
        </div>
        {breakdown.length === 0 ? (
          <p className="px-4 py-4 text-xs text-gray-400 text-center">
            Sin eventos registrados todavía: se rellenan al confirmar el acta con el reloj del partido.
          </p>
        ) : (
          <ul className="divide-y divide-gray-100 max-h-80 overflow-y-auto">
            {breakdown.slice(0, 80).map(row => (
              <li key={row.key} className="flex items-center gap-3 px-4 py-2.5 min-w-0">
                <span className="w-9 shrink-0 text-right font-black tabular-nums text-orange-600 text-xs">
                  {row.evento.minuto}′
                </span>
                <HighlightIcon event={row.evento} />
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-bold text-gray-900 truncate">{row.evento.texto}</p>
                  <p className="text-[10px] text-gray-500 truncate">
                    {fmtFechaCorta(row.partido.fecha)} · {row.partido.local} vs {row.partido.visitante} · {row.partido.categoria}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Tabla de Ranking (escritorio) */}
      <div className="hidden sm:block bg-white rounded-2xl border border-gray-150 shadow-sm overflow-x-auto scroll-x">
        <table className="w-full text-left text-xs min-w-[640px]">
          <thead className="bg-gray-900 text-white font-athletic uppercase tracking-wider text-[11px]">
            <tr>
              <th className="py-3 px-4 text-center w-14 whitespace-nowrap">Pos.</th>
              <th className="py-3 px-4 whitespace-nowrap">Jugador</th>
              <th className="py-3 px-4 whitespace-nowrap">Equipo</th>
              <th className="py-3 px-4 text-center whitespace-nowrap">Partidos</th>
              <th className="py-3 px-4 text-center whitespace-nowrap">Goles</th>
              <th className="py-3 px-4 text-center whitespace-nowrap">Asistencias</th>
              <th className="py-3 px-4 text-center whitespace-nowrap">G/P</th>
              <th className="py-3 px-4 text-center whitespace-nowrap">Tarjetas</th>
              <th className="py-3 px-4 text-right whitespace-nowrap">Acción</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {currentRanking.map((item, idx) => {
              return (
                <tr key={item.jugadorId} className="hover:bg-orange-50/30 transition-colors">
                  <td className="py-3 px-4 text-center">{getRankBadge(idx)}</td>
                  <td className="py-3 px-4">
                    <div className="font-bold text-gray-900 text-sm">{item.jugador.nombre}</div>
                    <div className="text-[11px] text-gray-400">
                      #{item.jugador.dorsal} • {item.jugador.posicion}
                    </div>
                  </td>
                  <td className="py-3 px-4 text-gray-700 font-medium">
                    <div className="flex items-center gap-2">
                      <div className="w-5 h-5 rounded-md bg-white border border-gray-200 p-0.5 flex items-center justify-center shrink-0">
                        <TeamShield
                          escudoUrl={getTeamEscudo(item.jugador.equipo)}
                          teamName={item.jugador.equipo}
                          size="xs"
                          className="w-full h-full"
                        />
                      </div>
                      <span className="truncate">{item.jugador.equipo}</span>
                    </div>
                  </td>
                  <td className="py-3 px-4 text-center font-semibold text-gray-700">
                    {item.partidosJugados}
                  </td>
                  <td className="py-3 px-4 text-center font-black text-orange-600 font-athletic text-base">
                    {item.goles}
                  </td>
                  <td className="py-3 px-4 text-center font-bold text-blue-600 font-athletic text-base">
                    {item.asistencias}
                  </td>
                  <td className="py-3 px-4 text-center text-gray-500 font-mono">
                    {item.golesPorPartido}
                  </td>
                  <td className="py-3 px-4 text-center">
                    <span className="px-2 py-0.5 bg-amber-100 text-amber-800 rounded font-bold">
                      {item.tarjetas}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-right">
                    <button
                      onClick={() =>
                        setEditingStat({
                          id: item.id,
                          jugadorId: item.jugadorId,
                          goles: item.goles,
                          asistencias: item.asistencias,
                          tarjetas: item.tarjetas,
                          partidosJugados: item.partidosJugados
                        })
                      }
                      className={`p-1.5 text-gray-400 hover:text-orange-600 hover:bg-orange-50 rounded-lg transition-colors ${canManage ? 'inline-flex' : 'hidden'}`}
                      title="Modificar estadísticas"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Ranking en móvil (tarjetas) */}
      <div className="sm:hidden bg-white rounded-2xl border border-gray-150 shadow-sm divide-y divide-gray-100 overflow-hidden">
        {currentRanking.map((item, idx) => (
          <div key={item.jugadorId} className="p-3.5">
            <div className="flex items-start gap-3">
              <div className="shrink-0 pt-0.5">{getRankBadge(idx)}</div>
              <div className="min-w-0 flex-1">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="font-bold text-gray-900 text-sm truncate">{item.jugador.nombre}</p>
                    <p className="text-[11px] text-gray-400 truncate">
                      #{item.jugador.dorsal} • {item.jugador.posicion} • {item.jugador.equipo}
                    </p>
                  </div>
                  <button
                    onClick={() =>
                      setEditingStat({
                        id: item.id,
                        jugadorId: item.jugadorId,
                        goles: item.goles,
                        asistencias: item.asistencias,
                        tarjetas: item.tarjetas,
                        partidosJugados: item.partidosJugados
                      })
                    }
                    className={`w-9 h-9 shrink-0 items-center justify-center text-gray-400 hover:text-orange-600 hover:bg-orange-50 rounded-lg transition-colors ${canManage ? 'inline-flex' : 'hidden'}`}
                    title="Modificar estadísticas"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                </div>
                <div className="mt-2.5 grid grid-cols-5 gap-1 text-center">
                  <div className="rounded-lg bg-gray-50 py-1.5">
                    <p className="text-[9px] font-bold uppercase text-gray-400">PJ</p>
                    <p className="text-sm font-bold text-gray-800">{item.partidosJugados}</p>
                  </div>
                  <div className="rounded-lg bg-orange-50 py-1.5">
                    <p className="text-[9px] font-bold uppercase text-orange-400">Goles</p>
                    <p className="text-sm font-black text-orange-600 font-athletic">{item.goles}</p>
                  </div>
                  <div className="rounded-lg bg-blue-50 py-1.5">
                    <p className="text-[9px] font-bold uppercase text-blue-400">Asist.</p>
                    <p className="text-sm font-bold text-blue-600 font-athletic">{item.asistencias}</p>
                  </div>
                  <div className="rounded-lg bg-gray-50 py-1.5">
                    <p className="text-[9px] font-bold uppercase text-gray-400">G/P</p>
                    <p className="text-sm font-bold text-gray-700 font-mono">{item.golesPorPartido}</p>
                  </div>
                  <div className="rounded-lg bg-amber-50 py-1.5">
                    <p className="text-[9px] font-bold uppercase text-amber-500">Tarj.</p>
                    <p className="text-sm font-bold text-amber-700">{item.tarjetas}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Modal Edición de Estadísticas */}
      <Modal
        isOpen={Boolean(editingStat)}
        onClose={() => setEditingStat(null)}
        title="Modificar Estadísticas"
        subtitle="Actualiza los registros federativos del jugador"
        maxWidth="max-w-md"
      >
        {editingStat && (
          <form onSubmit={handleUpdateStat} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                  Goles
                </label>
                <input
                  type="number"
                  min="0"
                  value={editingStat.goles}
                  onChange={e =>
                    setEditingStat({ ...editingStat, goles: parseInt(e.target.value) || 0 })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-xl text-sm font-athletic font-bold text-orange-600 focus:ring-2 focus:ring-orange-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                  Asistencias
                </label>
                <input
                  type="number"
                  min="0"
                  value={editingStat.asistencias}
                  onChange={e =>
                    setEditingStat({
                      ...editingStat,
                      asistencias: parseInt(e.target.value) || 0
                    })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-xl text-sm font-athletic font-bold text-blue-600 focus:ring-2 focus:ring-orange-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                  Tarjetas
                </label>
                <input
                  type="number"
                  min="0"
                  value={editingStat.tarjetas}
                  onChange={e =>
                    setEditingStat({
                      ...editingStat,
                      tarjetas: parseInt(e.target.value) || 0
                    })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-xl text-sm font-athletic font-bold text-amber-600 focus:ring-2 focus:ring-orange-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                  Partidos Jugados
                </label>
                <input
                  type="number"
                  min="0"
                  value={editingStat.partidosJugados}
                  onChange={e =>
                    setEditingStat({
                      ...editingStat,
                      partidosJugados: parseInt(e.target.value) || 0
                    })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-xl text-sm font-athletic font-bold text-gray-800 focus:ring-2 focus:ring-orange-500 focus:outline-none"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-4 border-t border-gray-150">
              <button
                type="button"
                onClick={() => setEditingStat(null)}
                className="px-4 py-2 border border-gray-200 text-gray-700 rounded-xl text-xs font-semibold hover:bg-gray-50"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="px-5 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-xl text-xs font-bold transition-colors shadow-md shadow-orange-500/20"
              >
                Guardar Cambios
              </button>
            </div>
          </form>
        )}
      </Modal>
    </div>
  );
};
