import { apiClient } from './apiClient';
import { RespuestaPartido } from '../types';

const SHEET_NAME = 'partido_respuestas';

export const partidoRespuestasService = {
  getAll: async (): Promise<RespuestaPartido[]> => {
    return apiClient.getAll<RespuestaPartido>(SHEET_NAME);
  },

  create: async (r: Omit<RespuestaPartido, 'id'> & { id?: string }): Promise<RespuestaPartido> => {
    return apiClient.create<RespuestaPartido>(SHEET_NAME, r);
  },

  update: async (r: RespuestaPartido): Promise<RespuestaPartido> => {
    return apiClient.update<RespuestaPartido>(SHEET_NAME, r);
  },

  delete: async (id: string): Promise<boolean> => {
    return apiClient.delete<RespuestaPartido>(SHEET_NAME, id);
  }
};
