import {
  initialCategorias,
  initialEntrenadores,
  initialEquipos,
  initialJugadores,
  initialEstadisticas,
  initialPartidos,
  initialAsistencias,
  initialSesiones,
  initialUsuarios
} from '../data/initialData';
import { getSupabase, getSupabaseUrl, getSupabaseAnonKey } from './supabaseClient';

const LOCAL_STORAGE_PREFIX = 'cf_data_';
const GAS_URL_KEY = 'cf_gas_script_url';

export const getGasUrl = (): string => {
  return localStorage.getItem(GAS_URL_KEY) || (import.meta.env.VITE_GOOGLE_APPS_SCRIPT_URL as string) || '';
};

export const setGasUrl = (url: string): void => {
  localStorage.setItem(GAS_URL_KEY, url.trim());
};

// Inicializa el almacenamiento local con datos por defecto si no existen
export const initializeLocalStoreIfEmpty = (): void => {
  const seeds: Record<string, unknown[]> = {
    categorias: initialCategorias,
    entrenadores: initialEntrenadores,
    equipos: initialEquipos,
    jugadores: initialJugadores,
    estadisticas: initialEstadisticas,
    partidos: initialPartidos,
    asistencias: initialAsistencias,
    sesiones: initialSesiones,
    usuarios: initialUsuarios
  };

  Object.entries(seeds).forEach(([sheet, data]) => {
    const key = LOCAL_STORAGE_PREFIX + sheet;
    const existing = localStorage.getItem(key);
    if (!existing) {
      localStorage.setItem(key, JSON.stringify(data));
    } else if (sheet === 'equipos') {
      try {
        const parsed = JSON.parse(existing);
        if (Array.isArray(parsed)) {
          let updated = false;
          const merged = parsed.map(item => {
            let changed = false;
            let letra = item.letra;
            let nombre = item.nombre || '';
            let categoria = item.categoria || 'Senior';
            let ano = item.ano;

            // Migrar nombres antiguos
            if (nombre === 'Club Naranja Principal') {
              nombre = 'Senior A';
              categoria = 'Senior';
              letra = 'A';
              changed = true;
            } else if (nombre === 'Promesas FC') {
              nombre = 'Juvenil A';
              categoria = 'Juvenil';
              letra = 'A';
              changed = true;
            } else if (nombre === 'Féminas CF') {
              nombre = 'Cadete A';
              categoria = 'Cadete';
              letra = 'A';
              changed = true;
            } else if (nombre === 'Naranja B') {
              nombre = 'Benjamín B';
              categoria = 'Benjamín';
              letra = 'B';
              changed = true;
            }

            if (!letra) {
              const match = nombre.match(/\s+([A-Za-z])$/);
              letra = match ? match[1].toUpperCase() : 'A';
              changed = true;
            }

            const isF7 = categoria.toLowerCase().includes('alev') ||
              categoria.toLowerCase().includes('benj') ||
              categoria.toLowerCase().includes('preb') ||
              categoria.toLowerCase().includes('f7') ||
              categoria.toLowerCase().includes('f8');

            if (isF7 && !ano) {
              ano = '1er año';
              changed = true;
            }

            if (!item.escudo) {
              const seedMatch = initialEquipos.find(se => se.id === item.id || se.nombre === nombre);
              if (seedMatch?.escudo) {
                item.escudo = seedMatch.escudo;
                changed = true;
              }
            }

            if (changed) {
              updated = true;
              return { ...item, nombre, categoria, letra, ano, escudo: item.escudo };
            }
            return item;
          });
          if (updated) {
            localStorage.setItem(key, JSON.stringify(merged));
          }
        }
      } catch {
        // ignore parse error
      }
    } else if (sheet === 'partidos') {
      try {
        const parsed = JSON.parse(existing);
        if (Array.isArray(parsed)) {
          let updated = false;
          const merged = parsed.map(item => {
            let changed = false;
            let equipo = item.equipo || 'Senior A';
            let local = item.local || '';
            let visitante = item.visitante || '';
            let condicion = item.condicion;
            let rival = item.rival;

            if (equipo === 'Club Naranja Principal') {
              equipo = 'Senior A';
              changed = true;
            }
            if (local === 'Club Naranja Principal') {
              local = 'Senior A';
              changed = true;
            }
            if (visitante === 'Club Naranja Principal') {
              visitante = 'Senior A';
              changed = true;
            }

            if (!condicion) {
              if (local === equipo) {
                condicion = 'casa';
                rival = rival || visitante;
              } else {
                condicion = 'fuera';
                rival = rival || local;
              }
              changed = true;
            }

            if (!rival) {
              rival = condicion === 'casa' ? visitante : local;
              changed = true;
            }

            if (changed) {
              updated = true;
              return { ...item, equipo, local, visitante, condicion, rival };
            }
            return item;
          });
          if (updated) {
            localStorage.setItem(key, JSON.stringify(merged));
          }
        }
      } catch {
        // ignore parse error
      }
    } else if (sheet === 'categorias') {
      try {
        const parsed = JSON.parse(existing);
        if (Array.isArray(parsed)) {
          let updated = false;
          const merged = parsed.map(item => {
            let changed = false;
            let tipo = item.tipo;
            let tiempojuego = item.tiempojuego || item.tiempoJuego;
            let nombre = item.nombre || '';

            if (nombre === 'Alevín A') {
              nombre = 'Alevín';
              changed = true;
            }
            if (nombre === 'Senior Masculino') {
              nombre = 'Senior';
              changed = true;
            }
            if (nombre === 'Juvenil A') {
              nombre = 'Juvenil';
              changed = true;
            }

            if (!tipo) {
              const lower = nombre.toLowerCase();
              tipo = lower.includes('alev') || lower.includes('benj') || lower.includes('preb') || lower.includes('f8') || lower.includes('f7')
                ? 'F8'
                : 'F11';
              changed = true;
            }
            if (tipo === 'F7') {
              tipo = 'F8';
              changed = true;
            }
            if (!tiempojuego) {
              tiempojuego = tipo === 'F8' ? 30 : 45;
              changed = true;
            }
            if (changed) {
              updated = true;
              return { ...item, nombre, tipo, tiempojuego: Number(tiempojuego) };
            }
            return item;
          });
          if (updated) {
            localStorage.setItem(key, JSON.stringify(merged));
          }
        }
      } catch {
        // ignore parse error
      }
    }
  });
};

