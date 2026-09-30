import { apiClient } from './apiClient';
import { RespuestaSesion } from '../types';

const SHEET_NAME = 'sesion_respuestas';

export const sesionRespuestasService = {
  getAll: async (): Promise<RespuestaSesion[]> => {
    return apiClient.getAll<RespuestaSesion>(SHEET_NAME);
  },

  create: async (r: Omit<RespuestaSesion, 'id'> & { id?: string }): Promise<RespuestaSesion> => {
    return apiClient.create<RespuestaSesion>(SHEET_NAME, r);
  },

  update: async (r: RespuestaSesion): Promise<RespuestaSesion> => {
    return apiClient.update<RespuestaSesion>(SHEET_NAME, r);
  },

  delete: async (id: string): Promise<boolean> => {
    return apiClient.delete<RespuestaSesion>(SHEET_NAME, id);
  }
};
