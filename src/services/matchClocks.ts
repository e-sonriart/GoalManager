import { getSupabase } from './supabaseClient';
import { MatchClock } from '../utils/matchClock';

const TABLE = 'match_clocks';

export interface MatchClockRow {
  id: string; // partidoId
  clock: MatchClock | string;
  updated_at?: string;
}

const parseClock = (value: unknown): MatchClock | null => {
  if (!value) return null;
  if (typeof value === 'string') {
    try {
      return JSON.parse(value) as MatchClock;
    } catch {
      return null;
    }
  }
  if (typeof value === 'object') return value as MatchClock;
  return null;
};

/** Guarda el reloj en Supabase (fire-and-forget). */
export async function saveClockRemote(partidoId: string, clock: MatchClock): Promise<void> {
  const supabase = getSupabase();
  if (!supabase) return;
  try {
    const { error } = await supabase
      .from(TABLE)
      .upsert(
        {
          id: partidoId,
          clock: JSON.stringify(clock),
          updated_at: new Date().toISOString()
        },
        { onConflict: 'id' }
      );
    if (error) throw error;
  } catch (err) {
    console.warn('[matchClocks] Error al guardar reloj en Supabase', err);
  }
}

/** Carga el reloj remoto; null si no existe o error. */
export async function loadClockRemote(partidoId: string): Promise<MatchClock | null> {
  const supabase = getSupabase();
  if (!supabase) return null;
  try {
    const { data, error } = await supabase
      .from(TABLE)
      .select('clock, updated_at')
      .eq('id', partidoId)
      .maybeSingle();
    if (error) throw error;
    if (!data) return null;
    return parseClock(data.clock);
  } catch (err) {
    console.warn('[matchClocks] Error al cargar reloj de Supabase', err);
    return null;
  }
}

/** Combina local y remoto: gana el que tenga más eventos (o local si empate). */
export function mergeClocks(
  local: MatchClock,
  remote: MatchClock | null
): MatchClock | null {
  if (!remote) return null;
  const localEvents = Array.isArray(local.events) ? local.events.length : 0;
  const remoteEvents = Array.isArray(remote.events) ? remote.events.length : 0;
  if (remoteEvents > localEvents) return remote;
  return null;
}

/** Todos los relojes remotos indexados por partidoId (para resúmenes/estadísticas). */
export async function listClocksRemote(): Promise<Map<string, MatchClock>> {
  const out = new Map<string, MatchClock>();
  const supabase = getSupabase();
  if (!supabase) return out;
  try {
    const { data, error } = await supabase.from(TABLE).select('id, clock');
    if (error) throw error;
    for (const row of data || []) {
      const clock = parseClock(row.clock);
      if (clock) out.set(row.id, clock);
    }
  } catch (err) {
    console.warn('[matchClocks] Error al listar relojes de Supabase', err);
  }
  return out;
}
