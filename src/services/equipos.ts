import { apiClient } from './apiClient';
import { Equipo } from '../types';

const SHEET_NAME = 'equipos';

export const equiposService = {
  getAll: async (): Promise<Equipo[]> => {
    return apiClient.getAll<Equipo>(SHEET_NAME);
  },

  create: async (equipo: Omit<Equipo, 'id'> & { id?: string }): Promise<Equipo> => {
    return apiClient.create<Equipo>(SHEET_NAME, equipo);
  },

  update: async (equipo: Equipo): Promise<Equipo> => {
    return apiClient.update<Equipo>(SHEET_NAME, equipo);
  },

  delete: async (id: string): Promise<boolean> => {
    return apiClient.delete<Equipo>(SHEET_NAME, id);
  }
};
