import React, { useState, useMemo, useEffect } from 'react';
import { useClub } from '../context/ClubContext';
import { TeamShield } from './TeamShield';
import { resolveVisitorShield } from '../utils/shieldPresets';
import { titularesStatsDeltas } from '../utils/playerStatsFromEvents';
import {
  ArrowLeft,
  Play,
  Clock,
  ClipboardList,
  GripVertical,
  LayoutGrid
} from 'lucide-react';

interface AlineacionViewProps {
  initialPartidoId?: string;
  onBack?: () => void;
  onStartMatch?: (partidoId: string) => void;
}

type Role = 'POR' | 'DEF' | 'MED' | 'DEL';

interface PitchSlot {
  id: string;
  x: number; // % desde la izquierda
  y: number; // % desde arriba (0 = portería rival)
  role: Role;
}

const FORMACIONES_F11 = [
  '1-4-3-3',
  '1-4-4-2',
  '1-3-5-2',
  '1-5-3-2',
  '1-4-2-3-1',
  '1-3-4-3',
  '1-4-1-4-1'
] as const;

const FORMACIONES_F8 = [
  '1-2-3-2',
  '1-3-3-1',
  '1-2-2-3',
  '1-3-2-2',
  '1-4-2-1',
  '1-1-4-2'
] as const;

const ROLE_META: Record<Role, { label: string; disk: string; text: string; border: string }> = {
  POR: {
    label: 'Portero',
    disk: 'bg-amber-400',
    text: 'text-amber-950',
    border: 'border-amber-200'
  },
  DEF: {
    label: 'Defensa',
    disk: 'bg-emerald-500',
    text: 'text-white',
    border: 'border-emerald-300'
  },
  MED: {
    label: 'Medio',
    disk: 'bg-sky-500',
    text: 'text-white',
    border: 'border-sky-300'
  },
  DEL: {
    label: 'Delantero',
    disk: 'bg-rose-500',
    text: 'text-white',
    border: 'border-rose-300'
  }
};

/** Huecos generados a partir de una formación tipo '1-4-3-3' (portería abajo = índice 0). */
function buildSlots(formacion: string): PitchSlot[] {
  const nums = formacion.split('-').map(n => Math.max(1, parseInt(n, 10) || 1));
  const outfield = nums.slice(1); // sin portero
  const nLines = outfield.length;
  const slots: PitchSlot[] = [];

  // Portero (parte baja del campo)
  slots.push({ id: 'gk', x: 50, y: 90, role: 'POR' });

  // Líneas de campo: de defensa (abajo) a ataque (arriba)
  const yTop = 22;
  const yBottom = 74;
  const roleForLine = (idx: number): Role => {
    if (idx === 0) return 'DEF';
    if (idx === nLines - 1) return 'DEL';
    return 'MED';
  };

  outfield.forEach((count, lineIdx) => {
    const t = nLines === 1 ? 0.5 : lineIdx / (nLines - 1);
    // línea 0 (más abajo) → yBottom; última → yTop
    const y = yBottom - t * (yBottom - yTop);
    const role = roleForLine(lineIdx);
    const margin = 14;
    const span = 100 - margin * 2;
    for (let i = 0; i < count; i++) {
      const x = count === 1 ? 50 : margin + (span * i) / (count - 1);
      const suffix = count === 1 ? 'c' : String(i + 1);
      slots.push({ id: `L${lineIdx}_${suffix}`, x, y, role });
    }
  });

  return slots;
}

