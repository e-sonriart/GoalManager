import { apiClient } from './apiClient';
import { SesionEntrenamiento } from '../types';

const SHEET_NAME = 'sesiones';

export const sesionesService = {
  getAll: async (): Promise<SesionEntrenamiento[]> => {
    return apiClient.getAll<SesionEntrenamiento>(SHEET_NAME);
  },

  create: async (sesion: Omit<SesionEntrenamiento, 'id'> & { id?: string }): Promise<SesionEntrenamiento> => {
    return apiClient.create<SesionEntrenamiento>(SHEET_NAME, sesion);
  },

  update: async (sesion: SesionEntrenamiento): Promise<SesionEntrenamiento> => {
    return apiClient.update<SesionEntrenamiento>(SHEET_NAME, sesion);
  },

  delete: async (id: string): Promise<boolean> => {
    return apiClient.delete<SesionEntrenamiento>(SHEET_NAME, id);
  }
};