// Obtiene datos de la caché local
const getLocalData = <T>(sheet: string): T[] => {
  initializeLocalStoreIfEmpty();
  const raw = localStorage.getItem(LOCAL_STORAGE_PREFIX + sheet);
  if (!raw) return [];
  try {
    return JSON.parse(raw) as T[];
  } catch {
    return [];
  }
};

// Guarda datos en la caché local
const saveLocalData = <T>(sheet: string, items: T[]): void => {
  localStorage.setItem(LOCAL_STORAGE_PREFIX + sheet, JSON.stringify(items));
};

// Normaliza arrays JSON (Supabase devuelve jsonb como string a veces)
const parseJsonField = <T>(value: unknown): T => {
  if (typeof value === 'string') {
    try {
      return JSON.parse(value) as T;
    } catch {
      return value as unknown as T;
    }
  }
  return value as T;
};

const normalizeRow = <T>(sheet: string, row: Record<string, unknown>): T => {
  const item = { ...row } as Record<string, unknown>;
  if (sheet === 'partidos') {
    if ('convocados' in item) item.convocados = parseJsonField<string[]>(item.convocados) || [];
    if ('titulares' in item) item.titulares = parseJsonField<string[]>(item.titulares) || [];
    if ('golesLocal' in item && item.golesLocal != null) item.golesLocal = String(item.golesLocal);
    if ('golesVisitante' in item && item.golesVisitante != null) item.golesVisitante = String(item.golesVisitante);
  }
  if (sheet === 'equipos' && 'entrenadores' in item) {
    item.entrenadores = parseJsonField<string[]>(item.entrenadores) || [];
  }
  if (sheet === 'estadisticas') {
    item.goles = Number(item.goles) || 0;
    item.asistencias = Number(item.asistencias) || 0;
    item.tarjetas = Number(item.tarjetas) || 0;
    item.tarjetasAmarillas = Number(item.tarjetasAmarillas) || 0;
    item.tarjetasRojas = Number(item.tarjetasRojas) || 0;
    item.partidosJugados = Number(item.partidosJugados) || 0;
    item.titular = Number(item.titular) || 0;
    if ('historico' in item) item.historico = parseJsonField(item.historico) || [];
  }
  if (sheet === 'categorias') {
    item.tiempojuego = Number(item.tiempojuego ?? item.tiempoJuego) || (String(item.tipo || '').toUpperCase() === 'F8' ? 30 : 45);
    item.tiempoJuego = item.tiempojuego;
  }
  if (sheet === 'jugadores' && 'dorsal' in item && item.dorsal != null) {
    const n = Number(item.dorsal);
    item.dorsal = Number.isNaN(n) ? String(item.dorsal) : n;
  }
  return item as T;
};

