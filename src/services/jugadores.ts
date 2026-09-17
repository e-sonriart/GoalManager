import { apiClient } from './apiClient';
import { Jugador } from '../types';

const SHEET_NAME = 'jugadores';

export const jugadoresService = {
  getAll: async (): Promise<Jugador[]> => {
    return apiClient.getAll<Jugador>(SHEET_NAME);
  },

  create: async (jugador: Omit<Jugador, 'id'> & { id?: string }): Promise<Jugador> => {
    return apiClient.create<Jugador>(SHEET_NAME, jugador);
  },

  update: async (jugador: Jugador): Promise<Jugador> => {
    return apiClient.update<Jugador>(SHEET_NAME, jugador);
  },

  delete: async (id: string): Promise<boolean> => {
    return apiClient.delete<Jugador>(SHEET_NAME, id);
  }
};
