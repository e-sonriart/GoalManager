import { apiClient } from './apiClient';
import { Usuario } from '../types';

const SHEET_NAME = 'usuarios';

export const usuariosService = {
  getAll: async (): Promise<Usuario[]> => {
    return apiClient.getAll<Usuario>(SHEET_NAME);
  },

  create: async (usuario: Omit<Usuario, 'id'> & { id?: string }): Promise<Usuario> => {
    return apiClient.create<Usuario>(SHEET_NAME, usuario);
  },

  update: async (usuario: Usuario): Promise<Usuario> => {
    return apiClient.update<Usuario>(SHEET_NAME, usuario);
  },

  delete: async (id: string): Promise<boolean> => {
    return apiClient.delete<Usuario>(SHEET_NAME, id);
  }
};
