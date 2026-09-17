import { apiClient } from './apiClient';
import { Partido } from '../types';

const SHEET_NAME = 'partidos';

export const partidosService = {
  getAll: async (): Promise<Partido[]> => {
    return apiClient.getAll<Partido>(SHEET_NAME);
  },

  create: async (partido: Omit<Partido, 'id'> & { id?: string }): Promise<Partido> => {
    return apiClient.create<Partido>(SHEET_NAME, partido);
  },

  update: async (partido: Partido): Promise<Partido> => {
    return apiClient.update<Partido>(SHEET_NAME, partido);
  },

  delete: async (id: string): Promise<boolean> => {
    return apiClient.delete<Partido>(SHEET_NAME, id);
  }
};
