import { apiClient } from './apiClient';
import { Categoria } from '../types';

const SHEET_NAME = 'categorias';

export const categoriasService = {
  getAll: async (): Promise<Categoria[]> => {
    return apiClient.getAll<Categoria>(SHEET_NAME);
  },

  create: async (categoria: Omit<Categoria, 'id'> & { id?: string }): Promise<Categoria> => {
    return apiClient.create<Categoria>(SHEET_NAME, categoria);
  },

  update: async (categoria: Categoria): Promise<Categoria> => {
    return apiClient.update<Categoria>(SHEET_NAME, categoria);
  },

  delete: async (id: string): Promise<boolean> => {
    return apiClient.delete<Categoria>(SHEET_NAME, id);
  }
};
