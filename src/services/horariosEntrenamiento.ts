import { apiClient } from './apiClient';
import { HorarioEntrenamiento, HorarioEntrenamientoDia } from '../types';

const SHEET_NAME = 'horarios_entrenamiento';

const ordenarPorDia = (a: number, b: number): number =>
  (a === 0 ? 7 : a) - (b === 0 ? 7 : b);

/**
 * Deja siempre un horario por día en `diasHorario`.
 * Los registros antiguos (solo `dias` + `hora`) se migran al vuelo.
 */
const normalizarHorario = (row: HorarioEntrenamiento): HorarioEntrenamiento => {
  const dias = Array.isArray(row.dias) ? row.dias.map(Number).filter(n => n >= 0 && n <= 6) : [];
  const bruto = Array.isArray(row.diasHorario) ? row.diasHorario : [];
  const porDia: HorarioEntrenamientoDia[] = bruto
    .map(d => ({
      dia: Number(d?.dia),
      hora: String(d?.hora || row.hora || ''),
      horaFin: d?.horaFin ? String(d.horaFin) : undefined
    }))
    .filter(d => d.dia >= 0 && d.dia <= 6 && /^\d{2}:\d{2}$/.test(d.hora));

  if (porDia.length === 0) {
    dias.forEach(dia => {
      if (/^\d{2}:\d{2}$/.test(row.hora || '')) {
        porDia.push({ dia, hora: row.hora, horaFin: row.horaFin || undefined });
      }
    });
  }

  const diasHorario = porDia
    .filter((d, i) => porDia.findIndex(x => x.dia === d.dia) === i)
    .sort((a, b) => ordenarPorDia(a.dia, b.dia));

  return {
    ...row,
    dias: diasHorario.map(d => d.dia),
    diasHorario,
    hora: diasHorario[0]?.hora || row.hora || '',
    horaFin: diasHorario[0]?.horaFin
  };
};

/**
 * Horarios habituales por equipo (días de la semana + hora).
 * Cada día puede tener su propia hora (por ejemplo, martes 18:00 y jueves 17:30).
 * Si la tabla aún no existe en Supabase, apiClient usa el almacenamiento local
 * del dispositivo, así la función sigue siendo utilizable.
 */
export const horariosEntrenamientoService = {
  getAll: async (): Promise<HorarioEntrenamiento[]> => {
    const rows = await apiClient.getAll<HorarioEntrenamiento>(SHEET_NAME);
    return rows.map(normalizarHorario);
  },

  create: async (horario: Omit<HorarioEntrenamiento, 'id'> & { id?: string }): Promise<HorarioEntrenamiento> =>
    normalizarHorario(await apiClient.create<HorarioEntrenamiento>(SHEET_NAME, horario)),

  update: async (horario: HorarioEntrenamiento): Promise<HorarioEntrenamiento> =>
    normalizarHorario(await apiClient.update<HorarioEntrenamiento>(SHEET_NAME, horario)),

  delete: async (id: string): Promise<boolean> => apiClient.delete(SHEET_NAME, id)
};