const prepareRow = <T>(sheet: string, item: Partial<T>): Record<string, unknown> => {
  const row: Record<string, unknown> = { ...(item as Record<string, unknown>) };
  delete row.created_at;
  delete row.updated_at;
  if (sheet === 'partidos') {
    if ('convocados' in row) row.convocados = JSON.stringify(row.convocados ?? []);
    if ('titulares' in row) row.titulares = JSON.stringify(row.titulares ?? []);
  }
  if (sheet === 'equipos' && 'entrenadores' in row) {
    row.entrenadores = JSON.stringify(row.entrenadores ?? []);
  }
  if (sheet === 'estadisticas' && 'historico' in row) {
    row.historico = JSON.stringify(row.historico ?? []);
  }
  return row;
};

const SHEETS = [
  'categorias', 'entrenadores', 'equipos', 'jugadores',
  'estadisticas', 'partidos', 'asistencias', 'sesiones', 'usuarios',
  'club_config'
] as const;

const SEEDS: Record<string, unknown[]> = {
  categorias: initialCategorias,
  entrenadores: initialEntrenadores,
  equipos: initialEquipos,
  jugadores: initialJugadores,
  estadisticas: initialEstadisticas,
  partidos: initialPartidos,
  asistencias: initialAsistencias,
  sesiones: initialSesiones,
  usuarios: initialUsuarios
};

// Si la tabla remota está vacía, sube los datos seed a Supabase
const seedRemoteIfEmpty = async <T extends { id?: string }>(
  sheet: string,
  supabase: NonNullable<ReturnType<typeof getSupabase>>
): Promise<T[]> => {
  const seeds = (SEEDS[sheet] || []) as T[];
  if (!seeds.length) return [];
  try {
    const rows = seeds.map(item => prepareRow<T>(sheet, item as Partial<T>));
    const { error } = await supabase.from(sheet).insert(rows);
    if (error) throw error;
    const finalData = seeds.map(item => normalizeRow<T>(sheet, item as unknown as Record<string, unknown>));
    saveLocalData(sheet, finalData);
    return finalData;
  } catch (err) {
    console.warn(`[apiClient] Error al sembrar "${sheet}" en Supabase. Usando datos locales.`, err);
    return seeds.map(item => normalizeRow<T>(sheet, item as unknown as Record<string, unknown>));
  }
};

/**
 * Cliente de datos: Supabase (principal) + localStorage (caché offline).
 * Si no hay Supabase configurado, funciona solo con localStorage.
 */
