export type Fase = 'pre' | 'p1' | 'medio' | 'p2' | 'fin';

export type TipoEvento = 'gol' | 'gol_contra' | 'asistencia' | 'tarjeta' | 'cambio' | 'nota' | 'fase';

export interface MatchEvent {
  id: string;
  minuto: string;
  tipo: TipoEvento;
  texto: string;
  extra?: string;
  jugadorId?: string;
  hora?: string;
}

/**
 * Reloj por tramo (1ª / descanso / 2ª) con tiempo de pared:
 * elapsed = accumulatedMs + (running ? now - startedAtMs : 0)
 * Sigue corriendo aunque se cierre sesión o se desmonte la vista.
 */
export interface MatchClock {
  running: boolean;
  accumulatedMs: number;
  startedAtMs: number | null;
  fase: Fase;
  events: MatchEvent[];
}

export const FASE_LABEL: Record<Fase, string> = {
  pre: 'Sin comenzar',
  p1: '1ª parte',
  medio: 'Descanso',
  p2: '2ª parte',
  fin: 'Fin del partido'
};

export const FASE_ORDER: Fase[] = ['pre', 'p1', 'medio', 'p2', 'fin'];

export const CLOCK_PREFIX = 'cf_match_clock_';

export function clockKey(partidoId: string): string {
  return `${CLOCK_PREFIX}${partidoId}`;
}

export function emptyClock(finalizado?: boolean): MatchClock {
  return {
    running: false,
    accumulatedMs: 0,
    startedAtMs: null,
    fase: finalizado ? 'fin' : 'pre',
    events: []
  };
}

export function loadClock(partidoId: string, finalizado?: boolean): MatchClock {
  const empty = emptyClock(finalizado);
  try {
    const raw = localStorage.getItem(clockKey(partidoId));
    if (!raw) return empty;
    const data = JSON.parse(raw) as Partial<MatchClock>;
    const fase: Fase =
      data.fase && FASE_LABEL[data.fase] ? data.fase : empty.fase;
    if (finalizado) {
      return {
        running: false,
        accumulatedMs: Number(data.accumulatedMs) || 0,
        startedAtMs: null,
        fase: 'fin',
        events: Array.isArray(data.events) ? data.events : []
      };
    }
    return {
      running: Boolean(data.running) && fase !== 'pre' && fase !== 'fin',
      accumulatedMs: Number(data.accumulatedMs) || 0,
      startedAtMs:
        data.running && typeof data.startedAtMs === 'number'
          ? data.startedAtMs
          : null,
      fase,
      events: Array.isArray(data.events) ? data.events : []
    };
  } catch {
    return empty;
  }
}

export function saveClock(partidoId: string, clock: MatchClock): void {
  try {
    localStorage.setItem(clockKey(partidoId), JSON.stringify(clock));
    window.dispatchEvent(
      new CustomEvent('cf_match_clock_updated', {
        detail: { partidoId, clock }
      })
    );
  } catch {
    /* quota */
  }
}

/** ms transcurridos del tramo actual (de pared; no depende de la vista abierta) */
export function elapsedMsOf(clock: MatchClock, now: number = Date.now()): number {
  const base = clock.accumulatedMs;
  if (clock.running && clock.startedAtMs != null) {
    return base + Math.max(0, now - clock.startedAtMs);
  }
  return base;
}

export function fmtTime(totalSec: number): string {
  const s = Math.max(0, Math.floor(totalSec));
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return `${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
}

export function isClockActive(clock: MatchClock | null | undefined): boolean {
  if (!clock) return false;
  return clock.running || clock.fase === 'p1' || clock.fase === 'medio' || clock.fase === 'p2';
}

/** Minuto tipo 12 / 45+3 según fase y minutos por parte */
export function minuteLabelOf(
  clock: MatchClock,
  porParteMin: number,
  now: number = Date.now()
): string {
  const elapsed = Math.floor(elapsedMsOf(clock, now) / 1000);
  const porParteSec = porParteMin * 60;
  const overSec = Math.max(0, elapsed - porParteSec);
  const overMin = Math.floor(overSec / 60);
  if (clock.fase === 'pre') return '0';
  if (clock.fase === 'medio') return String(porParteMin);
  const mins = Math.floor(elapsed / 60);
  const over = elapsed >= porParteSec;
  const extra = Math.max(1, overMin);
  if (clock.fase === 'p1') {
    if (over && overMin > 0) return `${porParteMin}+${extra}`;
    if (over) return String(porParteMin);
    return String(mins);
  }
  if (over && overMin > 0) return `${porParteMin * 2}+${extra}`;
  if (over) return String(porParteMin * 2);
  return String(porParteMin + mins);
}

/** Marcador en vivo: base del partido + goles de eventos del reloj */
export function scoreFromClock(
  clock: MatchClock | null | undefined,
  baseLocal: number,
  baseVisit: number,
  esClubLocal: boolean
): { golLocal: number; golVisitante: number } {
  if (!clock) {
    return { golLocal: baseLocal, golVisitante: baseVisit };
  }
  const gClub = clock.events.filter(e => e.tipo === 'gol').length;
  const gRival = clock.events.filter(e => e.tipo === 'gol_contra').length;
  if (esClubLocal) {
    return { golLocal: baseLocal + gClub, golVisitante: baseVisit + gRival };
  }
  return { golLocal: baseLocal + gRival, golVisitante: baseVisit + gClub };
}

export function listClocks(): Array<{ partidoId: string; clock: MatchClock }> {
  const out: Array<{ partidoId: string; clock: MatchClock }> = [];
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (!key || !key.startsWith(CLOCK_PREFIX)) continue;
      const partidoId = key.slice(CLOCK_PREFIX.length);
      try {
        const clock = JSON.parse(localStorage.getItem(key) || '') as MatchClock;
        if (clock && typeof clock === 'object' && clock.fase) {
          out.push({ partidoId, clock });
        }
      } catch {
        /* skip */
      }
    }
  } catch {
    /* skip */
  }
  return out;
}
