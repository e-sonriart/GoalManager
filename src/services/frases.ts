import { apiClient } from './apiClient';
import { getSupabase } from './supabaseClient';
import { FraseMotivadora } from '../types';

const SHEET_NAME = 'frases_motivadoras_365';

const mismoEquipo = (a?: string, b?: string): boolean =>
  (a || '').trim().toLowerCase() === (b || '').trim().toLowerCase();

/**
 * Frases motivadoras por equipo (con título "FRASE DEL DIA").
 * La tabla usa id bigint autoincremental, así que las escrituras van directas a
 * Supabase (insert sin id) y la caché local se refresca con getAll().
 * Las filas con fija=false son el banco: la tarjeta elige una al azar cada día.
 */
export const frasesService = {
  getAll: async (): Promise<FraseMotivadora[]> => apiClient.getAll<FraseMotivadora>(SHEET_NAME),

  /** Fija (o renueva) la frase de un equipo: solo toca filas fijadas, nunca el banco diario. */
  activar: async (
    equipo: string,
    frase: string,
    creadaPor: string,
    categoria = ''
  ): Promise<FraseMotivadora> => {
    const supabase = getSupabase();
    if (!supabase) throw new Error('Supabase no configurado');

    const ahora = new Date().toISOString();
    const existente = (await frasesService.getAll()).find(
      f => mismoEquipo(f.equipo, equipo) && f.fija
    );

    if (existente) {
      const { data, error } = await supabase
        .from(SHEET_NAME)
        .update({ frase, equipo, categoria, creadaEn: ahora, creadaPor, fija: true })
        .eq('id', String(existente.id))
        .select()
        .single();
      if (error) throw new Error(error.message);
      return (data || { ...existente, frase, equipo, categoria, creadaEn: ahora, creadaPor, fija: true }) as FraseMotivadora;
    }

    const { data, error } = await supabase
      .from(SHEET_NAME)
      .insert({ frase, equipo, categoria, creadaEn: ahora, creadaPor, fija: true })
      .select()
      .single();
    if (error) throw new Error(error.message);
    return data as FraseMotivadora;
  },

  /** Quita la frase fijada de un equipo: la tarjeta vuelve al banco diario. */
  quitar: async (id: string): Promise<void> => {
    const supabase = getSupabase();
    if (!supabase) throw new Error('Supabase no configurado');
    const { error } = await supabase.from(SHEET_NAME).delete().eq('id', String(id));
    if (error) throw new Error(error.message);
  }
};
