import { apiClient } from './apiClient';
import { Asistencia } from '../types';

const SHEET_NAME = 'asistencias';

export const asistenciasService = {
  getAll: async (): Promise<Asistencia[]> => {
    return apiClient.getAll<Asistencia>(SHEET_NAME);
  },

  create: async (asistencia: Omit<Asistencia, 'id'> & { id?: string }): Promise<Asistencia> => {
    return apiClient.create<Asistencia>(SHEET_NAME, asistencia);
  },

  update: async (asistencia: Asistencia): Promise<Asistencia> => {
    return apiClient.update<Asistencia>(SHEET_NAME, asistencia);
  },

  delete: async (id: string): Promise<boolean> => {
    return apiClient.delete<Asistencia>(SHEET_NAME, id);
  }
};
