import { apiClient } from './apiClient';
import { VestuarioItem, VestuarioTipo } from '../types';

const SHEET_ITEMS = 'vestuario';
const SHEET_TIPOS = 'vestuario_tipos';

export const vestuarioService = {
  getAll: async (): Promise<VestuarioItem[]> => {
    return apiClient.getAll<VestuarioItem>(SHEET_ITEMS);
  },

  create: async (item: Omit<VestuarioItem, 'id'> & { id?: string }): Promise<VestuarioItem> => {
    return apiClient.create<VestuarioItem>(SHEET_ITEMS, item);
  },

  update: async (item: VestuarioItem): Promise<VestuarioItem> => {
    return apiClient.update<VestuarioItem>(SHEET_ITEMS, item);
  },

  delete: async (id: string): Promise<boolean> => {
    return apiClient.delete<VestuarioItem>(SHEET_ITEMS, id);
  }
};

export const vestuarioTiposService = {
  getAll: async (): Promise<VestuarioTipo[]> => {
    return apiClient.getAll<VestuarioTipo>(SHEET_TIPOS);
  },

  create: async (tipo: Omit<VestuarioTipo, 'id'> & { id?: string }): Promise<VestuarioTipo> => {
    return apiClient.create<VestuarioTipo>(SHEET_TIPOS, tipo);
  },

  update: async (tipo: VestuarioTipo): Promise<VestuarioTipo> => {
    return apiClient.update<VestuarioTipo>(SHEET_TIPOS, tipo);
  },

  delete: async (id: string): Promise<boolean> => {
    return apiClient.delete<VestuarioTipo>(SHEET_TIPOS, id);
  }
};
