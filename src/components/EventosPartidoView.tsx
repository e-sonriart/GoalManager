import React, { useMemo, useState, useEffect, useRef } from 'react';
import { useClub } from '../context/ClubContext';
import { TeamShield } from './TeamShield';
import { resolveVisitorShield } from '../utils/shieldPresets';
import {
  FASE_LABEL,
  FASE_ORDER,
  type Fase,
  type MatchClock,
  type MatchEvent,
  type TipoEvento,
  emptyClock,
  loadClock,
  saveClock,
  fmtTime
} from '../utils/matchClock';
import { actaStatsDeltas } from '../utils/playerStatsFromEvents';
import { MatchHighlights } from './MatchHighlights';
import { saveClockRemote, loadClockRemote, mergeClocks } from '../services/matchClocks';
import {
  ClipboardList,
  Clock,
  Flag,
  Play,
  Plus,
  Timer,
  Zap,
  CircleDot,
  ArrowRightLeft,
  Ticket,
  Handshake,
  Pencil,
  Trash2,
  Save,
  AlertTriangle,
  RotateCcw,
  FileCheck
} from 'lucide-react';

interface EventosPartidoViewProps {
  initialPartidoId?: string;
  onBack?: () => void;
}

type TipoRapido = 'gol' | 'gol_contra' | 'asistencia' | 'tarjeta' | 'cambio';

const EVENT_META: Record<TipoEvento, { label: string; chip: string; dot: string }> = {
  gol: { label: 'Gol', chip: 'bg-emerald-100 text-emerald-800 border-emerald-300', dot: 'bg-emerald-500' },
  gol_contra: { label: 'Gol en contra', chip: 'bg-red-100 text-red-800 border-red-300', dot: 'bg-red-500' },
  asistencia: { label: 'Asistencia', chip: 'bg-sky-100 text-sky-800 border-sky-300', dot: 'bg-sky-500' },
  tarjeta: { label: 'Tarjeta', chip: 'bg-amber-100 text-amber-800 border-amber-300', dot: 'bg-amber-400' },
  cambio: { label: 'Cambio', chip: 'bg-blue-100 text-blue-800 border-blue-300', dot: 'bg-blue-500' },
  nota: { label: 'Nota', chip: 'bg-gray-100 text-gray-700 border-gray-200', dot: 'bg-gray-400' },
  fase: { label: 'Fase', chip: 'bg-orange-100 text-orange-800 border-orange-300', dot: 'bg-orange-500' }
};

function sortEvents(events: MatchEvent[]): MatchEvent[] {
  return [...events].sort(
    (a, b) =>
      Number(String(a.minuto).replace('+', '.')) -
        Number(String(b.minuto).replace('+', '.')) || 0
  );
}

function nowHora(): string {
  return new Date().toLocaleTimeString('es-ES', {
    hour: '2-digit',
    minute: '2-digit'
  });
}

