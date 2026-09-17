import { apiClient } from './apiClient';
import { Estadistica } from '../types';

const SHEET_NAME = 'estadisticas';

export const estadisticasService = {
  getAll: async (): Promise<Estadistica[]> => {
    const raw = await apiClient.getAll<Estadistica>(SHEET_NAME);
    // Asegurarse de que los valores numéricos sean números
    return raw.map(item => ({
      ...item,
      goles: Number(item.goles) || 0,
      asistencias: Number(item.asistencias) || 0,
      tarjetas: Number(item.tarjetas) || 0,
      partidosJugados: Number(item.partidosJugados) || 0
    }));
  },

  create: async (estadistica: Omit<Estadistica, 'id'> & { id?: string }): Promise<Estadistica> => {
    const sanitized = {
      ...estadistica,
      goles: Number(estadistica.goles) || 0,
      asistencias: Number(estadistica.asistencias) || 0,
      tarjetas: Number(estadistica.tarjetas) || 0,
      partidosJugados: Number(estadistica.partidosJugados) || 0
    };
    return apiClient.create<Estadistica>(SHEET_NAME, sanitized);
  },

  update: async (estadistica: Estadistica): Promise<Estadistica> => {
    const sanitized = {
      ...estadistica,
      goles: Number(estadistica.goles) || 0,
      asistencias: Number(estadistica.asistencias) || 0,
      tarjetas: Number(estadistica.tarjetas) || 0,
      partidosJugados: Number(estadistica.partidosJugados) || 0
    };
    return apiClient.update<Estadistica>(SHEET_NAME, sanitized);
  },

  delete: async (id: string): Promise<boolean> => {
    return apiClient.delete<Estadistica>(SHEET_NAME, id);
  }
};
