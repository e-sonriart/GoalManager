import { getSupabase } from './supabaseClient';

const TABLE = 'ffcv_equipos';
const CACHE_KEY = 'cf_ffcv_equipos';
const CACHE_TTL_MS = 24 * 60 * 60 * 1000;

/** Fila de la tabla `ffcv_equipos` (una fila por club + campo). */
export interface FfcvEquipo {
  id: string;
  club: string;
  escudo?: string | null;
  campo?: string | null;
  codigo_campo?: string | null;
  direccion?: string | null;
  localidad?: string | null;
  provincia?: string | null;
  cp?: string | null;
  lat?: number | null;
  lng?: number | null;
  codigo_club?: string | null;
  updated_at?: string | null;
}

interface CachePayload {
  ts: number;
  rows: FfcvEquipo[];
}

let memoria: FfcvEquipo[] | null = null;

const leerCache = (): CachePayload | null => {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as CachePayload;
    if (!parsed || !Array.isArray(parsed.rows) || !parsed.rows.length) return null;
    return parsed;
  } catch {
    return null;
  }
};

const escribirCache = (rows: FfcvEquipo[]): void => {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify({ ts: Date.now(), rows }));
  } catch {
    // sin espacio en localStorage: seguimos solo con memoria
  }
};

/**
 * Catálogo FFCV (club + escudo + campo con dirección y coordenadas).
 * Usa memoria > localStorage (< 24h) > Supabase; si la red falla, datos cacheados.
 */
export async function loadFfcvEquipos(force = false): Promise<FfcvEquipo[]> {
  if (memoria && !force) return memoria;

  const cache = leerCache();
  if (!force && cache && Date.now() - cache.ts < CACHE_TTL_MS) {
    memoria = cache.rows;
    return memoria;
  }

  const supabase = getSupabase();
  if (!supabase) {
    memoria = cache?.rows || [];
    return memoria;
  }

  try {
    const { data, error } = await supabase.from(TABLE).select('*').order('club');
    if (error) throw error;
    if (Array.isArray(data) && data.length) {
      memoria = data as FfcvEquipo[];
      escribirCache(memoria);
      return memoria;
    }
    memoria = cache?.rows || [];
    return memoria;
  } catch (err) {
    console.warn('[ffcvEquipos] No se pudo cargar la tabla ffcv_equipos. Usando caché local.', err);
    memoria = cache?.rows || [];
    return memoria;
  }
}

/** Normaliza para comparar sin acentos ni mayúsculas. */
export const norm = (value: string): string =>
  (value || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();

/** Ubicación legible para rellenar el campo del partido. */
export const ffcvUbicacion = (row: FfcvEquipo): string => {
  const dir = [row.direccion, row.localidad].filter(Boolean).join(', ');
  if (row.campo && dir) return `${row.campo} · ${dir}`;
  return row.campo || dir;
};

/**
 * Busca por nombre (club), campo o localidad. Todos los términos deben coincidir.
 * Orden: coincidencia exacta del club > empieza por > contiene > campo > localidad > dirección.
 */
export function searchFfcvEquipos(rows: FfcvEquipo[], query: string, limit = 60): FfcvEquipo[] {
  const q = norm(query);
  if (!q) {
    return [...rows]
      .sort((a, b) => (a.club || '').localeCompare(b.club || '', 'es'))
      .slice(0, limit);
  }
  const terms = q.split(/\s+/).filter(Boolean);

  const scored: { row: FfcvEquipo; score: number }[] = [];
  for (const row of rows) {
    const club = norm(row.club);
    const campo = norm(row.campo);
    const localidad = norm(row.localidad);
    const direccion = norm(row.direccion);
    const hay = `${club} ${campo} ${localidad} ${direccion}`;
    if (!terms.every(t => hay.includes(t))) continue;

    let score: number;
    if (club === q) score = 0;
    else if (club.startsWith(q)) score = 1;
    else if (club.includes(q)) score = 2;
    else if (campo.includes(q)) score = 3;
    else if (localidad.includes(q)) score = 4;
    else score = 5;

    scored.push({ row, score });
  }

  scored.sort(
    (a, b) => a.score - b.score || (a.row.club || '').localeCompare(b.row.club || '', 'es')
  );
  return scored.slice(0, limit).map(s => s.row);
}
