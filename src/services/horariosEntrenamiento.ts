import { apiClient } from './apiClient';
import { HorarioEntrenamiento } from '../types';

const SHEET_NAME = 'horarios_entrenamiento';

/**
 * Horarios habituales por equipo (días de la semana + hora).
 * Si la tabla aún no existe en Supabase, apiClient usa el almacenamiento local
 * del dispositivo, así la función sigue siendo utilizable.
 */
export const horariosEntrenamientoService = {
  getAll: async (): Promise<HorarioEntrenamiento[]> => {
    const rows = await apiClient.getAll<HorarioEntrenamiento>(SHEET_NAME);
    return rows.map(row => ({
      ...row,
      dias: Array.isArray(row.dias) ? row.dias.map(Number).filter(n => n >= 0 && n <= 6) : []
    }));
  },

  create: async (horario: Omit<HorarioEntrenamiento, 'id'> & { id?: string }): Promise<HorarioEntrenamiento> =>
    apiClient.create<HorarioEntrenamiento>(SHEET_NAME, horario),

  update: async (horario: HorarioEntrenamiento): Promise<HorarioEntrenamiento> =>
    apiClient.update<HorarioEntrenamiento>(SHEET_NAME, horario),

  delete: async (id: string): Promise<boolean> => apiClient.delete(SHEET_NAME, id)
};