export const apiClient = {
  async getAll<T extends { id?: string }>(sheet: string): Promise<T[]> {
    const supabase = getSupabase();
    if (!supabase) {
      return getLocalData<T>(sheet);
    }

    try {
      const { data, error } = await supabase.from(sheet).select('*');
      if (error) throw error;
      if (Array.isArray(data)) {
        if (data.length === 0) {
          return seedRemoteIfEmpty<T>(sheet, supabase);
        }
        const finalData = data.map(row => normalizeRow<T>(sheet, row as Record<string, unknown>));
        saveLocalData(sheet, finalData);
        return finalData;
      }
      return getLocalData<T>(sheet);
    } catch (err) {
      console.warn(`[apiClient] Error al consultar Supabase para "${sheet}". Usando almacenamiento local.`, err);
      return getLocalData<T>(sheet);
    }
  },

  async create<T extends { id?: string }>(sheet: string, item: Partial<T>): Promise<T> {
    const newItem = {
      ...item,
      id: item.id || `${sheet.substring(0, 3)}_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 5)}`
    } as T;

    // Actualizar localmente de inmediato para reactividad instantánea
    const currentList = getLocalData<T>(sheet);
    saveLocalData(sheet, [...currentList, newItem]);

    const supabase = getSupabase();
    if (supabase) {
      try {
        const row = prepareRow<T>(sheet, newItem as Partial<T>);
        const { error } = await supabase.from(sheet).upsert(row, { onConflict: 'id' });
        if (error) throw error;
      } catch (err) {
        console.warn(`[apiClient] Error al sincronizar creación en Supabase (${sheet})`, err);
      }
    }

    return newItem;
  },

  async update<T extends { id: string }>(sheet: string, item: Partial<T> & { id: string }): Promise<T> {
    const currentList = getLocalData<T>(sheet);
    const index = currentList.findIndex((it) => String(it.id) === String(item.id));
    let updatedItem: T;

    if (index >= 0) {
      updatedItem = { ...currentList[index], ...item } as T;
      currentList[index] = updatedItem;
      saveLocalData(sheet, currentList);
    } else {
      updatedItem = item as T;
      saveLocalData(sheet, [...currentList, updatedItem]);
    }

    const supabase = getSupabase();
    if (supabase) {
      try {
        const row = prepareRow<T>(sheet, updatedItem as Partial<T>);
        const { error } = await supabase.from(sheet).upsert(row, { onConflict: 'id' });
        if (error) throw error;
      } catch (err) {
        console.warn(`[apiClient] Error al sincronizar actualización en Supabase (${sheet})`, err);
      }
    }

    return updatedItem;
  },

  async delete<T extends { id: string }>(sheet: string, id: string): Promise<boolean> {
    const currentList = getLocalData<T>(sheet);
    const filtered = currentList.filter((it) => String(it.id) !== String(id));
    saveLocalData(sheet, filtered);

    const supabase = getSupabase();
    if (supabase) {
      try {
        const { error } = await supabase.from(sheet).delete().eq('id', id);
        if (error) throw error;
      } catch (err) {
        console.warn(`[apiClient] Error al eliminar registro en Supabase (${sheet})`, err);
      }
    }

    return true;
  },

  /**
   * Verifica la conectividad con Supabase
   */
  async testConnection(targetUrl?: string): Promise<{ success: boolean; message: string }> {
    const url = targetUrl?.trim() || getSupabaseUrl();
    const key = getSupabaseAnonKey();
    if (!url || !key) {
      return { success: false, message: 'No se ha configurado Supabase (URL o anon key).' };
    }

    try {
      const endpoint = `${url.replace(/\/$/, '')}/rest/v1/categorias?select=id&limit=1`;
      const res = await fetch(endpoint, {
        method: 'GET',
        headers: {
          'apikey': key,
          'Authorization': `Bearer ${key}`
        }
      });

      if (!res.ok) {
        return { success: false, message: `Error de servidor HTTP: ${res.status} ${res.statusText}` };
      }

      return { success: true, message: '¡Conexión establecida con Supabase!' };
    } catch {
      return {
        success: false,
        message: 'No se pudo conectar con Supabase. Verifica la URL y la anon key.'
      };
    }
  },

  /**
   * Verifica que existan las tablas (lsquema básico)
   */
  async initRemoteDatabase(): Promise<{ success: boolean; message: string }> {
    const supabase = getSupabase();
    if (!supabase) {
      return { success: false, message: 'Primero configura Supabase (URL y anon key).' };
    }

    try {
      const missing: string[] = [];
      for (const sheet of SHEETS) {
        const { error } = await supabase.from(sheet).select('id').limit(1);
        if (error) missing.push(sheet);
      }
      if (missing.length) {
        return {
          success: false,
          message: `Faltan tablas en Supabase: ${missing.join(', ')}. Ejecuta el SQL de creación en el SQL Editor.`
        };
      }
      return { success: true, message: 'Supabase conectado. Todas las tablas existen.' };
    } catch (err) {
      return { success: false, message: 'Error al verificar Supabase: ' + (err as Error).message };
    }
  },

  /**
   * Reinicia la base de datos local con datos de demostración
   */
  resetLocalDatabase(): void {
    const keys = [
      'categorias', 'entrenadores', 'equipos', 'jugadores',
      'estadisticas', 'partidos', 'convocatorias', 'asistencias',
      'sesiones', 'apuestas', 'usuarios'
    ];
    keys.forEach(k => localStorage.removeItem(LOCAL_STORAGE_PREFIX + k));
    initializeLocalStoreIfEmpty();
  }
};
