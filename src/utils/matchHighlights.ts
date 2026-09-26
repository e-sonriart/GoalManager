import { loadClock, type MatchClock, type MatchEvent, type TipoEvento } from './matchClock';
import type { Jugador } from '../types';

/** Tipos que se muestran como acción destacada bajo el resultado */
export const HIGHLIGHT_TIPOS: TipoEvento[] = ['gol', 'gol_contra', 'asistencia', 'tarjeta'];

const LABEL_TO_TIPO: Record<string, TipoEvento> = {
  Gol: 'gol',
  'Gol en contra': 'gol_contra',
  Asistencia: 'asistencia',
  Tarjeta: 'tarjeta',
  Cambio: 'cambio',
  Nota: 'nota',
  Fase: 'fase'
};

export const minutoNum = (m: string): number => {
  const n = Number(String(m).replace('+', '.'));
  return Number.isFinite(n) ? n : Number.MAX_SAFE_INTEGER;
};

/** Ordena por minuto cronológico (45+3 → 45.3) */
export function sortHighlights(events: MatchEvent[]): MatchEvent[] {
  return [...events].sort((a, b) => minutoNum(a.minuto) - minutoNum(b.minuto));
}

/** Solo goles / asistencias / tarjetas, en orden cronológico */
export function highlightEvents(events: MatchEvent[]): MatchEvent[] {
  return sortHighlights((events || []).filter(e => HIGHLIGHT_TIPOS.includes(e.tipo)));
}

/** Reconstruye eventos desde el resumen de texto de partido.eventos (fallback sin reloj estructurado) */
export function parseSummaryEvents(summary?: string): MatchEvent[] {
  if (!summary || typeof summary !== 'string') return [];
  const out: MatchEvent[] = [];
  for (const seg of summary.split(' | ')) {
    const m = seg.match(
      /^(\d+(?:\+\d+)?)' ([^:()]+?)(?: \(([^)]+)\))?: (.+?)(?: \[\d{1,2}:\d{2}(?::\d{2})?\])?$/
    );
    if (!m) continue;
    const tipo = LABEL_TO_TIPO[m[2].trim()] || 'nota';
    out.push({
      id: `sum_${out.length}_${m[1]}`,
      minuto: m[1],
      tipo,
      extra: m[3],
      texto: m[4]
    });
  }
  return out;
}

/**
 * Resuelve a qué jugador pertenece un evento. Los relojes guardan jugadorId;
 * los eventos reconstruidos desde el resumen de texto se atribuyen por «#dorsal + nombre».
 */
export function attributeJugadorId(
  event: MatchEvent,
  roster: Jugador[],
  allJugadores: Jugador[]
): string | undefined {
  if (event.jugadorId) return event.jugadorId;
  if (event.tipo !== 'gol' && event.tipo !== 'asistencia' && event.tipo !== 'tarjeta') {
    return undefined;
  }
  const m = event.texto.match(/#(\d+)\s+(.+)/);
  if (!m) return undefined;
  const dorsal = m[1];
  const rest = m[2].toLowerCase();
  const pool = roster.length > 0 ? roster : allJugadores;
  const found = pool.find(
    j => String(j.dorsal) === dorsal && rest.includes(String(j.nombre).toLowerCase())
  );
  return found?.id;
}

export const idList = (v: unknown): string[] => {
  if (!v) return [];
  if (Array.isArray(v)) return v.filter(Boolean) as string[];
  if (typeof v === 'string') {
    try {
      const parsed = JSON.parse(v);
      return Array.isArray(parsed) ? parsed.filter(Boolean) : [];
    } catch {
      return [];
    }
  }
  return [];
};

/** Convocados + titulares de un partido resueltos a jugadores (acepta array o JSON) */
export function rosterForPartido(
  partido: { convocados?: unknown; titulares?: unknown },
  jugadores: Jugador[]
): Jugador[] {
  const ids = new Set([...idList(partido.convocados), ...idList(partido.titulares)]);
  const byId = new Map(jugadores.map(j => [j.id, j]));
  return [...ids]
    .map(id => byId.get(id))
    .filter((j): j is Jugador => Boolean(j));
}

/**
 * Eventos de un partido: el reloj con más eventos (local o remoto) o, en su
 * defecto, el resumen de texto guardado en partido.eventos.
 */
export function eventsForPartido(
  partido: { id: string; finalizado?: boolean | string; eventos?: string },
  remoteClocks: Map<string, MatchClock>
): MatchEvent[] {
  const local = loadClock(partido.id, Boolean(partido.finalizado)).events || [];
  const remote = remoteClocks.get(partido.id)?.events || [];
  const base = remote.length > local.length ? remote : local;
  if (base.length > 0) return base;
  return parseSummaryEvents(partido.eventos);
}
