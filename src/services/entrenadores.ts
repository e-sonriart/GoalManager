import { apiClient } from './apiClient';
import { Entrenador } from '../types';

const SHEET_NAME = 'entrenadores';

export const entrenadoresService = {
  getAll: async (): Promise<Entrenador[]> => {
    return apiClient.getAll<Entrenador>(SHEET_NAME);
  },

  create: async (entrenador: Omit<Entrenador, 'id'> & { id?: string }): Promise<Entrenador> => {
    return apiClient.create<Entrenador>(SHEET_NAME, entrenador);
  },

  update: async (entrenador: Entrenador): Promise<Entrenador> => {
    return apiClient.update<Entrenador>(SHEET_NAME, entrenador);
  },

  delete: async (id: string): Promise<boolean> => {
    return apiClient.delete<Entrenador>(SHEET_NAME, id);
  }
};
