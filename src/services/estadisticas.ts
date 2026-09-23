import { apiClient } from './apiClient';
import { Estadistica } from '../types';

const SHEET_NAME = 'estadisticas';

const sanitize = (stats: Partial<Estadistica>): Partial<Estadistica> => ({
  ...stats,
  goles: Number(stats.goles) || 0,
  asistencias: Number(stats.asistencias) || 0,
  tarjetas: Number(stats.tarjetas) || 0,
  partidosJugados: Number(stats.partidosJugados) || 0,
  tarjetasAmarillas: Number(stats.tarjetasAmarillas) || 0,
  tarjetasRojas: Number(stats.tarjetasRojas) || 0,
  titular: Number(stats.titular) || 0
});

export const estadisticasService = {
  getAll: async (): Promise<Estadistica[]> => {
    const raw = await apiClient.getAll<Estadistica>(SHEET_NAME);
    return raw.map(item => ({
      ...item,
      goles: Number(item.goles) || 0,
      asistencias: Number(item.asistencias) || 0,
      tarjetas: Number(item.tarjetas) || 0,
      partidosJugados: Number(item.partidosJugados) || 0,
      tarjetasAmarillas: Number(item.tarjetasAmarillas) || 0,
      tarjetasRojas: Number(item.tarjetasRojas) || 0,
      titular: Number(item.titular) || 0
    }));
  },

  create: async (estadistica: Omit<Estadistica, 'id'> & { id?: string }): Promise<Estadistica> => {
    return apiClient.create<Estadistica>(SHEET_NAME, sanitize(estadistica) as Estadistica);
  },

  update: async (estadistica: Estadistica): Promise<Estadistica> => {
    return apiClient.update<Estadistica>(SHEET_NAME, sanitize(estadistica) as Estadistica);
  },

  delete: async (id: string): Promise<boolean> => {
    return apiClient.delete<Estadistica>(SHEET_NAME, id);
  }
};