export const AlineacionView: React.FC<AlineacionViewProps> = ({
  initialPartidoId,
  onBack,
  onStartMatch
}) => {
  const {
    partidos,
    jugadores,
    equipos,
    categorias,
    savePartido,
    applyEventStats,
    getTeamEscudo,
    can
  } = useClub();

  const canManage = can('manage:partidos') || can('manage:convocatorias');

  const [selectedPartidoId, setSelectedPartidoId] = useState<string>(
    initialPartidoId || partidos[0]?.id || ''
  );
  const [formacion, setFormacion] = useState<string>('1-4-3-3');
  const [placement, setPlacement] = useState<Record<string, string>>({});
  const [selectedSlotId, setSelectedSlotId] = useState<string | null>(null);
  const [selectedJugadorId, setSelectedJugadorId] = useState<string | null>(null);

  const selectedPartido = useMemo(
    () => partidos.find(p => p.id === selectedPartidoId) || partidos[0],
    [partidos, selectedPartidoId]
  );
  const selectedId = selectedPartido?.id;

  const tipoFutbol = useMemo(() => {
    if (!selectedPartido) return 'F11' as const;
    const cat = categorias.find(c => c.nombre === selectedPartido.categoria);
    return cat?.tipo === 'F8' ? ('F8' as const) : ('F11' as const);
  }, [selectedPartido, categorias]);

  const formaciones = tipoFutbol === 'F8' ? FORMACIONES_F8 : FORMACIONES_F11;
  const slots = useMemo(() => buildSlots(formacion), [formacion]);
  const required = slots.length;

  const clubTeamName = useMemo(() => {
    if (!selectedPartido) return '';
    return selectedPartido.equipo || (
      equipos.some(e => e.nombre === selectedPartido.local)
        ? selectedPartido.local
        : selectedPartido.visitante
    );
  }, [selectedPartido, equipos]);

  const pool = useMemo(() => {
    if (!selectedPartido) return jugadores;
    const conv = selectedPartido.convocados || [];
    if (conv.length > 0) {
      const fromConv = jugadores.filter(j => conv.includes(j.id));
      if (fromConv.length > 0) return fromConv;
    }
    const matchByTeam = jugadores.filter(
      j =>
        j.equipo.toLowerCase() === selectedPartido.equipo.toLowerCase() ||
        j.categoria.toLowerCase() === selectedPartido.categoria.toLowerCase()
    );
    return matchByTeam.length > 0 ? matchByTeam : jugadores;
  }, [jugadores, selectedPartido]);

  const jugadorById = useMemo(() => new Map(jugadores.map(j => [j.id, j])), [jugadores]);
  const usedJugadorIds = useMemo(() => new Set(Object.values(placement)), [placement]);
  const filledCount = slots.filter(s => placement[s.id]).length;
  const isComplete = filledCount === required;

  // Cargar partido + formación + titulares
  useEffect(() => {
    if (!selectedId) return;
    const stored = partidos.find(p => p.id === selectedId);
    const savedForm = stored?.formacion || (tipoFutbol === 'F8' ? '1-2-3-2' : '1-4-3-3');
    setFormacion(savedForm);
    const nextSlots = buildSlots(savedForm);
    const titulares = stored?.titulares || [];
    const next: Record<string, string> = {};
    nextSlots.forEach((slot, i) => {
      if (titulares[i]) next[slot.id] = titulares[i];
    });
    setPlacement(next);
    setSelectedSlotId(null);
    setSelectedJugadorId(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedId]);

  // Al cambiar de formación (F8/F11 o selector): reasignar jugadores en el nuevo orden
  useEffect(() => {
    setPlacement(prev => {
      const players: string[] = Object.values(prev).filter((id): id is string => typeof id === 'string' && id.length > 0);
      if (players.length === 0) return prev;
      const nextSlots = buildSlots(formacion);
      const next: Record<string, string> = {};
      nextSlots.forEach((slot, i) => {
        const pid = players[i];
        if (pid) next[slot.id] = pid;
      });
      return next;
    });
    setSelectedSlotId(null);
  }, [formacion]);

  const serializeTitulares = (map: Record<string, string>): string[] =>
    slots.map(s => map[s.id]).filter((id): id is string => Boolean(id));

  const placeJugador = (slotId: string, jugadorId: string) => {
    if (!canManage) return;
    setPlacement(prev => {
      const next = { ...prev };
      Object.keys(next).forEach(k => {
        if (next[k] === jugadorId) delete next[k];
      });
      next[slotId] = jugadorId;
      return next;
    });
    setSelectedSlotId(null);
    setSelectedJugadorId(null);
  };

  const removeFromSlot = (slotId: string) => {
    if (!canManage) return;
    setPlacement(prev => {
      const next = { ...prev };
      delete next[slotId];
      return next;
    });
  };

  const handleSlotClick = (slot: PitchSlot) => {
    if (!canManage) return;
    const current = placement[slot.id];
    if (selectedJugadorId) {
      placeJugador(slot.id, selectedJugadorId);
      return;
    }
    if (current) {
      removeFromSlot(slot.id);
      return;
    }
    setSelectedSlotId(prev => (prev === slot.id ? null : slot.id));
  };

  const handlePoolClick = (jugadorId: string) => {
    if (!canManage) return;
    // Hueco seleccionado → colocar/mover aquí (cualquier posición, ej. portero de delantero)
    if (selectedSlotId) {
      placeJugador(selectedSlotId, jugadorId);
      return;
    }
    if (usedJugadorIds.has(jugadorId)) {
      // Sin hueco: sacarlo al banquillo
      setPlacement(prev => {
        const next = { ...prev };
        Object.keys(next).forEach(k => {
          if (next[k] === jugadorId) delete next[k];
        });
        return next;
      });
      setSelectedJugadorId(null);
      return;
    }
    const j = jugadorById.get(jugadorId);
    const preferred: Role =
      j?.posicion === 'Portero' ? 'POR'
        : j?.posicion === 'Defensa' ? 'DEF'
          : j?.posicion === 'Centrocampista' ? 'MED'
            : 'DEL';
    const empty = slots.filter(s => !placement[s.id]);
    const target = empty.find(s => s.role === preferred) || empty[0];
    if (target) placeJugador(target.id, jugadorId);
  };

  const persistLineup = async (partido: typeof selectedPartido, nextTitulares: string[]) => {
    if (!partido) return;
    const prev = partido.titulares || [];
    await savePartido({
      ...partido,
      formacion,
      titulares: nextTitulares
    });
    const deltas = titularesStatsDeltas(prev, nextTitulares, partido.convocados || []);
    if (deltas.length) await applyEventStats(deltas, 1);
  };

  const handleStart = async () => {
    if (!selectedPartido || !isComplete || !canManage) return;
    await persistLineup(selectedPartido, serializeTitulares(placement));
    onStartMatch?.(selectedPartido.id);
  };

  const handleBack = async () => {
    if (selectedPartido && canManage) {
      await persistLineup(selectedPartido, serializeTitulares(placement));
    }
    onBack?.();
  };

  if (!selectedPartido) {
    return (
      <div className="bg-white p-8 rounded-2xl border text-center text-gray-400">
        <ClipboardList className="w-8 h-8 mx-auto mb-2 text-gray-300" />
        <p className="font-semibold text-sm">No hay partidos para montar la alineación.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900 font-athletic tracking-tight">
            ALINEACIÓN <span className="text-orange-600">TITULAR</span>
          </h1>
          <p className="text-xs text-gray-500 mt-0.5">
            Elige táctica, coloca {required} titulares y pulsa Play.
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <span className="px-2.5 py-1 rounded-full text-[10px] font-black bg-gray-900 text-orange-400 font-athletic">
            {tipoFutbol}
          </span>
          <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold border ${
            isComplete
              ? 'bg-emerald-50 text-emerald-700 border-emerald-300'
              : 'bg-amber-50 text-amber-700 border-amber-300'
          }`}>
            {filledCount}/{required}
          </span>
        </div>
      </div>

      {/* Selector partido + formación */}
      <div className="bg-white p-4 rounded-2xl border border-gray-150 shadow-sm space-y-3">
        <select
          value={selectedPartidoId}
          onChange={e => setSelectedPartidoId(e.target.value)}
          className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm font-semibold text-gray-900 focus:ring-2 focus:ring-orange-500 focus:outline-none"
        >
          {partidos.map(p => (
            <option key={p.id} value={p.id}>
              {p.local} vs {p.visitante} — {p.categoria}
            </option>
          ))}
        </select>

        {/* Tácticas */}
        <div>
          <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1.5 flex items-center gap-1">
            <LayoutGrid className="w-3 h-3 text-orange-500" />
            Táctica / Formación
          </label>
          <div className="flex flex-wrap gap-1.5">
            {formaciones.map(f => {
              const active = formacion === f;
              return (
                <button
                  key={f}
                  type="button"
                  onClick={() => canManage && setFormacion(f)}
                  disabled={!canManage}
                  className={`px-3 py-1.5 rounded-lg text-xs font-black font-athletic tracking-wide border transition-all disabled:opacity-40 ${
                    active
                      ? 'bg-orange-500 border-orange-500 text-white shadow-md shadow-orange-500/30'
                      : 'bg-gray-50 border-gray-200 text-gray-700 hover:border-orange-300 hover:bg-orange-50'
                  }`}
                  title={`Formación ${f}`}
                >
                  {f}
                </button>
              );
            })}
          </div>
        </div>

        <div className="flex items-center justify-between gap-3 bg-gray-950 text-white p-3 rounded-xl border border-gray-800">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-9 h-9 rounded-lg bg-white/10 p-1 flex items-center justify-center border border-white/20 overflow-hidden shrink-0">
              <TeamShield
                escudoUrl={selectedPartido.local === clubTeamName ? getTeamEscudo(selectedPartido.local) : resolveVisitorShield(selectedPartido)}
                teamName={selectedPartido.local}
                size="xs"
                className="w-full h-full"
              />
            </div>
            <div className="min-w-0">
              <p className="text-xs font-bold font-athletic truncate">
                {selectedPartido.local} <span className="text-orange-400">vs</span> {selectedPartido.visitante}
              </p>
              <p className="text-[10px] text-gray-400 flex items-center gap-1">
                <Clock className="w-3 h-3 text-orange-400" />
                {new Date(selectedPartido.fecha).toLocaleString('es-ES', {
                  dateStyle: 'short',
                  timeStyle: 'short'
                })}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <span className="px-2 py-0.5 rounded bg-orange-500/20 border border-orange-500/40 text-orange-300 text-[10px] font-black">
              {formacion}
            </span>
            <div className="w-9 h-9 rounded-lg bg-white/10 p-1 flex items-center justify-center border border-white/20 overflow-hidden">
              <TeamShield
                escudoUrl={selectedPartido.visitante === clubTeamName ? getTeamEscudo(selectedPartido.visitante) : resolveVisitorShield(selectedPartido)}
                teamName={selectedPartido.visitante}
                size="xs"
                className="w-full h-full"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Campo vertical mejorado */}
      <div className="bg-white p-3 rounded-2xl border border-gray-150 shadow-sm space-y-2">
        <div className="flex items-center justify-between px-0.5">
          <span className="text-[10px] font-bold uppercase tracking-wider text-gray-500">
            ↑ Portería rival
          </span>
          <span className="text-[10px] font-bold uppercase tracking-wider text-orange-600">
            {formacion} · {filledCount}/{required}
          </span>
        </div>

        <div
          className="relative w-full mx-auto rounded-lg overflow-hidden select-none shadow-inner"
          style={{
            aspectRatio: '2 / 3',
            maxWidth: '430px',
            background:
              'repeating-linear-gradient(180deg, #16a34a 0px, #16a34a 36px, #15803d 36px, #15803d 72px)'
          }}
        >
          {/* Césped exterior */}
          <div className="absolute inset-[3%] border-2 border-white/70 rounded-sm pointer-events-none" />

          {/* Línea de medio campo */}
          <div className="absolute left-[3%] right-[3%] top-1/2 border-t-2 border-white/70 pointer-events-none" />

          {/* Círculo central */}
          <div
            className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white/70 pointer-events-none"
            style={{ width: '28%', aspectRatio: '1' }}
          />
          <div
            className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-1.5 h-1.5 rounded-full bg-white/80 pointer-events-none"
          />

          {/* Área grande superior (rival) */}
          <div className="absolute left-[22%] right-[22%] top-[3%] h-[16%] border-2 border-t-0 border-white/70 pointer-events-none" />
          {/* Área pequeña superior */}
          <div className="absolute left-[36%] right-[36%] top-[3%] h-[7%] border-2 border-t-0 border-white/70 pointer-events-none" />
          {/* Área grande inferior (club) */}
          <div className="absolute left-[22%] right-[22%] bottom-[3%] h-[16%] border-2 border-b-0 border-white/70 pointer-events-none" />
          {/* Área pequeña inferior */}
          <div className="absolute left-[36%] right-[36%] bottom-[3%] h-[7%] border-2 border-b-0 border-white/70 pointer-events-none" />

          {/* Penaltis */}
          <div className="absolute left-1/2 -translate-x-1/2 top-[16%] w-1.5 h-1.5 rounded-full bg-white/80 pointer-events-none" />
          <div className="absolute left-1/2 -translate-x-1/2 bottom-[16%] w-1.5 h-1.5 rounded-full bg-white/80 pointer-events-none" />

          {/* Porterías con red */}
          <div
            className="absolute left-1/2 -translate-x-1/2 top-0 w-[32%] h-[2.5%] border-2 border-white/90 border-t-0 rounded-b-sm pointer-events-none"
            style={{
              background:
                'repeating-linear-gradient(90deg, rgba(255,255,255,0.35) 0 2px, transparent 2px 5px), repeating-linear-gradient(0deg, rgba(255,255,255,0.35) 0 2px, transparent 2px 4px), rgba(0,0,0,0.15)'
            }}
          />
          <div
            className="absolute left-1/2 -translate-x-1/2 bottom-0 w-[32%] h-[2.5%] border-2 border-white/90 border-b-0 rounded-t-sm pointer-events-none"
            style={{
              background:
                'repeating-linear-gradient(90deg, rgba(255,255,255,0.35) 0 2px, transparent 2px 5px), repeating-linear-gradient(0deg, rgba(255,255,255,0.35) 0 2px, transparent 2px 4px), rgba(0,0,0,0.15)'
            }}
          />

          {/* Esquinas */}
          {[0, 1, 2, 3].map(i => {
            const isTop = i < 2;
            const isLeft = i % 2 === 0;
            return (
              <div
                key={i}
                className="absolute w-3 h-3 border-white/70 pointer-events-none"
                style={{
                  top: isTop ? '3%' : undefined,
                  bottom: !isTop ? '3%' : undefined,
                  left: isLeft ? '3%' : undefined,
                  right: !isLeft ? '3%' : undefined,
                  borderTop: isTop ? '2px solid rgba(255,255,255,0.7)' : undefined,
                  borderBottom: !isTop ? '2px solid rgba(255,255,255,0.7)' : undefined,
                  borderLeft: isLeft ? '2px solid rgba(255,255,255,0.7)' : undefined,
                  borderRight: !isLeft ? '2px solid rgba(255,255,255,0.7)' : undefined,
                  borderRadius: isTop
                    ? isLeft ? '0 0 8px 0' : '0 0 0 8px'
                    : isLeft ? '0 8px 0 0' : '8px 0 0 0'
                }}
              />
            );
          })}

          {/* Jugadores: discos de color por posición */}
          {slots.map(slot => {
            const jid = placement[slot.id];
            const j = jid ? jugadorById.get(jid) : undefined;
            const meta = ROLE_META[slot.role];
            const isSelected = selectedSlotId === slot.id;

            return (
              <button
                key={slot.id}
                type="button"
                onClick={() => handleSlotClick(slot)}
                title={
                  j
                    ? selectedSlotId && selectedSlotId !== slot.id
                      ? `Toca hueco de otra línea y toca de nuevo este jugador para moverlo`
                      : `#${j.dorsal} ${j.nombre} (${j.posicion} en hueco ${meta.label}) — tocar para quitar`
                    : `${meta.label} — hueco libre: vale cualquier posición`
                }
                className={`absolute -translate-x-1/2 -translate-y-1/2 flex flex-col items-center transition-transform ${
                  canManage ? 'cursor-pointer active:scale-95' : 'cursor-default'
                } ${isSelected ? 'scale-110 z-10' : ''}`}
                style={{ left: `${slot.x}%`, top: `${slot.y}%` }}
              >
                <span
                  className={`w-9 h-9 sm:w-10 sm:h-10 rounded-full flex items-center justify-center text-[10px] font-black font-athletic shadow-lg border-2 ${
                    j
                      ? `${meta.disk} ${meta.text} ${meta.border} shadow-black/40`
                      : isSelected
                        ? `bg-white ${meta.disk.replace('bg-', 'text-')} border-orange-400 animate-pulse ring-2 ring-orange-400`
                        : `bg-black/45 text-white/85 border-white/55 border-dashed`
                  }`}
                >
                  {j ? `#${j.dorsal || '?'}` : slot.role}
                </span>
                <span
                  className={`mt-0.5 max-w-[68px] px-1 rounded text-[8px] font-bold leading-tight truncate ${
                    j ? 'bg-gray-950/90 text-white' : 'bg-black/40 text-white/75'
                  }`}
                >
                  {j ? j.nombre.split(' ')[0] : meta.label}
                </span>
              </button>
            );
          })}
        </div>

        {/* Leyenda de colores */}
        <div className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1 pt-0.5">
          {(Object.keys(ROLE_META) as Role[]).map(role => {
            const m = ROLE_META[role];
            return (
              <span key={role} className="inline-flex items-center gap-1 text-[10px] font-bold text-gray-600">
                <span className={`w-3 h-3 rounded-full ${m.disk} border ${m.border}`} />
                {role} {m.label}
              </span>
            );
          })}
        </div>

        <div className="flex items-center justify-between px-0.5">
          <span className="text-[10px] font-bold uppercase tracking-wider text-white bg-emerald-900/80 px-1.5 py-0.5 rounded">
            ↓ Portería del club
          </span>
          {selectedSlotId && (
            <span className="text-[10px] font-bold text-orange-700 bg-orange-100 px-1.5 py-0.5 rounded">
              Hueco libre → toca cualquier jugador (posiciones libres)
            </span>
          )}
        </div>
      </div>

      {/* Banquillo */}
      <div className="bg-white rounded-2xl border border-gray-150 shadow-sm overflow-hidden">
        <div className="p-3 bg-gray-50 border-b border-gray-150 flex items-center justify-between">
          <h3 className="font-bold text-xs uppercase tracking-wider text-gray-700">
            Banquillo ({pool.length})
          </h3>
          <span className="text-[10px] text-gray-500">
            {canManage
              ? selectedSlotId
                ? 'Toca un jugador → va al hueco libre'
                : 'Toca hueco del campo, luego jugador (cualquier pos.)'
              : 'Solo lectura'}
          </span>
        </div>
        <div className="max-h-64 overflow-y-auto divide-y divide-gray-100">
          {pool.map(j => {
            const onPitch = usedJugadorIds.has(j.id);
            const role: Role =
              j.posicion === 'Portero' ? 'POR'
                : j.posicion === 'Defensa' ? 'DEF'
                  : j.posicion === 'Centrocampista' ? 'MED'
                    : 'DEL';
            const meta = ROLE_META[role];
            return (
              <button
                key={j.id}
                type="button"
                onClick={() => handlePoolClick(j.id)}
                disabled={!canManage}
                className={`w-full p-3 flex items-center gap-3 text-left transition-colors disabled:cursor-default ${
                  onPitch ? 'bg-orange-50/50' : 'hover:bg-gray-50'
                }`}
              >
                <GripVertical className="w-4 h-4 text-gray-300 shrink-0" />
                <span
                  className={`w-8 h-8 shrink-0 rounded-full flex items-center justify-center text-xs font-black font-athletic border-2 ${meta.disk} ${meta.text} ${meta.border}`}
                >
                  #{j.dorsal || '-'}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block font-bold text-sm text-gray-900 truncate">{j.nombre}</span>
                  <span className="block text-[11px] text-gray-400 truncate">{j.posicion}</span>
                </span>
                <span className={`shrink-0 text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                  onPitch
                    ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                    : 'bg-gray-100 text-gray-500 border-gray-200'
                }`}>
                  {onPitch ? 'Titular' : 'Banca'}
                </span>
              </button>
            );
          })}
          {pool.length === 0 && (
            <p className="p-6 text-center text-sm text-gray-400">
              No hay jugadores disponibles. Crea la convocatoria primero.
            </p>
          )}
        </div>
      </div>

      {/* Atrás + Play */}
      <div className="flex gap-3 pb-4">
        <button
          onClick={handleBack}
          className="flex-1 py-3 bg-white hover:bg-gray-50 text-gray-800 border border-gray-200 rounded-xl text-sm font-bold transition-colors flex items-center justify-center gap-2 shadow-sm"
        >
          <ArrowLeft className="w-4 h-4 text-gray-500" />
          Atrás
        </button>
        {isComplete && (
          <button
            onClick={handleStart}
            disabled={!canManage}
            title={canManage ? 'Empezar: ir a eventos del partido' : 'Solo lectura'}
            className="flex-1 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-sm font-bold transition-all shadow-md shadow-emerald-600/30 flex items-center justify-center gap-2 disabled:opacity-40"
          >
            <Play className="w-4 h-4 fill-current" />
            Empezar partido
          </button>
        )}
      </div>
    </div>
  );
};
