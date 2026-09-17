import {
  initialCategorias,
  initialEntrenadores,
  initialEquipos,
  initialJugadores,
  initialEstadisticas,
  initialPartidos,
  initialAsistencias,
  initialUsuarios
} from '../data/initialData';

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

/**
 * Cliente API para Google Apps Script
 * Utiliza Content-Type text/plain para evitar bloqueos por preflight CORS en Apps Script
 */
export const apiClient = {
  /**
   * Obtiene todos los registros de una hoja
   */
  async getAll<T extends { id?: string }>(sheet: string): Promise<T[]> {
    const url = getGasUrl();
    if (!url) {
      return getLocalData<T>(sheet);
    }

    try {
      const endpoint = `${url}?action=getAll&sheet=${encodeURIComponent(sheet)}&t=${Date.now()}`;
      const response = await fetch(endpoint, {
        method: 'GET',
        headers: { 'Accept': 'application/json' },
        redirect: 'follow'
      });

      if (!response.ok) {
        throw new Error(`HTTP error ${response.status}`);
      }

      const result = await response.json();
      if (result && result.success && Array.isArray(result.data)) {
        let finalData = result.data;
        if (sheet === 'categorias') {
          finalData = result.data.map((c: Record<string, unknown>) => ({
            ...c,
            tipo: c.tipo || (String(c.nombre || '').toLowerCase().includes('f8') || String(c.nombre || '').toLowerCase().includes('alev') || String(c.nombre || '').toLowerCase().includes('benj') ? 'F8' : 'F11'),
            tiempojuego: Number(c.tiempojuego || c.tiempoJuego || 45)
          }));
        }
        // Actualizar caché local
        saveLocalData(sheet, finalData);
        return finalData as T[];
      }
      return getLocalData<T>(sheet);
    } catch (err) {
      console.warn(`[apiClient] Error al consultar Google Apps Script para "${sheet}". Usando almacenamiento local.`, err);
      return getLocalData<T>(sheet);
    }
  },

  /**
   * Crea un nuevo registro en la hoja indicada
   */
  async create<T extends { id?: string }>(sheet: string, item: Partial<T>): Promise<T> {
    const newItem = {
      ...item,
      id: item.id || `${sheet.substring(0, 3)}_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 5)}`
    } as T;

    // Actualizar localmente de inmediato para reactividad instantánea
    const currentList = getLocalData<T>(sheet);
    saveLocalData(sheet, [...currentList, newItem]);

    const url = getGasUrl();
    if (url) {
      try {
        await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'text/plain;charset=utf-8' },
          body: JSON.stringify({
            action: 'create',
            sheet,
            data: newItem
          }),
          redirect: 'follow'
        });
      } catch (err) {
        console.warn(`[apiClient] Error al sincronizar creación en Google Apps Script (${sheet})`, err);
      }
    }

    return newItem;
  },

  /**
   * Actualiza un registro existente
   */
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

    const url = getGasUrl();
    if (url) {
      try {
        await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'text/plain;charset=utf-8' },
          body: JSON.stringify({
            action: 'update',
            sheet,
            id: item.id,
            data: updatedItem
          }),
          redirect: 'follow'
        });
      } catch (err) {
        console.warn(`[apiClient] Error al sincronizar actualización en Google Apps Script (${sheet})`, err);
      }
    }

    return updatedItem;
  },

  /**
   * Elimina un registro por ID
   */
  async delete<T extends { id: string }>(sheet: string, id: string): Promise<boolean> {
    const currentList = getLocalData<T>(sheet);
    const filtered = currentList.filter((it) => String(it.id) !== String(id));
    saveLocalData(sheet, filtered);

    const url = getGasUrl();
    if (url) {
      try {
        await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'text/plain;charset=utf-8' },
          body: JSON.stringify({
            action: 'delete',
            sheet,
            id
          }),
          redirect: 'follow'
        });
      } catch (err) {
        console.warn(`[apiClient] Error al eliminar registro en Google Apps Script (${sheet})`, err);
      }
    }

    return true;
  },

  /**
   * Verifica la conectividad con el script de Google Apps Script
   */
  async testConnection(targetUrl?: string): Promise<{ success: boolean; message: string }> {
    const url = targetUrl || getGasUrl();
    if (!url) {
      return { success: false, message: 'No se ha configurado ninguna URL de Google Apps Script.' };
    }

    try {
      const pingUrl = `${url}?action=ping&t=${Date.now()}`;
      const res = await fetch(pingUrl, {
        method: 'GET',
        redirect: 'follow'
      });

      if (!res.ok) {
        return { success: false, message: `Error de servidor HTTP: ${res.status} ${res.statusText}` };
      }

      const data = await res.json();
      if (data && data.success) {
        return { success: true, message: '¡Conexión establecida con éxito con Google Apps Script!' };
      }
      return { success: false, message: data.error || 'Respuesta inválida recibida del script.' };
    } catch (err) {
      return {
        success: false,
        message: 'No se pudo conectar con el script. Verifica que la implementación web tenga acceso para "Cualquier usuario" (Anyone).'
      };
    }
  },

  /**
   * Pide al script que genere las 10 hojas con datos de prueba
   */
  async initRemoteDatabase(): Promise<{ success: boolean; message: string }> {
    const url = getGasUrl();
    if (!url) {
      return { success: false, message: 'Primero introduce la URL de Google Apps Script.' };
    }

    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify({ action: 'initDatabase' }),
        redirect: 'follow'
      });
      const data = await res.json();
      return { success: true, message: data.message || 'Hojas creadas correctamente en Google Sheets.' };
    } catch (err) {
      return { success: false, message: 'Error al inicializar hojas remotas: ' + (err as Error).message };
    }
  },

  /**
   * Reinicia la base de datos local con datos de demostración
   */
  resetLocalDatabase(): void {
    const keys = [
      'categorias', 'entrenadores', 'equipos', 'jugadores',
      'estadisticas', 'partidos', 'convocatorias', 'asistencias',
      'apuestas', 'usuarios'
    ];
    keys.forEach(k => localStorage.removeItem(LOCAL_STORAGE_PREFIX + k));
    initializeLocalStoreIfEmpty();
  }
};
