import { apiClient } from './apiClient';
import { ClubConfig } from '../types';

const SHEET = 'club_config';

export type ClubConfigRecord = ClubConfig & { id: string };

/**
 * Identidad del club (nombre, escudo, lema...) sincronizada en Supabase
 * para que aparezca igual en móvil y PC. Fila única con id 'singleton'.
 */
export const clubConfigService = {
  get: async (): Promise<ClubConfigRecord | null> => {
    try {
      const rows = await apiClient.getAll<ClubConfigRecord>(SHEET);
      return rows.find(r => r.id === 'singleton') || rows[0] || null;
    } catch {
      return null;
    }
  },

  save: async (config: ClubConfig): Promise<void> => {
    await apiClient.update<ClubConfigRecord>(SHEET, { ...config, id: 'singleton' });
  }
};
