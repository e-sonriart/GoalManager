import { apiClient } from './apiClient';
import { getSupabase } from './supabaseClient';
import { FraseMotivadora } from '../types';

const SHEET_NAME = 'frases_motivadoras_365';

const mismoEquipo = (a?: string, b?: string): boolean =>
  (a || '').trim().toLowerCase() === (b || '').trim().toLowerCase();

/**
 * Frases motivadoras por equipo (una activa por equipo, con título "FRASE DEL DIA").
 * La tabla usa id bigint autoincremental, así que las escrituras van directas a
 * Supabase (insert sin id) y la caché local se refresca con getAll().
 */
export const frasesService = {
  getAll: async (): Promise<FraseMotivadora[]> => apiClient.getAll<FraseMotivadora>(SHEET_NAME),

  /** Activa (o renueva) la frase del equipo: solo existe una fila por equipo. */
  activar: async (
    equipo: string,
    frase: string,
    creadaPor: string,
    categoria = ''
  ): Promise<FraseMotivadora> => {
    const supabase = getSupabase();
    if (!supabase) throw new Error('Supabase no configurado');

    const ahora = new Date().toISOString();
    const existente = (await frasesService.getAll()).find(f => mismoEquipo(f.equipo, equipo));

    if (existente) {
      const { data, error } = await supabase
        .from(SHEET_NAME)
        .update({ frase, equipo, categoria, creadaEn: ahora, creadaPor })
        .eq('id', String(existente.id))
        .select()
        .single();
      if (error) throw new Error(error.message);
      return (data || { ...existente, frase, equipo, categoria, creadaEn: ahora, creadaPor }) as FraseMotivadora;
    }

    const { data, error } = await supabase
      .from(SHEET_NAME)
      .insert({ frase, equipo, categoria, creadaEn: ahora, creadaPor })
      .select()
      .single();
    if (error) throw new Error(error.message);
    return data as FraseMotivadora;
  },

  /** Elimina la frase activa: la tarjeta deja de mostrarse al equipo. */
  quitar: async (id: string): Promise<void> => {
    const supabase = getSupabase();
    if (!supabase) throw new Error('Supabase no configurado');
    const { error } = await supabase.from(SHEET_NAME).delete().eq('id', String(id));
    if (error) throw new Error(error.message);
  }
};