export const EventosPartidoView: React.FC<EventosPartidoViewProps> = ({
  initialPartidoId,
  onBack
}) => {
  const { partidos, jugadores, equipos, categorias, savePartido, getTeamEscudo, applyEventStats } = useClub();

  const [selectedPartidoId, setSelectedPartidoId] = useState(
    initialPartidoId || partidos[0]?.id || ''
  );
  const [clock, setClock] = useState<MatchClock>(() => emptyClock());
  /** Solo persistir cuando el reloj de este partido ya se ha cargado (evita pisar running con el estado vacío del montaje) */
  const [clockLoadedId, setClockLoadedId] = useState<string | null>(null);
  const [tickNow, setTickNow] = useState(() => Date.now());
  const [picker, setPicker] = useState<TipoRapido | null>(null);
  const [notaTexto, setNotaTexto] = useState('');
  const [showNota, setShowNota] = useState(false);
  const [cambioOutId, setCambioOutId] = useState<string | null>(null);
  const [tarjetaColor, setTarjetaColor] = useState<'amarilla' | 'roja'>('amarilla');
  const [editId, setEditId] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState<{
    minuto: string;
    texto: string;
    tipo: TipoEvento;
    extra: string;
  }>({ minuto: '0', texto: '', tipo: 'nota', extra: '' });
  const [baseLocal, setBaseLocal] = useState(0);
  const [baseVisit, setBaseVisit] = useState(0);
  /** Dorsal del rival para gol en contra (solo número) */
  const [rivalDorsal, setRivalDorsal] = useState('');
  /** En gol a propia puerta: dorsal rival opcional */
  const [ownGoalMode, setOwnGoalMode] = useState(false);
  /** Confirmación de «Reiniciar» (no parar el cronómetro con Atrás) */
  const [confirmReset, setConfirmReset] = useState(false);

  const events = clock.events;
  const fase = clock.fase;
  const timerRef = useRef<number | null>(null);
  const clockRef = useRef(clock);
  clockRef.current = clock;

  const selectedPartido = useMemo(
    () => partidos.find(p => p.id === selectedPartidoId) || partidos[0],
    [partidos, selectedPartidoId]
  );
  const finalizado = Boolean(selectedPartido?.finalizado);

  const clubTeamName = useMemo(() => {
    if (!selectedPartido) return '';
    return selectedPartido.equipo || (
      equipos.some(e => e.nombre === selectedPartido.local)
        ? selectedPartido.local
        : selectedPartido.visitante
    );
  }, [selectedPartido, equipos]);

  const esClubLocal = useMemo(() => {
    if (!selectedPartido) return true;
    if (selectedPartido.equipo) return selectedPartido.local === selectedPartido.equipo;
    return equipos.some(e => e.nombre === selectedPartido.local);
  }, [selectedPartido, equipos]);

  /** Minutos reglamentarios de CADA parte (no del total) */
  const porParteMin = useMemo(() => {
    if (!selectedPartido) return 45;
    const cat = categorias.find(c => c.nombre === selectedPartido.categoria);
    return Number(cat?.tiempojuego || cat?.tiempoJuego) || (cat?.tipo === 'F8' ? 25 : 45);
  }, [selectedPartido, categorias]);

  const porParteSec = porParteMin * 60;

  /** Reloj de pared del tramo actual (1ª / descanso / 2ª) */
  const elapsedMs = useMemo(() => {
    const base = clock.accumulatedMs;
    if (clock.running && clock.startedAtMs != null) {
      return base + Math.max(0, tickNow - clock.startedAtMs);
    }
    return base;
  }, [clock.accumulatedMs, clock.running, clock.startedAtMs, tickNow]);

  const elapsed = Math.floor(elapsedMs / 1000);
  const esParte = fase === 'p1' || fase === 'p2';
  /** Al llegar al reglamentario de la parte: rojo +00:00 (tiempo extra) */
  const isOverReglamentario = esParte && elapsed >= porParteSec;
  const overSec = Math.max(0, elapsed - porParteSec);
  const overMin = Math.floor(overSec / 60);

  /** Minuto de evento (1ª: 0–X; 2ª: porParte–X; descanso: fin de 1ª) */
  const minuteLabel = useMemo(() => {
    if (fase === 'pre') return '0';
    if (fase === 'medio') return String(porParteMin);
    const mins = Math.floor(elapsed / 60);
    const over = elapsed >= porParteSec;
    const extra = Math.max(1, overMin);
    if (fase === 'p1') {
      if (over && overMin > 0) return `${porParteMin}+${extra}`;
      if (over) return String(porParteMin);
      return String(mins);
    }
    // p2 o fin (tramo congelado al final de la 2ª)
    if (over && overMin > 0) return `${porParteMin * 2}+${extra}`;
    if (over) return String(porParteMin * 2);
    return String(porParteMin + mins);
  }, [elapsed, fase, porParteMin, porParteSec, overMin]);

  const titulares = useMemo(() => {
    if (!selectedPartido) return [];
    const ids = selectedPartido.titulares || [];
    return ids
      .map(id => jugadores.find(j => j.id === id))
      .filter((j): j is NonNullable<typeof j> => Boolean(j));
  }, [selectedPartido, jugadores]);

  const suplentes = useMemo(() => {
    if (!selectedPartido) return [];
    const tit = new Set(selectedPartido.titulares || []);
    const conv = selectedPartido.convocados || [];
    const base = conv.length > 0
      ? jugadores.filter(j => conv.includes(j.id))
      : jugadores;
    return base.filter(j => !tit.has(j.id));
  }, [selectedPartido, jugadores]);

  const expelledIds = useMemo(() => {
    const yellows = new Map<string, number>();
    const out = new Set<string>();
    events.forEach(e => {
      if (e.tipo !== 'tarjeta' || !e.jugadorId) return;
      if (e.extra === 'roja') {
        out.add(e.jugadorId);
        return;
      }
      if (e.extra === 'amarilla') {
        const n = (yellows.get(e.jugadorId) || 0) + 1;
        yellows.set(e.jugadorId, n);
        if (n >= 2) out.add(e.jugadorId);
      }
    });
    return out;
  }, [events]);

  const disponiblesTitulares = useMemo(
    () => titulares.filter(j => !expelledIds.has(j.id)),
    [titulares, expelledIds]
  );
  const disponiblesSuplentes = useMemo(
    () => suplentes.filter(j => !expelledIds.has(j.id)),
    [suplentes, expelledIds]
  );

  const { golLocal, golVisitante } = useMemo(() => {
    const gClub = events.filter(e => e.tipo === 'gol').length;
    const gRival = events.filter(e => e.tipo === 'gol_contra').length;
    if (esClubLocal) {
      return { golLocal: baseLocal + gClub, golVisitante: baseVisit + gRival };
    }
    return { golLocal: baseLocal + gRival, golVisitante: baseVisit + gClub };
  }, [events, baseLocal, baseVisit, esClubLocal]);

  // ——— Cargar partido + reloj de localStorage (wall-clock: sigue con logout/cierre de pestaña) ———
  useEffect(() => {
    if (!selectedPartido) return;
    setBaseLocal(Number(selectedPartido.golesLocal) || 0);
    setBaseVisit(Number(selectedPartido.golesVisitante) || 0);
    setEditId(null);
    const c = loadClock(selectedPartido.id, selectedPartido.finalizado);
    setClock(c);
    setTickNow(Date.now());
    setClockLoadedId(selectedPartido.id);
    // Si Supabase tiene más eventos que el local, úsalos
    let cancelled = false;
    loadClockRemote(selectedPartido.id).then(remote => {
      if (cancelled || !remote) return;
      const winner = mergeClocks(c, remote);
      if (winner) {
        const finalClock = selectedPartido.finalizado
          ? { ...winner, running: false, startedAtMs: null, fase: 'fin' as const }
          : winner;
        setClock(finalClock);
        saveClock(selectedPartido.id, finalClock);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [selectedPartido?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  // Persistir reloj + eventos (solo tras cargar; no sobrescribir con el estado inicial vacío)
  useEffect(() => {
    if (!selectedPartido || clockLoadedId !== selectedPartido.id) return;
    saveClock(selectedPartido.id, clock);
    void saveClockRemote(selectedPartido.id, clock);
  }, [clock, selectedPartido?.id, clockLoadedId]);

  // Tick del reloj (solo refresca la UI; el tiempo real es Date.now())
  useEffect(() => {
    if (!clock.running) return;
    setTickNow(Date.now());
    timerRef.current = window.setInterval(() => {
      setTickNow(Date.now());
    }, 250);
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [clock.running]);

  /**
   * Cambia de tramo. Cada parte/descanso empieza en 00:00 y corre (pared).
   * Fin partido: congela el reloj (el acta se confirma aparte).
   */
  const transitionFase = (nextFase: Fase) => {
    setClock(prev => {
      const now = Date.now();
      let accumulatedMs = prev.accumulatedMs;
      if (prev.running && prev.startedAtMs != null) {
        accumulatedMs = prev.accumulatedMs + Math.max(0, now - prev.startedAtMs);
      }

      if (nextFase === 'fin') {
        return {
          ...prev,
          fase: nextFase,
          running: false,
          startedAtMs: null,
          accumulatedMs
        };
      }
      if (nextFase === 'pre') {
        return {
          ...prev,
          fase: nextFase,
          running: false,
          startedAtMs: null,
          accumulatedMs: 0
        };
      }
      // p1 / medio / p2: reinicia a 00:00 y sigue corriendo
      return {
        ...prev,
        fase: nextFase,
        running: true,
        startedAtMs: now,
        accumulatedMs: 0
      };
    });
    setTickNow(Date.now());
  };

  const pushEvent = (ev: MatchEvent) => {
    setClock(prev => ({
      ...prev,
      events: sortEvents([...prev.events, ev])
    }));
  };

  const buildEvent = (
    tipo: TipoEvento,
    texto: string,
    extra?: string,
    jugadorId?: string,
    minuto?: string
  ): MatchEvent => ({
    id: `ev_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    minuto: minuto ?? (fase === 'pre' ? '0' : minuteLabel),
    tipo,
    texto,
    extra,
    jugadorId,
    hora: nowHora()
  });

  /** Inicio/fin de cada tramo cuenta como evento en la cronología */
  const pushFaseEvent = (texto: string, minuto?: string) => {
    pushEvent(buildEvent('fase', texto, undefined, undefined, minuto));
  };

  const summaryFrom = (evs: MatchEvent[]): string =>
    evs
      .map(e => `${e.minuto}' ${EVENT_META[e.tipo].label}${e.extra ? ` (${e.extra})` : ''}: ${e.texto}${e.hora ? ` [${e.hora}]` : ''}`)
      .join(' | ');

  const advanceFase = async () => {
    if (fase === 'pre') {
      pushFaseEvent('Inicio 1ª parte', '0');
      transitionFase('p1');
      return;
    }
    if (fase === 'p1') {
      const m = minuteLabel;
      pushFaseEvent('Fin 1ª parte', m);
      // Descanso: reloj a 00:00 y contando
      transitionFase('medio');
      return;
    }
    if (fase === 'medio') {
      pushFaseEvent('Inicio 2ª parte', String(porParteMin));
      transitionFase('p2');
      return;
    }
    if (fase === 'p2') {
      const m = minuteLabel;
      pushFaseEvent('Fin del partido', m);
      transitionFase('fin');
      // No finaliza aquí: falta confirmar el acta
      await persistir();
      return;
    }
    if (fase === 'fin' && !finalizado) {
      await confirmarActa();
    }
  };

  const faseButtonLabel = (): string => {
    switch (fase) {
      case 'pre': return 'Iniciar 1ª parte';
      case 'p1': return 'Fin 1ª parte';
      case 'medio': return 'Iniciar 2ª parte';
      case 'p2': return 'Fin del partido';
      case 'fin':
        return finalizado ? 'Acta confirmada' : 'Confirmar acta';
    }
  };

  const persistir = async () => {
    if (!selectedPartido) return;
    const c = clockRef.current;
    await savePartido({
      ...selectedPartido,
      golesLocal: golLocal,
      golesVisitante: golVisitante,
      eventos: summaryFrom(c.events) || selectedPartido.eventos,
      finalizado: Boolean(selectedPartido.finalizado)
    });
  };

  /** El entrenador cierra el acta → finaliza y suma: +1 partido a convocados/titulares, +titular y goles/asistencias/tarjetas */
  const confirmarActa = async () => {
    if (!selectedPartido || selectedPartido.finalizado) return;
    const ev = buildEvent('fase', 'Acta confirmada por el entrenador', 'acta');
    const newEvents = sortEvents([...clockRef.current.events, ev]);
    setClock(prev => ({ ...prev, events: newEvents }));
    await savePartido({
      ...selectedPartido,
      golesLocal: golLocal,
      golesVisitante: golVisitante,
      eventos: summaryFrom(newEvents) || selectedPartido.eventos,
      finalizado: true
    });
    const asIds = (v: unknown): string[] =>
      Array.isArray(v) ? v.filter((id): id is string => typeof id === 'string') : [];
    const deltas = actaStatsDeltas(
      asIds(selectedPartido.convocados),
      asIds(selectedPartido.titulares),
      newEvents
    );
    await applyEventStats(deltas, 1);
  };

  /** Reiniciar: borra reloj/eventos del tramo y reabre el partido (con confirmación) */
  const handleReiniciar = async () => {
    if (!selectedPartido) return;
    const prevEvents = clockRef.current.events;
    const wasFinalizado = Boolean(selectedPartido.finalizado);
    if (wasFinalizado) {
      const asIds = (v: unknown): string[] =>
        Array.isArray(v) ? v.filter((id): id is string => typeof id === 'string') : [];
      const deltas = actaStatsDeltas(
        asIds(selectedPartido.convocados),
        asIds(selectedPartido.titulares),
        prevEvents
      );
      await applyEventStats(deltas, -1);
    }
    const empty = emptyClock();
    setClock(empty);
    setTickNow(Date.now());
    saveClock(selectedPartido.id, empty);
    void saveClockRemote(selectedPartido.id, empty);
    await savePartido({
      ...selectedPartido,
      finalizado: false,
      golesLocal: baseLocal,
      golesVisitante: baseVisit
    });
    setConfirmReset(false);
  };

  const closePicker = () => {
    setPicker(null);
    setCambioOutId(null);
    setTarjetaColor('amarilla');
    setRivalDorsal('');
    setOwnGoalMode(false);
  };

  const handleTarjeta = (j: { id: string; nombre: string; dorsal: number | string }) => {
    const dorsal = j.dorsal ? `#${j.dorsal} ` : '';
    const priorYellows = events.filter(
      e => e.tipo === 'tarjeta' && e.jugadorId === j.id && e.extra === 'amarilla'
    ).length;

    if (tarjetaColor === 'roja') {
      pushEvent(buildEvent('tarjeta', `Tarjeta roja a ${dorsal}${j.nombre}`, 'roja', j.id));
      closePicker();
      return;
    }

    pushEvent(buildEvent('tarjeta', `Tarjeta amarilla a ${dorsal}${j.nombre}`, 'amarilla', j.id));

    if (priorYellows + 1 >= 2) {
      pushEvent(
        buildEvent('tarjeta', `2ª amarilla → ROJA a ${dorsal}${j.nombre}`, 'roja', j.id)
      );
    }
    closePicker();
  };

  const handlePick = (jugadorId: string) => {
    const j = jugadores.find(x => x.id === jugadorId);
    if (!j) return;
    if (expelledIds.has(j.id)) return;
    const nombre = j.nombre;
    const dorsal = j.dorsal ? `#${j.dorsal} ` : '';

    if (picker === 'gol') {
      if (ownGoalMode) {
        // Gol a favor en propia puerta del rival (dorsal rival opcional)
        const d = rivalDorsal.trim();
        pushEvent(
          buildEvent(
            'gol',
            d
              ? `Gol a favor · Propia puerta del rival #${d}`
              : 'Gol a favor · Propia puerta del rival',
            d ? `propia puerta #${d}` : 'propia puerta'
          )
        );
        closePicker();
        return;
      }
      pushEvent(buildEvent('gol', `Gol de ${dorsal}${nombre}`, undefined, j.id));
      closePicker();
      return;
    }
    if (picker === 'asistencia') {
      pushEvent(buildEvent('asistencia', `Asistencia de ${dorsal}${nombre}`, undefined, j.id));
      closePicker();
      return;
    }
    if (picker === 'tarjeta') {
      handleTarjeta(j);
      return;
    }
    if (picker === 'cambio') {
      if (!cambioOutId) {
        setCambioOutId(jugadorId);
        return;
      }
      if (cambioOutId === j.id) return;
      const sal = jugadores.find(x => x.id === cambioOutId);
      pushEvent(
        buildEvent(
          'cambio',
          `Cambio: sale ${sal ? `#${sal.dorsal} ${sal.nombre}` : '?'} · entra ${dorsal}${nombre}`,
          undefined,
          j.id
        )
      );
      closePicker();
    }
  };

  /** Gol en contra: solo dorsal del equipo contrario (número) */
  const submitGolContra = () => {
    const d = rivalDorsal.trim();
    if (!d || !/^\d{1,2}$/.test(d)) return;
    pushEvent(
      buildEvent(
        'gol_contra',
        `Gol en contra · Rival #${d}`,
        `rival #${d}`
      )
    );
    closePicker();
  };

  const addNota = () => {
    if (!notaTexto.trim()) return;
    pushEvent(buildEvent('nota', notaTexto.trim()));
    setNotaTexto('');
    setShowNota(false);
  };

  const openEdit = (ev: MatchEvent) => {
    setEditId(ev.id);
    setEditDraft({
      minuto: ev.minuto,
      texto: ev.texto,
      tipo: ev.tipo,
      extra: ev.extra || ''
    });
  };

  const saveEdit = () => {
    if (!editId) return;
    setClock(prev => ({
      ...prev,
      events: sortEvents(
        prev.events.map(e =>
          e.id === editId
            ? {
                ...e,
                minuto: editDraft.minuto || e.minuto,
                texto: editDraft.texto,
                tipo: editDraft.tipo,
                extra:
                  editDraft.tipo === 'tarjeta'
                    ? editDraft.extra === 'roja'
                      ? 'roja'
                      : 'amarilla'
                    : editDraft.tipo === 'gol_contra' || editDraft.tipo === 'gol' || editDraft.tipo === 'fase'
                      ? e.extra
                      : undefined
              }
            : e
        )
      )
    }));
    setEditId(null);
  };

  const deleteEdit = () => {
    if (!editId) return;
    setClock(prev => ({ ...prev, events: prev.events.filter(e => e.id !== editId) }));
    setEditId(null);
  };

  const editingEvent = events.find(e => e.id === editId) || null;
  const timerRunning = clock.running && fase !== 'pre' && fase !== 'fin';
  /** En juego desde que se inicia una parte hasta confirmar el acta */
  const enJuego = fase !== 'pre' && !finalizado;

  if (!selectedPartido) {
    return (
      <div className="bg-white p-8 rounded-2xl border text-center text-gray-400">
        <ClipboardList className="w-8 h-8 mx-auto mb-2 text-gray-300" />
        <p className="font-semibold text-sm">No hay partidos con eventos pendientes.</p>
      </div>
    );
  }

  const faseDisabled = finalizado;

  return (
    <div className="space-y-4 pb-4">
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900 font-athletic tracking-tight">
            EVENTOS <span className="text-orange-600">DEL PARTIDO</span>
          </h1>
          <p className="text-xs text-gray-500 mt-0.5">
            {titulares.length} titulares · {events.length} evento{events.length !== 1 ? 's' : ''}
            {expelledIds.size > 0 && (
              <span className="text-red-600 font-bold"> · {expelledIds.size} expulsado{expelledIds.size !== 1 ? 's' : ''}</span>
            )}
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {finalizado ? (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-black bg-gray-900 text-emerald-400 border border-gray-700">
              <FileCheck className="w-3 h-3" />
              ACTA CERRADA
            </span>
          ) : enJuego ? (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-black bg-red-100 text-red-700 border border-red-300">
              <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
              EN JUEGO
            </span>
          ) : (
            <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-gray-100 text-gray-600 border border-gray-200">
              {FASE_LABEL[fase]}
            </span>
          )}
        </div>
      </div>

      {/* Marcador + cronómetro de pared */}
      <div className="bg-gray-950 text-white p-4 rounded-2xl border border-gray-800 shadow-inner">
        <div className="flex items-center justify-between gap-3">
          <div className="flex flex-col items-center flex-1 min-w-0 gap-1">
            <div className="w-10 h-10 rounded-xl bg-white/10 p-1 flex items-center justify-center border border-white/20 overflow-hidden">
              <TeamShield
                escudoUrl={selectedPartido.local === clubTeamName ? getTeamEscudo(selectedPartido.local) : resolveVisitorShield(selectedPartido)}
                teamName={selectedPartido.local}
                size="sm"
                className="w-full h-full"
              />
            </div>
            <p className="text-[11px] font-bold font-athletic truncate w-full text-center" title={selectedPartido.local}>
              {selectedPartido.local}
            </p>
          </div>

          <div className="text-center shrink-0 px-1 space-y-1">
            <div className="text-2xl font-black font-athletic text-orange-400 tabular-nums">
              {golLocal} - {golVisitante}
            </div>
            <div className="bg-black/50 border border-gray-700 rounded-xl px-3 py-1.5 inline-flex flex-col items-center gap-0.5">
              <div className="flex items-center gap-2">
                <Timer className={`w-4 h-4 ${
                  isOverReglamentario && timerRunning
                    ? 'text-red-400'
                    : timerRunning
                      ? 'text-emerald-400'
                      : 'text-gray-500'
                }`} />
                {fase === 'medio' ? (
                  <span className="text-lg font-black font-athletic tabular-nums leading-none text-gray-400">
                    00:00
                  </span>
                ) : isOverReglamentario && timerRunning ? (
                  <span className="text-lg font-black font-athletic tabular-nums leading-none text-red-500 animate-pulse">
                    +{fmtTime(overSec)}
                  </span>
                ) : (
                  <span className={`text-lg font-black font-athletic tabular-nums leading-none ${
                    timerRunning ? 'text-emerald-400' : 'text-gray-400'
                  }`}>
                    {fmtTime(elapsed)}
                  </span>
                )}
              </div>
              {fase === 'medio' ? (
                <span className="text-[9px] font-bold text-sky-400 uppercase tracking-wider whitespace-nowrap flex items-center gap-1">
                  Descanso
                  <span className="inline-block tabular-nums text-sky-300 bg-sky-950/60 px-1 rounded">
                    {fmtTime(elapsed)}
                  </span>
                </span>
              ) : isOverReglamentario && timerRunning ? (
                <span className="text-[9px] font-black text-red-400 uppercase tracking-wider whitespace-nowrap">
                  Regl. {porParteMin}′ + {overMin}′
                </span>
              ) : (
                <span className="text-[9px] font-bold text-gray-500 uppercase tracking-wider whitespace-nowrap">
                  Regl. parte {porParteMin}′
                </span>
              )}
            </div>
            <p className="text-[10px] font-bold text-orange-300 uppercase tracking-wider">
              {FASE_LABEL[fase]} · {fase === 'pre' ? '—' : `${minuteLabel}′`}
            </p>
          </div>

          <div className="flex flex-col items-center flex-1 min-w-0 gap-1">
            <div className="w-10 h-10 rounded-xl bg-white/10 p-1 flex items-center justify-center border border-white/20 overflow-hidden">
              <TeamShield
                escudoUrl={selectedPartido.visitante === clubTeamName ? getTeamEscudo(selectedPartido.visitante) : resolveVisitorShield(selectedPartido)}
                teamName={selectedPartido.visitante}
                size="sm"
                className="w-full h-full"
              />
            </div>
            <p className="text-[11px] font-bold font-athletic truncate w-full text-center" title={selectedPartido.visitante}>
              {selectedPartido.visitante}
            </p>
          </div>
        </div>

        {/* Acciones destacadas bajo el resultado (en vivo: goles/tarjetas cronológicos) */}
        <div className="mt-3">
          <MatchHighlights events={events} tone="dark" />
        </div>
      </div>

      {/* Control de fases */}
      <div className="bg-white p-3 rounded-2xl border border-gray-150 shadow-sm space-y-2">
        <div className="flex items-center justify-between gap-2">
          <span className="text-[10px] font-bold uppercase tracking-wider text-gray-500 flex items-center gap-1">
            <Clock className="w-3 h-3 text-orange-500" />
            Control del partido
          </span>
          <div className="flex items-center gap-1">
            {FASE_ORDER.map((f, i, arr) => {
              const cur = FASE_ORDER.indexOf(fase);
              const active = i <= cur;
              return (
                <React.Fragment key={f}>
                  <span
                    className={`w-1.5 h-1.5 rounded-full ${active ? 'bg-orange-500' : 'bg-gray-200'}`}
                    title={FASE_LABEL[f]}
                  />
                  {i < arr.length - 1 && (
                    <span className={`w-3 h-0.5 ${i < cur ? 'bg-orange-500' : 'bg-gray-200'}`} />
                  )}
                </React.Fragment>
              );
            })}
          </div>
        </div>

        <div className="flex gap-2">
          <button
            onClick={advanceFase}
            disabled={faseDisabled}
            className={`flex-1 min-w-0 py-3 rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition-all disabled:opacity-40 disabled:cursor-not-allowed ${
              fase === 'fin'
                ? finalizado
                  ? 'bg-gray-200 text-gray-500'
                  : 'bg-purple-600 hover:bg-purple-700 text-white shadow-md shadow-purple-500/30'
                : fase === 'p1' || fase === 'p2' || fase === 'medio'
                  ? 'bg-amber-500 hover:bg-amber-600 text-white shadow-md shadow-amber-500/30'
                  : 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-md shadow-emerald-600/30'
            }`}
          >
            {fase === 'pre' ? (
              <Play className="w-4 h-4 fill-current shrink-0" />
            ) : fase === 'fin' ? (
              finalizado ? (
                <FileCheck className="w-4 h-4 shrink-0" />
              ) : (
                <Save className="w-4 h-4 shrink-0" />
              )
            ) : (
              <Flag className="w-4 h-4 shrink-0" />
            )}
            <span className="truncate">{faseButtonLabel()}</span>
          </button>
          <button
            onClick={() => setConfirmReset(true)}
            disabled={fase === 'pre' && events.length === 0 && !finalizado}
            title="Reiniciar partido (no para el cronómetro)"
            className="py-2 px-2.5 bg-white hover:bg-red-50 text-red-700 border border-red-200 rounded-xl text-[11px] font-bold flex items-center gap-1 shrink-0 disabled:opacity-30 disabled:cursor-not-allowed"
          >
            <RotateCcw className="w-3.5 h-3.5 shrink-0" />
            Reiniciar
          </button>
        </div>
        {timerRunning && (
          <p className="text-[10px] text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-lg px-2.5 py-1.5 flex items-center gap-1.5 font-semibold">
            <Timer className="w-3.5 h-3.5 shrink-0" />
            Cronómetro de pared: sigue aunque cierres la app. Cada parte arranca a 00:00.
          </p>
        )}
        {isOverReglamentario && timerRunning && (
          <p className="text-[11px] font-bold text-red-700 bg-red-50 border border-red-200 rounded-lg px-2.5 py-1.5 flex items-center gap-1.5">
            <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
            Reglamentario de la parte ({porParteMin}′) superado — tiempo extra +{overMin}′.
          </p>
        )}
        {fase === 'fin' && !finalizado && (
          <p className="text-[11px] font-bold text-purple-700 bg-purple-50 border border-purple-200 rounded-lg px-2.5 py-1.5 flex items-center gap-1.5">
            <Save className="w-3.5 h-3.5 shrink-0" />
            Partido terminado. El entrenador debe «Confirmar acta» para que figure como finalizado.
          </p>
        )}
      </div>

      {/* Registro rápido */}
      <div className="bg-white p-3 rounded-2xl border border-gray-150 shadow-sm space-y-2">
        <div className="flex items-center justify-between">
          <h3 className="font-bold text-xs uppercase tracking-wider text-gray-700 flex items-center gap-1.5">
            <Zap className="w-3.5 h-3.5 text-orange-500" />
            Registro rápido
          </h3>
          <span className="text-[10px] text-gray-500">
            Minuto {fase === 'pre' ? '—' : `${minuteLabel}′`}
          </span>
        </div>

        <div className="grid grid-cols-1 gap-2">
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => {
                setOwnGoalMode(false);
                setRivalDorsal('');
                setPicker('gol');
              }}
              disabled={fase === 'fin'}
              className="py-3.5 px-2 bg-emerald-600 hover:bg-emerald-700 active:scale-[0.99] text-white rounded-xl text-sm font-black tracking-wide flex items-center justify-center gap-1.5 shadow-md shadow-emerald-600/25 disabled:opacity-40"
            >
              <CircleDot className="w-4 h-4 fill-current shrink-0" />
              GOL
            </button>
            <button
              onClick={() => {
                setRivalDorsal('');
                setPicker('gol_contra');
              }}
              disabled={fase === 'fin'}
              className="py-3.5 px-2 bg-red-600 hover:bg-red-700 active:scale-[0.99] text-white rounded-xl text-sm font-black tracking-wide flex items-center justify-center gap-1.5 shadow-md shadow-red-600/25 disabled:opacity-40"
            >
              <CircleDot className="w-4 h-4 shrink-0" />
              GOL EN CONTRA
            </button>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => setPicker('asistencia')}
              disabled={fase === 'fin'}
              className="py-3.5 px-3 bg-sky-600 hover:bg-sky-700 active:scale-[0.99] text-white rounded-xl text-sm font-black tracking-wide flex items-center justify-center gap-2 shadow-md shadow-sky-600/25 disabled:opacity-40"
            >
              <Handshake className="w-4 h-4 shrink-0" />
              ASISTENCIA
            </button>
            <button
              onClick={() => {
                setTarjetaColor('amarilla');
                setPicker('tarjeta');
              }}
              disabled={fase === 'fin'}
              className="py-3.5 px-3 bg-amber-500 hover:bg-amber-600 active:scale-[0.99] text-white rounded-xl text-sm font-black tracking-wide flex items-center justify-center gap-2 shadow-md shadow-amber-500/25 disabled:opacity-40"
            >
              <Ticket className="w-4 h-4 shrink-0" />
              TARJETA
            </button>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => setPicker('cambio')}
              disabled={fase === 'fin'}
              className="py-3.5 px-3 bg-blue-600 hover:bg-blue-700 active:scale-[0.99] text-white rounded-xl text-sm font-black tracking-wide flex items-center justify-center gap-2 shadow-md shadow-blue-600/25 disabled:opacity-40"
            >
              <ArrowRightLeft className="w-4 h-4 shrink-0" />
              CAMBIO
            </button>
            <button
              onClick={() => setShowNota(prev => !prev)}
              disabled={fase === 'fin'}
              className="py-3.5 px-3 bg-gray-700 hover:bg-gray-800 active:scale-[0.99] text-white rounded-xl text-sm font-black tracking-wide flex items-center justify-center gap-2 shadow-md disabled:opacity-40"
            >
              <Plus className="w-4 h-4 shrink-0" />
              NOTA
            </button>
          </div>
        </div>

        {showNota && (
          <div className="flex gap-2 pt-1">
            <input
              type="text"
              value={notaTexto}
              onChange={e => setNotaTexto(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && addNota()}
              placeholder="Incidente, lesión, aviso..."
              className="flex-1 min-w-0 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-orange-500 focus:outline-none"
              autoFocus
            />
            <button
              onClick={addNota}
              disabled={!notaTexto.trim()}
              className="px-4 py-2 bg-gray-900 text-white rounded-lg text-sm font-bold disabled:opacity-40"
            >
              Añadir
            </button>
          </div>
        )}
      </div>

      {/* Cronología */}
      <div className="bg-white rounded-2xl border border-gray-150 shadow-sm overflow-hidden">
        <div className="p-3 bg-gray-50 border-b border-gray-150">
          <h3 className="font-bold text-xs uppercase tracking-wider text-gray-700">
            Cronología ({events.length})
          </h3>
        </div>
        {events.length === 0 ? (
          <div className="p-8 text-center text-gray-400">
            <Flag className="w-7 h-7 mx-auto mb-2 text-gray-300" />
            <p className="text-sm font-semibold">
              Pulsa «Iniciar 1ª parte» y registra goles con los botones de arriba.
            </p>
          </div>
        ) : (
          <ul className="divide-y divide-gray-100">
            {events.map(ev => {
              const meta = EVENT_META[ev.tipo];
              const expelled = ev.tipo === 'tarjeta' && ev.extra === 'roja';
              return (
                <li key={ev.id} className={`p-3 flex items-start gap-3 ${expelled ? 'bg-red-50/50' : ''}`}>
                  <span className="shrink-0 w-12 text-center text-xs font-black font-athletic text-orange-600 bg-orange-50 border border-orange-200 rounded-lg py-1 tabular-nums">
                    {ev.minuto}′
                  </span>
                  <div className="min-w-0 flex-1">
                    <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold border mb-1 ${meta.chip}`}>
                      {meta.label}{ev.extra ? ` · ${ev.extra}` : ''}
                    </span>
                    <p className="text-sm text-gray-800 font-medium break-words">{ev.texto}</p>
                    {ev.hora && (
                      <p className="text-[10px] text-gray-400 mt-0.5 tabular-nums">
                        {ev.hora}
                      </p>
                    )}
                    {ev.tipo === 'tarjeta' && ev.jugadorId && expelledIds.has(ev.jugadorId) && (
                      <p className="text-[10px] font-bold text-red-600 mt-0.5 flex items-center gap-1">
                        <AlertTriangle className="w-3 h-3" />
                        Expulsado — no disponible para más eventos
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <span className={`w-2.5 h-2.5 rounded-full ${meta.dot}`} />
                    <button
                      onClick={() => openEdit(ev)}
                      title="Editar evento"
                      className="w-8 h-8 flex items-center justify-center text-gray-400 hover:text-orange-600 hover:bg-orange-50 rounded-lg transition-colors"
                    >
                      <Pencil className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {/* Alineación */}
      {titulares.length > 0 && (
        <div className="bg-white rounded-2xl border border-gray-150 shadow-sm p-4 space-y-2">
          <h3 className="font-bold text-xs uppercase tracking-wider text-gray-700">
            Titulares ({titulares.length})
          </h3>
          <div className="flex flex-wrap gap-1.5">
            {titulares.map(j => {
              const expulsado = expelledIds.has(j.id);
              return (
                <span
                  key={j.id}
                  className={`px-2 py-1 rounded-lg text-[11px] font-bold ${
                    expulsado
                      ? 'bg-red-100 text-red-700 line-through border border-red-300'
                      : 'bg-gray-900 text-white'
                  }`}
                  title={expulsado ? `${j.nombre} — expulsado` : j.nombre}
                >
                  #{j.dorsal} {j.nombre.split(' ')[0]}
                  {expulsado && ' 🟥'}
                </span>
              );
            })}
          </div>
        </div>
      )}

      {/* ===== Picker GOL (nuestros jugadores + propia puerta) ===== */}
      {picker === 'gol' && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/55 p-0 sm:p-4"
          onClick={closePicker}
        >
          <div
            className="w-full sm:max-w-md bg-white rounded-t-3xl sm:rounded-2xl shadow-2xl max-h-[85vh] flex flex-col"
            onClick={e => e.stopPropagation()}
          >
            <div className="p-4 border-b border-gray-150 flex items-center justify-between gap-2 shrink-0">
              <div>
                <h3 className="font-bold text-sm text-gray-900">
                  {ownGoalMode ? 'Gol a favor · Propia puerta' : '¿Quién marca el gol?'}
                </h3>
                <p className="text-[11px] text-gray-500 mt-0.5">
                  Minuto {fase === 'pre' ? '—' : `${minuteLabel}′`}
                </p>
              </div>
              <button onClick={closePicker} className="text-gray-400 hover:text-gray-600 text-xs font-bold px-2 py-1">
                ✕
              </button>
            </div>

            {!ownGoalMode && (
              <div className="p-3 border-b border-gray-100 shrink-0">
                <button
                  onClick={() => setOwnGoalMode(true)}
                  className="w-full py-3 bg-emerald-50 hover:bg-emerald-100 border-2 border-emerald-300 text-emerald-800 rounded-xl text-sm font-black flex items-center justify-center gap-2"
                >
                  <CircleDot className="w-4 h-4" />
                  En propia puerta (gol a favor)
                </button>
              </div>
            )}

            {ownGoalMode && (
              <div className="p-3 border-b border-gray-100 space-y-2 shrink-0">
                <label className="block text-[10px] font-bold text-gray-500 uppercase">
                  Dorsal rival (opcional, solo número)
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    maxLength={2}
                    value={rivalDorsal}
                    onChange={e => setRivalDorsal(e.target.value.replace(/\D/g, ''))}
                    placeholder="ej: 9"
                    className="w-24 px-3 py-2.5 border border-gray-300 rounded-lg text-sm font-bold text-center focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                    autoFocus
                  />
                  <button
                    onClick={() => {
                      const d = rivalDorsal.trim();
                      pushEvent(
                        buildEvent(
                          'gol',
                          d
                            ? `Gol a favor · Propia puerta del rival #${d}`
                            : 'Gol a favor · Propia puerta del rival',
                          d ? `propia puerta #${d}` : 'propia puerta'
                        )
                      );
                      closePicker();
                    }}
                    className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-sm font-black"
                  >
                    Guardar gol a favor
                  </button>
                </div>
                <button
                  onClick={() => {
                    setOwnGoalMode(false);
                    setRivalDorsal('');
                  }}
                  className="w-full py-1.5 text-xs font-bold text-gray-500 hover:text-gray-700"
                >
                  ← Elegir goleador de nuestro equipo
                </button>
              </div>
            )}

            <div className="overflow-y-auto divide-y divide-gray-100 flex-1 min-h-0">
              {!ownGoalMode && disponiblesTitulares.map(j => {
                const expulsado = expelledIds.has(j.id);
                return (
                  <button
                    key={j.id}
                    type="button"
                    onClick={() => handlePick(j.id)}
                    disabled={expulsado}
                    className="w-full p-3.5 flex items-center gap-3 text-left hover:bg-orange-50/60 active:bg-orange-100 transition-colors disabled:opacity-35 disabled:cursor-not-allowed"
                  >
                    <span className={`w-9 h-9 shrink-0 rounded-full flex items-center justify-center text-xs font-black font-athletic ${
                      expulsado ? 'bg-red-200 text-red-700' : 'bg-emerald-600 text-white'
                    }`}>
                      #{j.dorsal || '-'}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block font-bold text-sm text-gray-900 truncate">{j.nombre}</span>
                      <span className="block text-[11px] text-gray-400 truncate">{j.posicion}</span>
                    </span>
                  </button>
                );
              })}
              {!ownGoalMode && disponiblesTitulares.length === 0 && (
                <p className="p-6 text-center text-sm text-gray-400">No hay jugadores disponibles.</p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ===== Picker GOL EN CONTRA: solo dorsal rival ===== */}
      {picker === 'gol_contra' && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/55 p-0 sm:p-4"
          onClick={closePicker}
        >
          <div
            className="w-full sm:max-w-md bg-white rounded-t-3xl sm:rounded-2xl shadow-2xl"
            onClick={e => e.stopPropagation()}
          >
            <div className="p-4 border-b border-gray-150 flex items-center justify-between gap-2">
              <div>
                <h3 className="font-bold text-sm text-gray-900">Gol en contra</h3>
                <p className="text-[11px] text-gray-500 mt-0.5">
                  El equipo contrario nos marca · dorsal del rival
                </p>
              </div>
              <button onClick={closePicker} className="text-gray-400 hover:text-gray-600 text-xs font-bold px-2 py-1">
                ✕
              </button>
            </div>
            <div className="p-4 space-y-3">
              <div>
                <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1.5">
                  Dorsal del equipo contrario (solo número)
                </label>
                <input
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  maxLength={2}
                  value={rivalDorsal}
                  onChange={e => setRivalDorsal(e.target.value.replace(/\D/g, ''))}
                  onKeyDown={e => e.key === 'Enter' && submitGolContra()}
                  placeholder="ej: 10"
                  className="w-full px-4 py-3 border-2 border-red-300 rounded-xl text-center text-2xl font-black font-athletic text-red-700 bg-red-50 focus:ring-2 focus:ring-red-500 focus:outline-none"
                  autoFocus
                />
                <p className="text-[10px] text-gray-400 mt-1 text-center">
                  Minuto {fase === 'pre' ? '—' : `${minuteLabel}′`} · no se marca con jugadores del club
                </p>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={closePicker}
                  className="flex-1 py-3 bg-white hover:bg-gray-50 text-gray-700 border border-gray-200 rounded-xl text-sm font-bold"
                >
                  Cancelar
                </button>
                <button
                  onClick={submitGolContra}
                  disabled={!/^\d{1,2}$/.test(rivalDorsal.trim())}
                  className="flex-[2] py-3 bg-red-600 hover:bg-red-700 text-white rounded-xl text-sm font-black flex items-center justify-center gap-2 disabled:opacity-40"
                >
                  <CircleDot className="w-4 h-4" />
                  Guardar gol en contra
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ===== Picker asistencia / tarjeta / cambio ===== */}
      {(picker === 'asistencia' || picker === 'tarjeta' || picker === 'cambio') && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/55 p-0 sm:p-4"
          onClick={closePicker}
        >
          <div
            className="w-full sm:max-w-md bg-white rounded-t-3xl sm:rounded-2xl shadow-2xl max-h-[85vh] flex flex-col"
            onClick={e => e.stopPropagation()}
          >
            <div className="p-4 border-b border-gray-150 flex items-center justify-between gap-2 shrink-0">
              <div>
                <h3 className="font-bold text-sm text-gray-900">
                  {picker === 'asistencia' && '¿Quién da la asistencia?'}
                  {picker === 'tarjeta' && 'Tarjeta para...'}
                  {picker === 'cambio' && (cambioOutId ? '¿Entra?' : '¿Sale del campo?')}
                </h3>
                <p className="text-[11px] text-gray-500 mt-0.5">
                  Minuto {fase === 'pre' ? '—' : `${minuteLabel}′`}
                </p>
              </div>
              <button onClick={closePicker} className="text-gray-400 hover:text-gray-600 text-xs font-bold px-2 py-1">
                ✕
              </button>
            </div>

            {picker === 'tarjeta' && (
              <div className="p-3 border-b border-gray-100 flex gap-2 shrink-0">
                <button
                  onClick={() => setTarjetaColor('amarilla')}
                  className={`flex-1 py-2 rounded-xl text-xs font-bold border-2 transition-all ${
                    tarjetaColor === 'amarilla'
                      ? 'bg-amber-100 border-amber-400 text-amber-900'
                      : 'bg-white border-gray-200 text-gray-600'
                  }`}
                >
                  🟨 Amarilla
                </button>
                <button
                  onClick={() => setTarjetaColor('roja')}
                  className={`flex-1 py-2 rounded-xl text-xs font-bold border-2 transition-all ${
                    tarjetaColor === 'roja'
                      ? 'bg-red-100 border-red-400 text-red-800'
                      : 'bg-white border-gray-200 text-gray-600'
                  }`}
                >
                  🟥 Roja
                </button>
              </div>
            )}

            <div className="overflow-y-auto divide-y divide-gray-100 flex-1 min-h-0">
              {(picker === 'cambio' && cambioOutId
                ? disponiblesSuplentes
                : disponiblesTitulares
              ).map(j => {
                const expulsado = expelledIds.has(j.id);
                return (
                  <button
                    key={j.id}
                    type="button"
                    onClick={() => handlePick(j.id)}
                    disabled={expulsado}
                    className="w-full p-3.5 flex items-center gap-3 text-left hover:bg-orange-50/60 active:bg-orange-100 transition-colors disabled:opacity-35 disabled:cursor-not-allowed"
                  >
                    <span className={`w-9 h-9 shrink-0 rounded-full flex items-center justify-center text-xs font-black font-athletic ${
                      expulsado ? 'bg-red-200 text-red-700' : 'bg-gray-900 text-white'
                    }`}>
                      #{j.dorsal || '-'}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block font-bold text-sm text-gray-900 truncate">
                        {j.nombre}
                        {expulsado && (
                          <span className="ml-1.5 text-[10px] text-red-600 font-black">🟥 EXP.</span>
                        )}
                      </span>
                      <span className="block text-[11px] text-gray-400 truncate">{j.posicion}</span>
                    </span>
                    {!expulsado && (
                      <span className="shrink-0 text-gray-300">
                        <Play className="w-4 h-4" />
                      </span>
                    )}
                  </button>
                );
              })}
              {(picker === 'cambio' && cambioOutId
                ? disponiblesSuplentes.length === 0
                : disponiblesTitulares.length === 0) && (
                <p className="p-6 text-center text-sm text-gray-400">No hay jugadores disponibles.</p>
              )}
            </div>

            {picker === 'cambio' && cambioOutId && (
              <div className="p-3 border-t border-gray-100 shrink-0">
                <button
                  onClick={() => setCambioOutId(null)}
                  className="w-full py-2 text-xs font-bold text-gray-500 hover:text-gray-700"
                >
                  Cambiar saliente
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ===== Modal edición de evento ===== */}
      {editingEvent && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/55 p-0 sm:p-4"
          onClick={() => setEditId(null)}
        >
          <div
            className="w-full sm:max-w-md bg-white rounded-t-3xl sm:rounded-2xl shadow-2xl"
            onClick={e => e.stopPropagation()}
          >
            <div className="p-4 border-b border-gray-150 flex items-center justify-between">
              <h3 className="font-bold text-sm text-gray-900 flex items-center gap-2">
                <Pencil className="w-4 h-4 text-orange-500" />
                Editar evento
              </h3>
              <button onClick={() => setEditId(null)} className="text-gray-400 hover:text-gray-600 text-xs font-bold px-2 py-1">
                ✕
              </button>
            </div>

            <div className="p-4 space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Minuto</label>
                  <input
                    type="text"
                    value={editDraft.minuto}
                    onChange={e => setEditDraft(prev => ({ ...prev, minuto: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-orange-500 focus:outline-none"
                    placeholder="ej: 23 o 90+2"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Tipo</label>
                  <select
                    value={editDraft.tipo}
                    onChange={e =>
                      setEditDraft(prev => ({
                        ...prev,
                        tipo: e.target.value as TipoEvento,
                        extra:
                          e.target.value === 'tarjeta'
                            ? prev.extra === 'roja'
                              ? 'roja'
                              : 'amarilla'
                            : prev.extra
                      }))
                    }
                    className="w-full px-2.5 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-orange-500 focus:outline-none"
                  >
                    <option value="gol">Gol</option>
                    <option value="gol_contra">Gol en contra</option>
                    <option value="asistencia">Asistencia</option>
                    <option value="tarjeta">Tarjeta</option>
                    <option value="cambio">Cambio</option>
                    <option value="nota">Nota</option>
                    <option value="fase">Fase</option>
                  </select>
                </div>
              </div>

              {editDraft.tipo === 'tarjeta' && (
                <div>
                  <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Color</label>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setEditDraft(prev => ({ ...prev, extra: 'amarilla' }))}
                      className={`flex-1 py-2 rounded-lg text-xs font-bold border-2 ${
                        editDraft.extra !== 'roja'
                          ? 'bg-amber-100 border-amber-400 text-amber-900'
                          : 'bg-white border-gray-200 text-gray-600'
                      }`}
                    >
                      🟨 Amarilla
                    </button>
                    <button
                      type="button"
                      onClick={() => setEditDraft(prev => ({ ...prev, extra: 'roja' }))}
                      className={`flex-1 py-2 rounded-lg text-xs font-bold border-2 ${
                        editDraft.extra === 'roja'
                          ? 'bg-red-100 border-red-400 text-red-800'
                          : 'bg-white border-gray-200 text-gray-600'
                      }`}
                    >
                      🟥 Roja
                    </button>
                  </div>
                </div>
              )}

              <div>
                <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Descripción</label>
                <textarea
                  value={editDraft.texto}
                  onChange={e => setEditDraft(prev => ({ ...prev, texto: e.target.value }))}
                  rows={2}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-orange-500 focus:outline-none resize-none"
                />
              </div>
            </div>

            <div className="p-3 border-t border-gray-150 flex gap-2">
              <button
                onClick={deleteEdit}
                className="px-3 py-2.5 bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 rounded-xl text-xs font-bold flex items-center gap-1.5"
              >
                <Trash2 className="w-3.5 h-3.5" />
                Eliminar
              </button>
              <button
                onClick={() => setEditId(null)}
                className="flex-1 py-2.5 bg-white hover:bg-gray-50 text-gray-700 border border-gray-200 rounded-xl text-xs font-bold"
              >
                Cancelar
              </button>
              <button
                onClick={saveEdit}
                disabled={!editDraft.texto.trim()}
                className="flex-1 py-2.5 bg-orange-500 hover:bg-orange-600 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 disabled:opacity-40"
              >
                <Save className="w-3.5 h-3.5" />
                Guardar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ===== Confirmación Reiniciar ===== */}
      {confirmReset && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/55 p-0 sm:p-4"
          onClick={() => setConfirmReset(false)}
        >
          <div
            className="w-full sm:max-w-sm bg-white rounded-t-3xl sm:rounded-2xl shadow-2xl p-5 space-y-4"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-start gap-3">
              <span className="w-10 h-10 shrink-0 rounded-full bg-red-100 text-red-600 flex items-center justify-center">
                <RotateCcw className="w-5 h-5" />
              </span>
              <div className="min-w-0">
                <h3 className="font-bold text-sm text-gray-900">¿Reiniciar el partido?</h3>
                <p className="text-xs text-gray-500 mt-1">
                  Se borrará el cronómetro, las fases y todos los eventos. El partido volverá a
                  «Sin comenzar». Esta acción no se puede deshacer.
                </p>
              </div>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setConfirmReset(false)}
                className="flex-1 py-2.5 bg-white hover:bg-gray-50 text-gray-700 border border-gray-200 rounded-xl text-sm font-bold"
              >
                Cancelar
              </button>
              <button
                onClick={handleReiniciar}
                className="flex-1 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-xl text-sm font-black flex items-center justify-center gap-1.5"
              >
                <RotateCcw className="w-4 h-4" />
                Sí, reiniciar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
